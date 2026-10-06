package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"studymate/backend/internal/ai"
)

const (
	maxJSONBodyBytes  = 4 << 20 // big enough for a youtube transcript coming back
	maxHistoryTurns   = 20
	maxMessageChars   = 20000
	maxQuestionChars  = 4000
	defaultQuizCount  = 10
	maxQuizCount      = 20
	maxTranscriptChar = 200000
)

type Chatter interface {
	Chat(ctx context.Context, req ai.ChatRequest) (*ai.ChatResponse, error)
	Stream(ctx context.Context, req ai.ChatRequest, sink *ai.Sink) (*ai.ChatResponse, error)
}

type Handler struct {
	AI Chatter
}

func New(chatter Chatter) *Handler {
	return &Handler{AI: chatter}
}

func LimitJSONBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxJSONBodyBytes)
		c.Next()
	}
}

func bindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "Request is too large."})
			return false
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return false
	}
	return true
}

// the real error goes to the logs, the user just gets something readable
func respondAIError(c *gin.Context, err error) {
	log.Printf("[ai] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	if errors.Is(err, context.Canceled) {
		c.Status(499)
		return
	}
	status, msg := aiErrorMessage(err)
	c.JSON(status, gin.H{"error": msg})
}

func aiErrorMessage(err error) (int, string) {
	switch {
	case errors.Is(err, ai.ErrNotConfigured):
		return http.StatusServiceUnavailable, "The AI isn't set up on the server yet."
	case isQuota(err):
		wait, _ := ai.RetryAfter(err)
		return http.StatusTooManyRequests, "StudyMate has used up its AI quota for now. Try again in " + roughly(wait) + "."
	case ai.IsBusy(err):
		return http.StatusServiceUnavailable, "The AI is busy right now. Give it a minute and try again."
	case errors.Is(err, context.DeadlineExceeded):
		return http.StatusGatewayTimeout, "That took too long. Please try again."
	default:
		return http.StatusBadGateway, "Couldn't get an answer right now. Please try again."
	}
}

func isQuota(err error) bool {
	var qe ai.QuotaError
	if errors.As(err, &qe) {
		return true
	}
	_, ok := ai.RetryAfter(err)
	return ok
}

func roughly(d time.Duration) string {
	switch {
	case d < 2*time.Minute:
		return "a minute"
	case d < time.Hour:
		return fmt.Sprintf("%d minutes", int(d.Minutes()))
	case d < 90*time.Minute:
		return "about an hour"
	default:
		return fmt.Sprintf("about %d hours", int(d.Hours()+0.5))
	}
}

// streams the answer as server-sent events when the browser asks for it, plain json otherwise
func (h *Handler) answer(c *gin.Context, req ai.ChatRequest) {
	if !strings.Contains(c.GetHeader("Accept"), "text/event-stream") {
		resp, err := h.AI.Chat(c.Request.Context(), req)
		if err != nil {
			respondAIError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"response": resp.Text, "model": resp.Model})
		return
	}

	started := false
	resp, err := h.AI.Stream(c.Request.Context(), req, &ai.Sink{
		Text: func(text string) error {
			if !started {
				// headers only go out with the first words, so an early failure can still be a normal json error
				c.Header("Content-Type", "text/event-stream")
				c.Header("Cache-Control", "no-cache")
				c.Header("X-Accel-Buffering", "no")
				c.Status(http.StatusOK)
				started = true
			}
			writeEvent(c, "chunk", gin.H{"text": text})
			return c.Request.Context().Err()
		},
		Reset: func() error {
			writeEvent(c, "reset", gin.H{})
			return c.Request.Context().Err()
		},
	})
	switch {
	case err != nil && !started:
		respondAIError(c, err)
	case err != nil:
		log.Printf("[ai] stream broke halfway on %s: %v", c.Request.URL.Path, err)
		_, msg := aiErrorMessage(err)
		writeEvent(c, "error", gin.H{"error": msg})
	default:
		writeEvent(c, "done", gin.H{"model": resp.Model})
	}
}

func writeEvent(c *gin.Context, event string, data any) {
	payload, _ := json.Marshal(data)
	fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, payload)
	c.Writer.Flush()
}

func sanitizeHistory(history []ai.Message) []ai.Message {
	out := make([]ai.Message, 0, len(history))
	for _, m := range history {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		content := strings.TrimSpace(m.Content)
		if content == "" {
			continue
		}
		out = append(out, ai.Message{Role: m.Role, Content: truncateRunes(content, maxMessageChars)})
	}
	if len(out) > maxHistoryTurns {
		out = out[len(out)-maxHistoryTurns:]
	}
	// gemini wants the conversation to start with a user turn
	for len(out) > 0 && out[0].Role != "user" {
		out = out[1:]
	}
	return out
}

func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n]) + "…"
}

const baseStyle = "Format answers in Markdown: short paragraphs, headings and bullet lists where helpful, " +
	"and LaTeX for maths ($...$ inline, $$...$$ for display equations). Be accurate; if you are unsure, say so."

func systemPromptForMode(mode string) string {
	switch mode {
	case "handout":
		return "You are StudyMate, an expert study assistant. The student has shared course material. " +
			"Explain it in clear, simple language, highlight the key ideas, and stay faithful to the material. " + baseStyle
	case "youtube":
		return "You are StudyMate, a video learning assistant. Answer from the video, using its transcript and chapters when given, " +
			"and cite timestamps like [12:30] where helpful. " + baseStyle
	case "quiz":
		return "You are StudyMate, a quiz generator. Create well-structured, educationally sound questions with clear answers and explanations."
	default:
		return "You are StudyMate, a friendly AI study coach for students. Give clear, structured, step-by-step explanations, " +
			"use worked examples, and check understanding where useful. " + baseStyle
	}
}
