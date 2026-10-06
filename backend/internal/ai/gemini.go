package ai

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"google.golang.org/genai"
)

// DefaultGeminiModel is used when GEMINI_MODEL is not set.
const DefaultGeminiModel = "gemini-2.5-flash"

// GeminiProvider wraps the Google Gen AI client.
type GeminiProvider struct {
	client *genai.Client
	model  string
}

// NewGemini creates a GeminiProvider. With an empty apiKey it returns an
// unavailable provider (not an error) so the router can skip it gracefully.
func NewGemini(ctx context.Context, apiKey, model string) (*GeminiProvider, error) {
	if model == "" {
		model = DefaultGeminiModel
	}
	if apiKey == "" {
		return &GeminiProvider{model: model}, nil
	}
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("gemini client: %w", err)
	}
	return &GeminiProvider{client: client, model: model}, nil
}

func (g *GeminiProvider) Name() string      { return "gemini" }
func (g *GeminiProvider) IsAvailable() bool { return g.client != nil }

func (g *GeminiProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if len(req.Messages) == 0 {
		return nil, errors.New("gemini: no messages")
	}

	contents := make([]*genai.Content, 0, len(req.Messages))
	for i, msg := range req.Messages {
		role := genai.Role(genai.RoleUser)
		if msg.Role == "assistant" {
			role = genai.RoleModel
		}
		parts := []*genai.Part{}
		// The attachment belongs to the final (new) user turn.
		if i == len(req.Messages)-1 && req.Attachment != nil {
			parts = append(parts, genai.NewPartFromBytes(req.Attachment.Data, req.Attachment.MimeType))
		}
		parts = append(parts, genai.NewPartFromText(msg.Content))
		contents = append(contents, genai.NewContentFromParts(parts, role))
	}

	config := &genai.GenerateContentConfig{}
	if req.System != "" {
		config.SystemInstruction = genai.NewContentFromText(req.System, genai.RoleUser)
	}
	if req.JSON {
		config.ResponseMIMEType = "application/json"
	}

	resp, err := g.client.Models.GenerateContent(ctx, g.model, contents, config)
	if err != nil {
		return nil, fmt.Errorf("gemini generate (%s): %w", g.model, err)
	}

	text := strings.TrimSpace(resp.Text())
	if text == "" {
		reason := "empty response"
		if resp.PromptFeedback != nil && resp.PromptFeedback.BlockReason != "" {
			reason = "blocked: " + string(resp.PromptFeedback.BlockReason)
		} else if len(resp.Candidates) > 0 && resp.Candidates[0].FinishReason != "" {
			reason = "finish reason: " + string(resp.Candidates[0].FinishReason)
		}
		return nil, fmt.Errorf("gemini: %s", reason)
	}

	return &ChatResponse{Text: text, Provider: g.Name()}, nil
}
