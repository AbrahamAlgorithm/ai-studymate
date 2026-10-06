package handlers

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"studymate/backend/internal/ai"
	"studymate/backend/internal/youtube"
)

// --- /api/youtube/info ---

type youtubeInfoRequest struct {
	URL string `json:"url" binding:"required"`
}

type youtubeInfoResponse struct {
	*youtube.VideoMeta
	Transcript          []youtube.TranscriptSegment `json:"transcript"`
	TranscriptAvailable bool                        `json:"transcriptAvailable"`
}

func (h *Handler) YoutubeInfo(c *gin.Context) {
	var req youtubeInfoRequest
	if !bindJSON(c, &req) {
		return
	}

	videoID, err := youtube.ExtractVideoID(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "That doesn't look like a YouTube video link."})
		return
	}

	meta, err := youtube.FetchMeta(c.Request.Context(), h.YoutubeAPIKey, videoID)
	if err != nil {
		log.Printf("[youtube] metadata for %s: %v", videoID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Couldn't load that video. Check the link — private or removed videos can't be used."})
		return
	}

	transcript, err := youtube.FetchTranscript(c.Request.Context(), videoID)
	if err != nil {
		// Transcript is best-effort — return metadata even if captions are unavailable.
		log.Printf("[youtube] transcript for %s: %v", videoID, err)
		transcript = []youtube.TranscriptSegment{}
	}

	c.JSON(http.StatusOK, youtubeInfoResponse{
		VideoMeta:           meta,
		Transcript:          transcript,
		TranscriptAvailable: len(transcript) > 0,
	})
}

// --- /api/youtube/ask ---

type youtubeAskRequest struct {
	VideoID     string                      `json:"videoId"  binding:"required"`
	Title       string                      `json:"title"`
	Channel     string                      `json:"channel"`
	Description string                      `json:"description"`
	Question    string                      `json:"question" binding:"required"`
	Transcript  []youtube.TranscriptSegment `json:"transcript"`
	Chapters    []youtube.Chapter           `json:"chapters"`
	FocusTime   float64                     `json:"focusTime"` // seconds, 0 = detect from question / full transcript
	History     []ai.Message                `json:"history"`
}

// timestampInText finds the first "12:30" / "1:02:03" style timestamp in a question.
var timestampInText = regexp.MustCompile(`\b(\d{1,2}:\d{2}(?::\d{2})?)\b`)

func (h *Handler) YoutubeAsk(c *gin.Context) {
	var req youtubeAskRequest
	if !bindJSON(c, &req) {
		return
	}
	question := truncateRunes(strings.TrimSpace(req.Question), maxQuestionChars)
	if question == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Question cannot be empty."})
		return
	}

	focus := req.FocusTime
	if focus <= 0 {
		if m := timestampInText.FindString(question); m != "" {
			focus = float64(youtube.TimestampToSeconds(m))
		}
	}

	userTurn := buildVideoContext(req, focus) + "\n\nQUESTION: " + question
	messages := append(sanitizeHistory(req.History), ai.Message{Role: "user", Content: userTurn})

	resp, err := h.AI.Chat(c.Request.Context(), ai.ChatRequest{
		System:   systemPromptForMode("youtube"),
		Messages: messages,
	})
	if err != nil {
		respondAIError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"response": resp.Text,
		"provider": resp.Provider,
	})
}

func buildVideoContext(req youtubeAskRequest, focus float64) string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "VIDEO: %q", req.Title)
	if req.Channel != "" {
		fmt.Fprintf(&sb, " by %s", req.Channel)
	}
	sb.WriteString("\n")

	if len(req.Chapters) > 0 {
		sb.WriteString("\nCHAPTERS:\n")
		for _, ch := range req.Chapters {
			fmt.Fprintf(&sb, "[%s] %s\n", youtube.FormatTimestamp(ch.StartSeconds), ch.Title)
		}
	}

	segs := req.Transcript
	if focus > 0 && len(segs) > 0 {
		if window := youtube.TranscriptWindow(segs, focus, 120); len(window) > 0 { // ±2 min
			segs = window
			fmt.Fprintf(&sb, "\n(The student is asking about the part around %s; the transcript below covers that window.)\n",
				youtube.FormatTimestamp(int(focus)))
		}
	}

	if len(segs) > 0 {
		sb.WriteString("\nTRANSCRIPT:\n")
		sb.WriteString(truncateRunes(youtube.TranscriptText(segs), maxTranscriptChar))
		return sb.String()
	}

	// No captions: be honest about what the model can and cannot see.
	if req.Description != "" {
		sb.WriteString("\nVIDEO DESCRIPTION:\n")
		sb.WriteString(truncateRunes(req.Description, 4000))
		sb.WriteString("\n")
	}
	sb.WriteString("\nNOTE: No transcript is available for this video, so you cannot see what is said in it. " +
		"Answer from the title, description and your general knowledge of the topic, say clearly that you are " +
		"doing so, and don't invent timestamps or claim to quote the video.")
	return sb.String()
}
