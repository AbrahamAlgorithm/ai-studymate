package ai

import (
	"context"
	"errors"
	"iter"
	"os"
	"strings"
	"testing"
	"time"

	"google.golang.org/genai"
)

func chunk(text string) *genai.GenerateContentResponse {
	return &genai.GenerateContentResponse{Candidates: []*genai.Candidate{{
		Content: genai.NewContentFromText(text, genai.RoleModel),
	}}}
}

// each model either fails straight away, or streams its chunks and then maybe fails
type fakeModel struct {
	chunks []string
	err    error
}

func fakeGemini(models []string, behaviour map[string]fakeModel) (*Gemini, *[]string) {
	var calls []string
	g := &Gemini{models: models, thinking: genai.ThinkingLevelMinimal, busyTill: map[string]time.Time{}, quotaTill: map[string]time.Time{}}
	g.stream = func(_ context.Context, model string, _ []*genai.Content, _ *genai.GenerateContentConfig) iter.Seq2[*genai.GenerateContentResponse, error] {
		calls = append(calls, model)
		b, ok := behaviour[model]
		if !ok {
			b = fakeModel{chunks: []string{"answer ", "from " + model}}
		}
		return func(yield func(*genai.GenerateContentResponse, error) bool) {
			for _, c := range b.chunks {
				if !yield(chunk(c), nil) {
					return
				}
			}
			if b.err != nil {
				yield(nil, b.err)
			}
		}
	}
	return g, &calls
}

var (
	hi   = ChatRequest{Messages: []Message{{Role: "user", Content: "hi"}}}
	busy = genai.APIError{Code: 503, Status: "UNAVAILABLE"}
)

func TestFallsBackWhenModelIsBusyOrRetired(t *testing.T) {
	g, calls := fakeGemini([]string{"a", "b", "c"}, map[string]fakeModel{
		"a": {err: busy},
		"b": {err: genai.APIError{Code: 404, Status: "NOT_FOUND"}},
	})
	resp, err := g.Chat(context.Background(), hi)
	if err != nil || resp.Model != "c" || resp.Text != "answer from c" {
		t.Fatalf("got %+v, %v", resp, err)
	}
	if strings.Join(*calls, ",") != "a,b,c" {
		t.Errorf("calls = %v", *calls)
	}
}

func TestStreamSendsChunksInOrder(t *testing.T) {
	g, _ := fakeGemini([]string{"a"}, map[string]fakeModel{"a": {chunks: []string{"New", "ton's ", "law"}}})
	var got []string
	resp, err := g.Stream(context.Background(), hi, &Sink{Text: func(s string) error { got = append(got, s); return nil }})
	if err != nil || resp.Text != "Newton's law" || strings.Join(got, "|") != "New|ton's |law" {
		t.Fatalf("resp = %+v, err = %v, chunks = %q", resp, err, got)
	}
}

func TestModelDyingHalfwayResetsAndMovesOn(t *testing.T) {
	g, calls := fakeGemini([]string{"a", "b"}, map[string]fakeModel{"a": {chunks: []string{"half an "}, err: busy}})
	var events []string
	resp, err := g.Stream(context.Background(), hi, &Sink{
		Text:  func(s string) error { events = append(events, s); return nil },
		Reset: func() error { events = append(events, "<reset>"); return nil },
	})
	if err != nil || resp.Model != "b" || strings.Join(*calls, ",") != "a,b" {
		t.Fatalf("resp = %+v, err = %v, calls = %v", resp, err, *calls)
	}
	if got := strings.Join(events, "|"); got != "half an |<reset>|answer |from b" {
		t.Errorf("events = %s", got)
	}
}

func TestLastModelDyingHalfwayIsAnError(t *testing.T) {
	g, _ := fakeGemini([]string{"a"}, map[string]fakeModel{"a": {chunks: []string{"half an "}, err: busy}})
	if _, err := g.Stream(context.Background(), hi, &Sink{Text: func(string) error { return nil }}); err == nil {
		t.Fatal("expected an error when there's no model left")
	}
}

func TestSlowStartMovesToTheNextModel(t *testing.T) {
	g, calls := fakeGemini([]string{"slow", "b"}, nil)
	g.slowStart = 50 * time.Millisecond
	inner := g.stream
	g.stream = func(ctx context.Context, model string, c []*genai.Content, cfg *genai.GenerateContentConfig) iter.Seq2[*genai.GenerateContentResponse, error] {
		if model != "slow" {
			return inner(ctx, model, c, cfg)
		}
		*calls = append(*calls, model)
		return func(yield func(*genai.GenerateContentResponse, error) bool) {
			<-ctx.Done() // never answers, like a model stuck in a queue
			yield(nil, ctx.Err())
		}
	}
	start := time.Now()
	resp, err := g.Chat(context.Background(), hi)
	if err != nil || resp.Model != "b" {
		t.Fatalf("resp = %+v, err = %v", resp, err)
	}
	if time.Since(start) > time.Second {
		t.Errorf("took %s, the slow model should have been dropped after 50ms", time.Since(start))
	}
	if c, _ := g.candidates(); c[0] != "b" {
		t.Errorf("slow model should be cooling down, candidates = %v", c)
	}
}

func TestBusyModelGoesToTheBackForAWhile(t *testing.T) {
	g, calls := fakeGemini([]string{"a", "b"}, map[string]fakeModel{"a": {err: busy}})
	if _, err := g.Chat(context.Background(), hi); err != nil {
		t.Fatal(err)
	}
	*calls = nil
	resp, err := g.Chat(context.Background(), hi)
	if err != nil || resp.Model != "b" || (*calls)[0] != "b" {
		t.Fatalf("second request should go straight to b, calls = %v, resp = %+v, err = %v", *calls, resp, err)
	}

	g.busyTill["a"] = time.Now().Add(-time.Second)
	if c, _ := g.candidates(); c[0] != "a" {
		t.Errorf("a should be first again after the cooldown, got %v", c)
	}
}

func TestDoesNotFallBackOnBadRequest(t *testing.T) {
	g, calls := fakeGemini([]string{"a", "b"}, map[string]fakeModel{"a": {err: genai.APIError{Code: 400, Status: "INVALID_ARGUMENT"}}})
	if _, err := g.Chat(context.Background(), hi); err == nil {
		t.Fatal("expected an error")
	}
	if len(*calls) != 1 {
		t.Errorf("should stop after a 400, calls = %v", *calls)
	}
}

func TestBusyWhenEveryModelIsOverloaded(t *testing.T) {
	g, _ := fakeGemini([]string{"a", "b"}, map[string]fakeModel{"a": {err: busy}, "b": {err: busy}})
	if _, err := g.Chat(context.Background(), hi); !IsBusy(err) {
		t.Fatalf("IsBusy(%v) = false", err)
	}
}

func TestThinkingOnlyForGemini3(t *testing.T) {
	g := &Gemini{thinking: genai.ThinkingLevelMinimal}
	if c := g.config(hi, "gemini-3.5-flash"); c.ThinkingConfig == nil || c.ThinkingConfig.ThinkingLevel != genai.ThinkingLevelMinimal {
		t.Errorf("gemini-3 should get a thinking level: %+v", c.ThinkingConfig)
	}
	if c := g.config(hi, "gemma-4-31b-it"); c.ThinkingConfig != nil {
		t.Error("other models shouldn't get a thinking level")
	}
}

func TestNotConfigured(t *testing.T) {
	g, err := NewGemini(context.Background(), Config{})
	if err != nil {
		t.Fatal(err)
	}
	if g.Ready() || g.Model() != DefaultModel {
		t.Errorf("Ready = %v, Model = %q", g.Ready(), g.Model())
	}
	if _, err := g.Chat(context.Background(), hi); !errors.Is(err, ErrNotConfigured) {
		t.Errorf("err = %v", err)
	}
}

func TestVideoGoesWithTheLastMessage(t *testing.T) {
	req := ChatRequest{
		Messages: []Message{{Role: "user", Content: "what happens at 12:30?"}},
		Video:    &Video{URL: "https://www.youtube.com/watch?v=SE2KF-vxvS0", Start: 660 * time.Second, End: 840 * time.Second},
	}
	parts := buildContents(req)[0].Parts
	if len(parts) != 2 || parts[0].FileData == nil || parts[0].FileData.FileURI != req.Video.URL {
		t.Fatalf("expected the video part first, got %+v", parts)
	}
	if vm := parts[0].VideoMetadata; vm == nil || vm.StartOffset != 660*time.Second || vm.EndOffset != 840*time.Second || vm.FPS != nil {
		t.Errorf("clip offsets not set right: %+v", vm)
	}
	g := &Gemini{thinking: genai.ThinkingLevelMinimal}
	if c := g.config(req, "gemini-3.5-flash"); c.MediaResolution != genai.MediaResolutionLow {
		t.Errorf("videos should use low media resolution, got %q", c.MediaResolution)
	}
	if w := g.firstChunkWait(req); w != firstChunkWaitVideo {
		t.Errorf("watching a video needs the longer wait, got %s", w)
	}
}

// hits the real API, run it with: go test ./internal/ai -run Live -v (needs GEMINI_API_KEY)
func TestGeminiLive(t *testing.T) {
	key := os.Getenv("GEMINI_API_KEY")
	if key == "" {
		t.Skip("GEMINI_API_KEY not set")
	}
	g, err := NewGemini(context.Background(), Config{APIKey: key, Model: os.Getenv("GEMINI_MODEL"), Fallbacks: DefaultFallbacks})
	if err != nil {
		t.Fatal(err)
	}

	start := time.Now()
	var first time.Duration
	resp, err := g.Stream(context.Background(), ChatRequest{
		System:   "Answer in one short sentence.",
		Messages: []Message{{Role: "user", Content: "What is the chemical symbol for gold?"}},
	}, &Sink{Text: func(string) error {
		if first == 0 {
			first = time.Since(start)
		}
		return nil
	}})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(strings.ToLower(resp.Text), "au") {
		t.Errorf("unexpected answer: %q", resp.Text)
	}
	t.Logf("%s streamed, first words after %s, done after %s: %q", resp.Model, first.Round(time.Millisecond), time.Since(start).Round(time.Millisecond), resp.Text)

	resp, err = g.Chat(context.Background(), ChatRequest{
		Messages: []Message{{Role: "user", Content: `Return {"planet": "<largest planet>"} as JSON.`}},
		JSON:     true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(resp.Text, `"planet"`) || !strings.Contains(strings.ToLower(resp.Text), "jupiter") {
		t.Errorf("unexpected JSON answer: %q", resp.Text)
	}
	t.Logf("json answered by %s: %s", resp.Model, resp.Text)
}

func outOfQuota(retry string) genai.APIError {
	return genai.APIError{Code: 429, Status: "RESOURCE_EXHAUSTED", Details: []map[string]any{
		{"@type": "type.googleapis.com/google.rpc.QuotaFailure"},
		{"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": retry},
	}}
}

func TestOutOfQuotaModelIsSkippedUntilItResets(t *testing.T) {
	g, calls := fakeGemini([]string{"a", "b"}, map[string]fakeModel{"a": {err: outOfQuota("7263s")}})
	if _, err := g.Chat(context.Background(), hi); err != nil {
		t.Fatal(err)
	}
	*calls = nil
	if _, err := g.Chat(context.Background(), hi); err != nil || strings.Join(*calls, ",") != "b" {
		t.Fatalf("a shouldn't even be tried while it's out of quota, calls = %v, err = %v", *calls, err)
	}
	if left := time.Until(g.quotaTill["a"]); left < 2*time.Hour {
		t.Errorf("should wait for google's retryDelay (~2h), waiting %s", left)
	}
}

func TestEveryModelOutOfQuotaFailsFast(t *testing.T) {
	g, calls := fakeGemini([]string{"a", "b"}, map[string]fakeModel{"a": {err: outOfQuota("3600s")}, "b": {err: outOfQuota("600s")}})
	if _, err := g.Chat(context.Background(), hi); err == nil {
		t.Fatal("expected an error")
	}
	*calls = nil
	_, err := g.Chat(context.Background(), hi)
	var qe QuotaError
	if !errors.As(err, &qe) || len(*calls) != 0 {
		t.Fatalf("should fail without calling anyone, err = %v, calls = %v", err, *calls)
	}
	if wait, ok := RetryAfter(err); !ok || wait > 10*time.Minute || wait < 9*time.Minute {
		t.Errorf("should report the soonest reset (~10m), got %s", wait)
	}
}
