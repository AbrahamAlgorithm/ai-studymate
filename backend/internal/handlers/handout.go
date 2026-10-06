package handlers

import (
	"errors"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"studymate/backend/internal/ai"
	"studymate/backend/internal/extract"
)

const maxUploadBytes = 10 << 20 // 10 MB

func (h *Handler) Handout(c *gin.Context) {
	// Leave room for multipart overhead on top of the file itself.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadBytes+(1<<20))

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "File is too large. The limit is 10 MB."})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please attach a file."})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxUploadBytes+1))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Could not read the uploaded file."})
		return
	}
	if len(data) > maxUploadBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "File is too large. The limit is 10 MB."})
		return
	}
	if len(data) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "The uploaded file is empty."})
		return
	}

	prompt := buildHandoutPrompt(
		truncateRunes(strings.TrimSpace(c.Request.FormValue("question")), maxQuestionChars),
		c.Request.FormValue("mode"),
	)
	req := ai.ChatRequest{System: systemPromptForMode("handout")}

	switch kind := detectKind(header.Filename, data); kind {
	case "image":
		req.Messages = []ai.Message{{Role: "user", Content: prompt}}
		req.Attachment = &ai.Attachment{Data: data, MimeType: http.DetectContentType(data)}

	case "pdf":
		text, pdfErr := extract.PDF(data)
		if pdfErr != nil {
			// Scanned PDF — let a model that reads PDFs natively (Gemini) look at it.
			log.Printf("[handout] no text layer in %q, sending as file: %v", header.Filename, pdfErr)
			req.Messages = []ai.Message{{Role: "user", Content: prompt}}
			req.Attachment = &ai.Attachment{Data: data, MimeType: "application/pdf"}
		} else {
			req.Messages = []ai.Message{{Role: "user", Content: documentPrompt(header.Filename, text, prompt)}}
		}

	case "text":
		text := truncateRunes(string(data), extract.MaxDocumentChars)
		req.Messages = []ai.Message{{Role: "user", Content: documentPrompt(header.Filename, text, prompt)}}

	default:
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"error": "Unsupported file type. Upload a PDF, an image (PNG, JPG, WEBP, GIF), or a .txt/.md file.",
		})
		return
	}

	resp, err := h.AI.Chat(c.Request.Context(), req)
	if err != nil {
		respondAIError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"response": resp.Text,
		"provider": resp.Provider,
	})
}

// detectKind classifies an upload by its content (falling back to the
// extension for plain text), so a renamed file can't masquerade as another type.
func detectKind(filename string, data []byte) string {
	mime := http.DetectContentType(data)
	switch {
	case mime == "application/pdf":
		return "pdf"
	case mime == "image/png", mime == "image/jpeg", mime == "image/webp", mime == "image/gif":
		return "image"
	}
	ext := strings.ToLower(filepath.Ext(filename))
	if (ext == ".txt" || ext == ".md" || ext == ".csv") && utf8.Valid(data) {
		return "text"
	}
	if strings.HasPrefix(mime, "text/plain") && utf8.Valid(data) {
		return "text"
	}
	return ""
}

func documentPrompt(filename, text, prompt string) string {
	return "DOCUMENT (" + filepath.Base(filename) + "):\n" + text + "\n\nTASK:\n" + prompt
}

func buildHandoutPrompt(question, mode string) string {
	if question != "" {
		return question
	}
	switch mode {
	case "summarize":
		return "Summarise this material into clear, concise bullet points covering all key ideas, grouped by topic."
	case "quiz":
		return "Generate a quiz (5 multiple-choice + 3 theory questions) based on this material. Put the answers and short explanations at the end."
	default:
		return "Explain this material in simple language, summarise the key points, then give 5 multiple-choice and 2 theory questions with answers at the end."
	}
}
