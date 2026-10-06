package ai

import (
	"context"
	"errors"
	"fmt"
	"iter"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"google.golang.org/genai"
)

const DefaultModel = "gemini-3.5-flash"

// 3.8 is last because the free quota on it runs out fast
var DefaultFallbacks = []string{"gemini-3.5-flash-lite", "gemini-3.8-flash"}

var ErrNotConfigured = errors.New("GEMINI_API_KEY is not set")

const busyCooldown = time.Minute

// how long a model gets to start answering before i give up on it, busy models can take ages just to say they're busy
const (
	firstChunkWait    = 8 * time.Second
	firstChunkWaitBig = 20 * time.Second // long transcripts and files take longer to read
)

var errSlowStart = errors.New("no answer in time")

type Message struct {
	Role    string `json:"role"` // "user" or "assistant"
	Content string `json:"content"`
}

type Attachment struct {
	Data     []byte
	MimeType string
}

type ChatRequest struct {
	System     string
	Messages   []Message
	Attachment *Attachment // goes with the last user message
	JSON       bool
}

type ChatResponse struct {
	Text  string
	Model string
}

// Text gets the answer piece by piece. if a model dies halfway and the next one takes over, Reset is called first so the client can clear what it showed
type Sink struct {
	Text  func(string) error
	Reset func() error
}

type Config struct {
	APIKey    string
	Model     string
	Fallbacks []string
	Thinking  string // minimal, low, medium or high
}

type streamFunc func(ctx context.Context, model string, contents []*genai.Content, config *genai.GenerateContentConfig) iter.Seq2[*genai.GenerateContentResponse, error]

type Gemini struct {
	models   []string
	thinking genai.ThinkingLevel
	stream   streamFunc

	mu       sync.Mutex
	busyTill map[string]time.Time

	slowStart time.Duration // only set by tests
}

func NewGemini(ctx context.Context, cfg Config) (*Gemini, error) {
	if cfg.Model == "" {
		cfg.Model = DefaultModel
	}
	if cfg.Thinking == "" {
		cfg.Thinking = "minimal" // thinking made answers take 40s+, minimal starts in about a second
	}
	g := &Gemini{
		models:   append([]string{cfg.Model}, cfg.Fallbacks...),
		thinking: genai.ThinkingLevel(strings.ToUpper(cfg.Thinking)),
		busyTill: map[string]time.Time{},
	}
	if cfg.APIKey == "" {
		return g, nil
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: cfg.APIKey, Backend: genai.BackendGeminiAPI})
	if err != nil {
		return nil, fmt.Errorf("gemini client: %w", err)
	}
	g.stream = client.Models.GenerateContentStream
	return g, nil
}

func (g *Gemini) Ready() bool { return g.stream != nil }

func (g *Gemini) Model() string { return g.models[0] }

func (g *Gemini) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	return g.Stream(ctx, req, nil)
}

func (g *Gemini) Stream(ctx context.Context, req ChatRequest, sink *Sink) (*ChatResponse, error) {
	if !g.Ready() {
		return nil, ErrNotConfigured
	}
	if len(req.Messages) == 0 {
		return nil, errors.New("no messages")
	}
	contents := buildContents(req)
	wait := g.firstChunkWait(req)

	var lastErr error
	models := g.candidates()
	for i, model := range models {
		text, started, err := g.streamFrom(ctx, model, contents, g.config(req, model), sink, wait)
		if err == nil && strings.TrimSpace(text) == "" {
			err = errors.New("empty response")
		}
		if err == nil {
			return &ChatResponse{Text: strings.TrimSpace(text), Model: model}, nil
		}
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		if !shouldFallBack(err) || (started && i == len(models)-1) {
			return nil, fmt.Errorf("%s: %w", model, err)
		}
		if IsBusy(err) || errors.Is(err, errSlowStart) {
			g.markBusy(model)
		}
		if started && sink.Reset != nil {
			if err := sink.Reset(); err != nil {
				return nil, err
			}
		}
		log.Printf("[gemini] %s failed, trying the next model: %v", model, err)
		lastErr = fmt.Errorf("%s: %w", model, err)
	}
	return nil, lastErr
}

func (g *Gemini) firstChunkWait(req ChatRequest) time.Duration {
	if g.slowStart > 0 {
		return g.slowStart
	}
	size := 0
	for _, m := range req.Messages {
		size += len(m.Content)
	}
	if req.Attachment != nil || size > 60000 {
		return firstChunkWaitBig
	}
	return firstChunkWait
}

func (g *Gemini) streamFrom(ctx context.Context, model string, contents []*genai.Content, config *genai.GenerateContentConfig, sink *Sink, wait time.Duration) (string, bool, error) {
	streamCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	var gotFirst atomic.Bool
	timer := time.AfterFunc(wait, func() {
		if !gotFirst.Load() {
			cancel()
		}
	})
	defer timer.Stop()
	slow := func(err error) error {
		if !gotFirst.Load() && streamCtx.Err() != nil && ctx.Err() == nil {
			return errSlowStart
		}
		return err
	}

	var sb strings.Builder
	started := false
	for resp, err := range g.stream(streamCtx, model, contents, config) {
		if err != nil {
			return sb.String(), started, slow(err)
		}
		if resp.PromptFeedback != nil && resp.PromptFeedback.BlockReason != "" {
			return sb.String(), started, blockedError{string(resp.PromptFeedback.BlockReason)}
		}
		chunk := resp.Text()
		if chunk == "" {
			continue
		}
		gotFirst.Store(true)
		sb.WriteString(chunk)
		if sink != nil && sink.Text != nil {
			started = true
			if err := sink.Text(chunk); err != nil {
				return sb.String(), started, err
			}
		}
	}
	return sb.String(), started, slow(nil)
}

func buildContents(req ChatRequest) []*genai.Content {
	contents := make([]*genai.Content, 0, len(req.Messages))
	for i, msg := range req.Messages {
		role := genai.Role(genai.RoleUser)
		if msg.Role == "assistant" {
			role = genai.RoleModel
		}
		var parts []*genai.Part
		if i == len(req.Messages)-1 && req.Attachment != nil {
			parts = append(parts, genai.NewPartFromBytes(req.Attachment.Data, req.Attachment.MimeType))
		}
		parts = append(parts, genai.NewPartFromText(msg.Content))
		contents = append(contents, genai.NewContentFromParts(parts, role))
	}
	return contents
}

func (g *Gemini) config(req ChatRequest, model string) *genai.GenerateContentConfig {
	config := &genai.GenerateContentConfig{}
	if req.System != "" {
		config.SystemInstruction = genai.NewContentFromText(req.System, genai.RoleUser)
	}
	if req.JSON {
		config.ResponseMIMEType = "application/json"
	}
	if strings.HasPrefix(model, "gemini-3") {
		config.ThinkingConfig = &genai.ThinkingConfig{ThinkingLevel: g.thinking}
	}
	return config
}

// a model that just said it's busy goes to the back of the line for a minute, instead of making every request wait on it
func (g *Gemini) candidates() []string {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := time.Now()
	var ready, busy []string
	for _, m := range g.models {
		if now.Before(g.busyTill[m]) {
			busy = append(busy, m)
		} else {
			ready = append(ready, m)
		}
	}
	return append(ready, busy...)
}

func (g *Gemini) markBusy(model string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.busyTill[model] = time.Now().Add(busyCooldown)
}

type blockedError struct{ reason string }

func (e blockedError) Error() string { return "prompt blocked: " + e.reason }

// overloaded, rate limited, or the model got retired
func shouldFallBack(err error) bool {
	if errors.As(err, new(blockedError)) {
		return false
	}
	var apiErr genai.APIError
	if !errors.As(err, &apiErr) {
		return true
	}
	return apiErr.Code == 404 || apiErr.Code == 408 || apiErr.Code == 429 || apiErr.Code >= 500
}

// IsBusy is true when google is overloaded or we've hit the quota
func IsBusy(err error) bool {
	var apiErr genai.APIError
	return errors.As(err, &apiErr) && (apiErr.Code == 429 || apiErr.Code == 503)
}
