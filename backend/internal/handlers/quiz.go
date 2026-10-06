package handlers

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"studymate/backend/internal/ai"
	"studymate/backend/internal/extract"
	"studymate/backend/internal/youtube"
)

type quizContext struct {
	Type    string `json:"type"`    // text | url | youtube | document
	Content string `json:"content"` // text, a link, or a base64 file
}

type quizRequest struct {
	Topic      string       `json:"topic"`
	Count      int          `json:"count"`
	Difficulty string       `json:"difficulty"` // easy | medium | hard | mixed
	Type       string       `json:"type"`       // mcq | theory | mixed
	Context    *quizContext `json:"context"`
}

type QuizItem struct {
	ID          int      `json:"id"`
	Question    string   `json:"question"`
	Type        string   `json:"type"` // mcq | theory
	Options     []string `json:"options,omitempty"`
	AnswerIndex *int     `json:"answerIndex,omitempty"`
	Answer      string   `json:"answer"` // the right option for mcq, the model answer for theory
	Explanation string   `json:"explanation"`
}

const quizSystemPrompt = `You are StudyMate's quiz generator. Respond with ONLY a JSON object, no markdown fences:
{"title":"short quiz title","questions":[
  {"question":"...","type":"mcq","options":["...","...","...","..."],"answer":"B","explanation":"..."},
  {"question":"...","type":"theory","answer":"a concise model answer / marking guide","explanation":"..."}
]}
Rules: multiple-choice questions have exactly 4 options without letter prefixes, and "answer" is the letter (A-D) of the correct option.
Questions must be accurate, unambiguous, and test understanding rather than trivia. Use LaTeX ($...$) for maths.`

var (
	jsonFenceRegex    = regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")
	optionPrefixRegex = regexp.MustCompile(`^\s*\(?([A-Da-d])[\).:\-]\s+`)
	validDifficulty   = map[string]bool{"easy": true, "medium": true, "hard": true, "mixed": true}
	validQuizType     = map[string]bool{"mcq": true, "theory": true, "mixed": true}
)

func (h *Handler) Quiz(c *gin.Context) {
	var req quizRequest
	if !bindJSON(c, &req) {
		return
	}

	req.Topic = truncateRunes(strings.TrimSpace(req.Topic), maxQuestionChars)
	req.Count = clamp(req.Count, 1, maxQuizCount, defaultQuizCount)
	if !validDifficulty[req.Difficulty] {
		req.Difficulty = "mixed"
	}
	if !validQuizType[req.Type] {
		req.Type = "mixed"
	}

	contextText, video, err := h.resolveQuizContext(c, req.Context)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Topic == "" && contextText == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tell me a topic (or give a source) for the quiz."})
		return
	}

	aiResp, err := h.AI.Chat(c.Request.Context(), ai.ChatRequest{
		System:   quizSystemPrompt,
		Messages: []ai.Message{{Role: "user", Content: buildQuizPrompt(req.Topic, req.Count, req.Difficulty, req.Type, contextText)}},
		Video:    video,
		JSON:     true,
	})
	if err != nil {
		respondAIError(c, err)
		return
	}

	title, quiz, err := parseQuiz(aiResp.Text)
	if err != nil || len(quiz) == 0 {
		log.Printf("[quiz] unparseable model output (%v): %.300s", err, aiResp.Text)
		c.JSON(http.StatusBadGateway, gin.H{"error": "The quiz came back malformed. Please try again."})
		return
	}
	if title == "" {
		title = req.Topic
	}

	c.JSON(http.StatusOK, gin.H{"title": title, "quiz": quiz, "model": aiResp.Model})
}

func clamp(v, lo, hi, fallback int) int {
	if v <= 0 {
		return fallback
	}
	return min(max(v, lo), hi)
}

// returns the context as text, or a video for gemini to watch when the captions can't be read
func (h *Handler) resolveQuizContext(c *gin.Context, qc *quizContext) (string, *ai.Video, error) {
	if qc == nil || strings.TrimSpace(qc.Content) == "" {
		return "", nil, nil
	}
	content := strings.TrimSpace(qc.Content)

	switch qc.Type {
	case "text":
		return truncateRunes(content, extract.MaxDocumentChars), nil, nil

	case "url":
		if _, err := youtube.ExtractVideoID(content); err == nil {
			return h.resolveQuizContext(c, &quizContext{Type: "youtube", Content: content})
		}
		page, err := extract.URL(c.Request.Context(), content)
		if err != nil {
			log.Printf("[quiz] url context: %v", err)
			return "", nil, errors.New("Couldn't read that web page. Check the link or paste the text instead.")
		}
		return fmt.Sprintf("Source: %s\n\n%s", page.Title, page.Content), nil, nil

	case "youtube":
		videoID, err := youtube.ExtractVideoID(content)
		if err != nil {
			return "", nil, errors.New("That doesn't look like a YouTube video link.")
		}
		_, segs, err := youtube.FetchVideo(c.Request.Context(), videoID)
		if len(segs) == 0 {
			log.Printf("[quiz] no captions for %s, gemini watches it instead: %v", videoID, err)
			return "The attached YouTube video is the context material.", videoToWatch(videoID, 0), nil
		}
		return "YouTube video transcript:\n" + truncateRunes(youtube.TranscriptText(segs), maxTranscriptChar), nil, nil

	case "document":
		data, err := base64.StdEncoding.DecodeString(content)
		if err != nil {
			return "", nil, errors.New("The document has to be base64 encoded.")
		}
		if text, err := extract.PDF(data); err == nil {
			return text, nil, nil
		}
		if utf8.Valid(data) {
			return truncateRunes(string(data), extract.MaxDocumentChars), nil, nil
		}
		return "", nil, errors.New("Couldn't read any text from that document. Upload it in Handout mode instead.")
	}

	return "", nil, fmt.Errorf("unknown context type %q", qc.Type)
}

func buildQuizPrompt(topic string, count int, difficulty, qtype, context string) string {
	var sb strings.Builder
	if context != "" {
		sb.WriteString("CONTEXT MATERIAL:\n")
		sb.WriteString(context)
		sb.WriteString("\n\n")
	}
	fmt.Fprintf(&sb, "Generate a %s-difficulty quiz of exactly %d questions", difficulty, count)
	if topic != "" {
		fmt.Fprintf(&sb, " on the topic: %s", topic)
		if context != "" {
			sb.WriteString(" (using the context material above)")
		}
	} else {
		sb.WriteString(" based on the context material above")
	}
	sb.WriteString(".\n")

	switch qtype {
	case "mcq":
		sb.WriteString("All questions must be multiple-choice.")
	case "theory":
		sb.WriteString("All questions must be open-ended theory questions.")
	default:
		sb.WriteString("Mix multiple-choice (about two-thirds) and theory questions.")
	}
	return sb.String()
}

type rawQuizItem struct {
	Question    string   `json:"question"`
	Type        string   `json:"type"`
	Options     []string `json:"options"`
	Answer      any      `json:"answer"`
	Explanation string   `json:"explanation"`
}

// models don't always follow the format, so be forgiving about fences, extra text and field names
func parseQuiz(raw string) (string, []QuizItem, error) {
	if m := jsonFenceRegex.FindStringSubmatch(raw); m != nil {
		raw = m[1]
	}
	if start := strings.Index(raw, "{"); start > 0 {
		raw = raw[start:]
	}
	if end := strings.LastIndex(raw, "}"); end >= 0 && end < len(raw)-1 {
		raw = raw[:end+1]
	}

	var wrapper struct {
		Title     string        `json:"title"`
		Questions []rawQuizItem `json:"questions"`
		Quiz      []rawQuizItem `json:"quiz"`
	}
	if err := json.Unmarshal([]byte(raw), &wrapper); err != nil {
		return "", nil, fmt.Errorf("parse quiz json: %w", err)
	}
	items := wrapper.Questions
	if len(items) == 0 {
		items = wrapper.Quiz
	}

	out := make([]QuizItem, 0, len(items))
	for _, it := range items {
		q, ok := normaliseItem(it)
		if !ok {
			continue
		}
		q.ID = len(out) + 1
		out = append(out, q)
	}
	return strings.TrimSpace(wrapper.Title), out, nil
}

func normaliseItem(it rawQuizItem) (QuizItem, bool) {
	q := QuizItem{
		Question:    strings.TrimSpace(it.Question),
		Explanation: strings.TrimSpace(it.Explanation),
	}
	if q.Question == "" {
		return q, false
	}
	answer := strings.TrimSpace(fmt.Sprint(valueOr(it.Answer, "")))

	if len(it.Options) < 2 {
		q.Type = "theory"
		q.Answer = answer
		return q, q.Answer != ""
	}

	q.Type = "mcq"
	for _, opt := range it.Options {
		q.Options = append(q.Options, strings.TrimSpace(optionPrefixRegex.ReplaceAllString(opt, "")))
	}

	idx := answerIndex(answer, it.Options, q.Options)
	if idx < 0 {
		return q, false
	}
	q.AnswerIndex = &idx
	q.Answer = q.Options[idx]
	return q, true
}

func valueOr(v, fallback any) any {
	if v == nil {
		return fallback
	}
	if f, ok := v.(float64); ok {
		return fmt.Sprintf("%d", int(f))
	}
	return v
}

// handles "B", "b)", "B) text", 1-based numbers, or the option text itself
func answerIndex(answer string, rawOpts, cleanOpts []string) int {
	if answer == "" {
		return -1
	}
	if m := optionPrefixRegex.FindStringSubmatch(answer + " "); m != nil || len(answer) == 1 {
		letter := answer[:1]
		if m != nil {
			letter = m[1]
		}
		if i := int(strings.ToUpper(letter)[0] - 'A'); i >= 0 && i < len(cleanOpts) {
			return i
		}
	}
	var n int
	if _, err := fmt.Sscanf(answer, "%d", &n); err == nil && fmt.Sprint(n) == answer {
		if n >= 1 && n <= len(cleanOpts) {
			return n - 1
		}
		if n == 0 {
			return 0
		}
	}
	for i := range cleanOpts {
		if strings.EqualFold(answer, cleanOpts[i]) || strings.EqualFold(answer, strings.TrimSpace(rawOpts[i])) {
			return i
		}
	}
	return -1
}
