package handlers

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"studymate/backend/internal/ai"
	"studymate/backend/internal/extract"
	"studymate/backend/internal/youtube"
)

type chatRequest struct {
	Message string       `json:"message" binding:"required"`
	History []ai.Message `json:"history"`
	Mode    string       `json:"mode"` // ask | handout | youtube | quiz
}

var linkRegex = regexp.MustCompile(`https?://[^\s<>"')\]]+`)

func (h *Handler) Chat(c *gin.Context) {
	var req chatRequest
	if !bindJSON(c, &req) {
		return
	}
	message := strings.TrimSpace(req.Message)
	if message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message cannot be empty."})
		return
	}
	message = truncateRunes(message, maxMessageChars)

	userTurn := message
	if page := h.linkedPage(c, message); page != "" {
		userTurn = page + "\n\nSTUDENT MESSAGE:\n" + message
	}

	messages := append(sanitizeHistory(req.History), ai.Message{Role: "user", Content: userTurn})

	h.answer(c, ai.ChatRequest{System: systemPromptForMode(req.Mode), Messages: messages})
}

// if they paste an article link, read the page so the answer can use it
func (h *Handler) linkedPage(c *gin.Context, message string) string {
	link := strings.TrimRight(linkRegex.FindString(message), ".,;:!?")
	if link == "" {
		return ""
	}
	if _, err := youtube.ExtractVideoID(link); err == nil {
		return "" // youtube links belong to youtube mode
	}
	page, err := extract.URL(c.Request.Context(), link)
	if err != nil {
		log.Printf("[chat] could not read linked page: %v", err)
		return fmt.Sprintf("(Note: the linked page %s could not be read, so answer without it and mention that.)", link)
	}
	return fmt.Sprintf("LINKED PAGE (%s) - %s:\n%s", link, page.Title, page.Content)
}
