package handlers

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

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

var (
	timestampInText = regexp.MustCompile(`\b(\d{1,2}:\d{2}(?::\d{2})?)\b`)
	videoIDPattern  = regexp.MustCompile(`^[A-Za-z0-9_-]{11}$`)
)

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
	if !videoIDPattern.MatchString(req.VideoID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "That doesn't look like a YouTube video."})
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

	chat := ai.ChatRequest{System: systemPromptForMode("youtube"), Messages: messages}
	if len(req.Transcript) == 0 {
		// no captions (youtube blocks us now and then), so gemini watches the video itself
		chat.Video = videoToWatch(req.VideoID, focus)
	}
	h.answer(c, chat)
}

// a timestamp question only needs a few minutes around it, anything else gets the whole video at a low frame rate
func videoToWatch(videoID string, focus float64) *ai.Video {
	v := &ai.Video{URL: "https://www.youtube.com/watch?v=" + videoID}
	if focus > 0 {
		v.Start = time.Duration(max(0, focus-90) * float64(time.Second))
		v.End = time.Duration((focus + 90) * float64(time.Second))
		return v
	}
	v.FPS = 0.1
	return v
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

	if req.Description != "" {
		sb.WriteString("\nVIDEO DESCRIPTION:\n")
		sb.WriteString(truncateRunes(req.Description, 4000))
		sb.WriteString("\n")
	}
	if focus > 0 {
		from, to := max(0, int(focus)-90), int(focus)+90
		fmt.Fprintf(&sb, "\nNo transcript was available, so you're watching the video itself, the part from %s to %s. "+
			"Answer from what is shown and said there and cite timestamps from the full video.",
			youtube.FormatTimestamp(from), youtube.FormatTimestamp(to))
	} else {
		sb.WriteString("\nNo transcript was available, so you're watching the video itself. " +
			"Answer from what is shown and said in it and cite timestamps.")
	}
	return sb.String()
}
