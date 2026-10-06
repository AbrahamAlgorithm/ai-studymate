package ai

import (
	"context"
	"errors"
)

// ErrUnsupported is returned by a provider that cannot handle a request
// (e.g. an attachment type it does not accept), so the router tries the next one.
var ErrUnsupported = errors.New("request not supported by this provider")

// Message is a single turn in a conversation.
type Message struct {
	Role    string `json:"role"` // "user" | "assistant"
	Content string `json:"content"`
}

// Attachment is a binary file (image or PDF) sent alongside the last user message.
type Attachment struct {
	Data     []byte
	MimeType string // e.g. "image/jpeg", "application/pdf"
}

// ChatRequest is the input to any AI call.
type ChatRequest struct {
	System     string      // optional system instruction
	Messages   []Message   // conversation, oldest first; the last one is the new user turn
	Attachment *Attachment // optional file attached to the last user message
	JSON       bool        // ask the model to respond with a JSON object only
}

// ChatResponse is the output of any AI call.
type ChatResponse struct {
	Text     string
	Provider string // "gemini" | "openai"
}

// Provider is the common interface implemented by every AI backend.
type Provider interface {
	Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error)
	Name() string
	IsAvailable() bool
}
