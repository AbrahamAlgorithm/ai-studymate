package ai

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	openai "github.com/sashabaranov/go-openai"
)

// DefaultOpenAIModel is used when OPENAI_MODEL is not set.
const DefaultOpenAIModel = "gpt-4o-mini"

// OpenAIProvider wraps the OpenAI client.
type OpenAIProvider struct {
	client *openai.Client
	model  string
}

// NewOpenAI creates an OpenAIProvider. With an empty apiKey it returns an
// unavailable provider so the router can skip it.
func NewOpenAI(apiKey, model string) *OpenAIProvider {
	if model == "" {
		model = DefaultOpenAIModel
	}
	if apiKey == "" {
		return &OpenAIProvider{model: model}
	}
	return &OpenAIProvider{client: openai.NewClient(apiKey), model: model}
}

func (o *OpenAIProvider) Name() string      { return "openai" }
func (o *OpenAIProvider) IsAvailable() bool { return o.client != nil }

func (o *OpenAIProvider) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
	if len(req.Messages) == 0 {
		return nil, fmt.Errorf("openai: no messages")
	}
	// Chat Completions accepts images inline, but not PDFs.
	if req.Attachment != nil && !strings.HasPrefix(req.Attachment.MimeType, "image/") {
		return nil, fmt.Errorf("openai: %w: %s attachments", ErrUnsupported, req.Attachment.MimeType)
	}

	msgs := make([]openai.ChatCompletionMessage, 0, len(req.Messages)+1)
	if req.System != "" {
		msgs = append(msgs, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: req.System,
		})
	}

	for i, m := range req.Messages {
		role := openai.ChatMessageRoleUser
		if m.Role == "assistant" {
			role = openai.ChatMessageRoleAssistant
		}
		msg := openai.ChatCompletionMessage{Role: role, Content: m.Content}

		if i == len(req.Messages)-1 && req.Attachment != nil {
			dataURL := fmt.Sprintf("data:%s;base64,%s",
				req.Attachment.MimeType, base64.StdEncoding.EncodeToString(req.Attachment.Data))
			msg.Content = ""
			msg.MultiContent = []openai.ChatMessagePart{
				{
					Type:     openai.ChatMessagePartTypeImageURL,
					ImageURL: &openai.ChatMessageImageURL{URL: dataURL, Detail: openai.ImageURLDetailAuto},
				},
				{Type: openai.ChatMessagePartTypeText, Text: m.Content},
			}
		}
		msgs = append(msgs, msg)
	}

	creq := openai.ChatCompletionRequest{Model: o.model, Messages: msgs}
	if req.JSON {
		creq.ResponseFormat = &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		}
	}

	resp, err := o.client.CreateChatCompletion(ctx, creq)
	if err != nil {
		return nil, fmt.Errorf("openai chat (%s): %w", o.model, err)
	}
	if len(resp.Choices) == 0 || strings.TrimSpace(resp.Choices[0].Message.Content) == "" {
		return nil, fmt.Errorf("openai: empty response")
	}

	return &ChatResponse{
		Text:     strings.TrimSpace(resp.Choices[0].Message.Content),
		Provider: o.Name(),
	}, nil
}
