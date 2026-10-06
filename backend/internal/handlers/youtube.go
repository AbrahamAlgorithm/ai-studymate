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

	meta, transcript, err := youtube.FetchVideo(c.Request.Context(), videoID)
	if err != nil {
		log.Printf("[youtube] player for %s: %v", videoID, err)
	}
	if meta == nil {
		// youtube can refuse the player call (cloud ips get this a lot), oembed still gives the basics
		if meta, err = youtube.FetchOEmbed(c.Request.Context(), videoID); err != nil {
			log.Printf("[youtube] oembed for %s: %v", videoID, err)
			c.JSON(http.StatusNotFound, gin.H{"error": "Couldn't load that video. Check the link, private or removed videos won't work."})
			return
		}
		transcript = []youtube.TranscriptSegment{}
	}

	c.JSON(http.StatusOK, youtubeInfoResponse{
		VideoMeta:           meta,
		Transcript:          transcript,
		TranscriptAvailable: len(transcript) > 0,
	})
}

type youtubeAskRequest struct {
	VideoID     string                      `json:"videoId"  binding:"required"`
	Title       string                      `json:"title"`
	Channel     string                      `json:"channel"`
	Description string                      `json:"description"`
	Question    string                      `json:"question" binding:"required"`
	Transcript  []youtube.TranscriptSegment `json:"transcript"`
	Chapters    []youtube.Chapter           `json:"chapters"`
	FocusTime   float64                     `json:"focusTime"` // seconds, 0 means look for a timestamp in the question
	History     []ai.Message                `json:"history"`
}

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

	h.answer(c, ai.ChatRequest{System: systemPromptForMode("youtube"), Messages: messages})
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
		if window := youtube.TranscriptWindow(segs, focus, 120); len(window) > 0 {
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

	// no captions, so make sure the model doesn't pretend it watched the video
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
