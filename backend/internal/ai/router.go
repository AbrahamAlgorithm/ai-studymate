package ai

import (
	"context"
	"errors"
	"log"
)

// ErrNoProvider means no AI provider is configured (no API keys set).
var ErrNoProvider = errors.New("no AI provider configured — set GEMINI_API_KEY or OPENAI_API_KEY")

// Router tries each available provider in order and returns the first success.
type Router struct {
	providers []Provider
}

// NewRouter builds a router with providers in preference order.
func NewRouter(providers ...Provider) *Router {
	return &Router{providers: providers}
}

func (r *Router) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	var lastErr error
	for _, p := range r.providers {
		if !p.IsAvailable() {
			continue
		}
		resp, err := p.Chat(ctx, req)
		if err == nil {
			return resp, nil
		}
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		log.Printf("[ai-router] %s error: %v — trying next provider", p.Name(), err)
		lastErr = err
	}
	if lastErr == nil {
		return nil, ErrNoProvider
	}
	return nil, lastErr
}

// ActiveProvider returns the name of the first available provider (for diagnostics).
func (r *Router) ActiveProvider() string {
	for _, p := range r.providers {
		if p.IsAvailable() {
			return p.Name()
		}
	}
	return "none"
}
