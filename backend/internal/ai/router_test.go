package ai

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
)

type stubProvider struct {
	name      string
	available bool
	err       error
	calls     int
}

func (s *stubProvider) Name() string      { return s.name }
func (s *stubProvider) IsAvailable() bool { return s.available }
func (s *stubProvider) Chat(context.Context, ChatRequest) (*ChatResponse, error) {
	s.calls++
	if s.err != nil {
		return nil, s.err
	}
	return &ChatResponse{Text: "hi from " + s.name, Provider: s.name}, nil
}

func TestRouterFallsBackToNextProvider(t *testing.T) {
	first := &stubProvider{name: "gemini", available: true, err: errors.New("quota exceeded")}
	second := &stubProvider{name: "openai", available: true}
	r := NewRouter(first, second)

	resp, err := r.Chat(context.Background(), ChatRequest{Messages: []Message{{Role: "user", Content: "x"}}})
	if err != nil || resp.Provider != "openai" {
		t.Fatalf("got %+v, %v", resp, err)
	}
	if first.calls != 1 || second.calls != 1 {
		t.Errorf("calls = %d, %d", first.calls, second.calls)
	}
}

func TestRouterSkipsUnavailableAndReportsNoProvider(t *testing.T) {
	r := NewRouter(&stubProvider{name: "gemini"}, &stubProvider{name: "openai"})
	if _, err := r.Chat(context.Background(), ChatRequest{}); !errors.Is(err, ErrNoProvider) {
		t.Fatalf("err = %v, want ErrNoProvider", err)
	}
	if r.ActiveProvider() != "none" {
		t.Errorf("ActiveProvider = %q", r.ActiveProvider())
	}
}

func TestOpenAIRejectsPDFAttachments(t *testing.T) {
	o := NewOpenAI("sk-test", "")
	_, err := o.Chat(context.Background(), ChatRequest{
		Messages:   []Message{{Role: "user", Content: "read this"}},
		Attachment: &Attachment{Data: []byte("%PDF-1.4"), MimeType: "application/pdf"},
	})
	if !errors.Is(err, ErrUnsupported) {
		t.Fatalf("err = %v, want ErrUnsupported", err)
	}
}

// TestGeminiLive makes a real API call. Run it with:
//
//	GEMINI_API_KEY=... go test ./internal/ai -run Live -v
func TestGeminiLive(t *testing.T) {
	key := os.Getenv("GEMINI_API_KEY")
	if key == "" {
		t.Skip("GEMINI_API_KEY not set")
	}
	g, err := NewGemini(context.Background(), key, os.Getenv("GEMINI_MODEL"))
	if err != nil {
		t.Fatal(err)
	}
	resp, err := g.Chat(context.Background(), ChatRequest{
		System:   "Answer with a single word.",
		Messages: []Message{{Role: "user", Content: "What is the chemical symbol for gold?"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(strings.ToLower(resp.Text), "au") {
		t.Errorf("unexpected answer: %q", resp.Text)
	}
}
