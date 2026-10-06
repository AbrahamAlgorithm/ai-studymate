package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"studymate/backend/internal/ai"
)

const (
	maxJSONBodyBytes  = 4 << 20 // transcripts are sent back with YouTube questions
	maxHistoryTurns   = 20      // most recent messages kept as conversation context
	maxMessageChars   = 20000   // per message
	maxQuestionChars  = 4000
	defaultQuizCount  = 10
	maxQuizCount      = 20
	maxTranscriptChar = 200000
)

// Chatter is the AI dependency of the handlers (satisfied by *ai.Router).
type Chatter interface {
	Chat(ctx context.Context, req ai.ChatRequest) (*ai.ChatResponse, error)
}

// Handler holds shared dependencies injected at startup.
type Handler struct {
	AI            Chatter
	YoutubeAPIKey string
}

// New creates a Handler with the given dependencies.
func New(chatter Chatter, youtubeAPIKey string) *Handler {
	return &Handler{AI: chatter, YoutubeAPIKey: youtubeAPIKey}
}

// LimitJSONBody caps request bodies for JSON endpoints.
func LimitJSONBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxJSONBodyBytes)
		c.Next()
	}
}

// bindJSON decodes the body and writes a 400 on failure.
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

// respondAIError maps AI failures to user-friendly responses without leaking
// upstream details (which are logged instead).
func respondAIError(c *gin.Context, err error) {
	log.Printf("[ai] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	switch {
	case errors.Is(err, ai.ErrNoProvider):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "The AI service isn't configured on the server yet."})
	case errors.Is(err, context.DeadlineExceeded):
		c.JSON(http.StatusGatewayTimeout, gin.H{"error": "The AI took too long to respond. Please try again."})
	case errors.Is(err, context.Canceled):
		c.Status(499) // client went away
	default:
		c.JSON(http.StatusBadGateway, gin.H{"error": "The AI service couldn't answer right now. Please try again in a moment."})
	}
}

// sanitizeHistory keeps the most recent valid turns and trims oversized ones.
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
	// Conversations must start with a user turn.
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
		return "You are StudyMate, a video learning assistant. Answer using the provided video transcript and chapters, " +
			"and cite timestamps like [12:30] where helpful. " + baseStyle
	case "quiz":
		return "You are StudyMate, a quiz generator. Create well-structured, educationally sound questions with clear answers and explanations."
	default:
		return "You are StudyMate, a friendly AI study coach for students. Give clear, structured, step-by-step explanations, " +
			"use worked examples, and check understanding where useful. " + baseStyle
	}
}
