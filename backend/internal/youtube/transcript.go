package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
)

const maxResponseBytes = 8 << 20 // 8 MB; watch pages are large but bounded

// TranscriptSegment is one timed caption entry.
type TranscriptSegment struct {
	Text         string  `json:"text"`
	StartSeconds float64 `json:"startSeconds"`
	Duration     float64 `json:"duration"`
}

// FetchTranscript attempts to retrieve captions for a video. It tries the
// direct timedtext API with common English codes, then falls back to scraping
// the caption track URL from the watch page. Captions are best-effort:
// YouTube may block or omit them, so callers must handle an error here.
func FetchTranscript(ctx context.Context, videoID string) ([]TranscriptSegment, error) {
	for _, lang := range []string{"en", "en-US", "en-GB"} {
		segs, err := fetchTimedText(ctx, fmt.Sprintf(
			"https://www.youtube.com/api/timedtext?v=%s&lang=%s&fmt=json3", videoID, lang,
		))
		if err == nil && len(segs) > 0 {
			return segs, nil
		}
	}

	trackURL, err := scrapeCaptionTrackURL(ctx, videoID)
	if err != nil {
		return nil, fmt.Errorf("transcript unavailable for video %s: %w", videoID, err)
	}
	segs, err := fetchTimedText(ctx, trackURL)
	if err != nil {
		return nil, err
	}
	if len(segs) == 0 {
		return nil, fmt.Errorf("transcript for video %s is empty", videoID)
	}
	return segs, nil
}

// --- timedtext API (json3 format) ---

type timedTextJSON3 struct {
	Events []struct {
		TStartMs    float64 `json:"tStartMs"`
		DDurationMs float64 `json:"dDurationMs"`
		Segs        []struct {
			UTF8 string `json:"utf8"`
		} `json:"segs"`
	} `json:"events"`
}

func fetchTimedText(ctx context.Context, trackURL string) ([]TranscriptSegment, error) {
	body, err := httpGet(ctx, trackURL)
	if err != nil {
		return nil, err
	}
	if len(body) == 0 {
		return nil, fmt.Errorf("empty response")
	}

	var tt timedTextJSON3
	if err := json.Unmarshal(body, &tt); err != nil {
		return nil, fmt.Errorf("parse json3: %w", err)
	}

	var segs []TranscriptSegment
	for _, ev := range tt.Events {
		var sb strings.Builder
		for _, s := range ev.Segs {
			sb.WriteString(s.UTF8)
		}
		text := strings.TrimSpace(html.UnescapeString(sb.String()))
		if text == "" {
			continue
		}
		segs = append(segs, TranscriptSegment{
			Text:         text,
			StartSeconds: ev.TStartMs / 1000,
			Duration:     ev.DDurationMs / 1000,
		})
	}
	return segs, nil
}

// --- Watch-page scraping fallback ---

var (
	captionTracksRegex = regexp.MustCompile(`"captionTracks":\s*(\[.*?\])`)
	baseURLRegex       = regexp.MustCompile(`"baseUrl":\s*"([^"]+)"`)
)

func scrapeCaptionTrackURL(ctx context.Context, videoID string) (string, error) {
	body, err := httpGet(ctx, "https://www.youtube.com/watch?v="+videoID)
	if err != nil {
		return "", err
	}

	m := captionTracksRegex.FindSubmatch(body)
	if m == nil {
		return "", fmt.Errorf("no captionTracks in page")
	}

	// Find the first baseUrl in the captionTracks array.
	mu := baseURLRegex.FindSubmatch(m[1])
	if mu == nil {
		return "", fmt.Errorf("no baseUrl in captionTracks")
	}

	return decodeEmbeddedURL(string(mu[1])) + "&fmt=json3", nil
}

// decodeEmbeddedURL un-escapes a URL taken from the JSON embedded in a watch
// page, where "&" is written as the JSON escape &.
func decodeEmbeddedURL(raw string) string {
	var s string
	if err := json.Unmarshal([]byte(`"`+raw+`"`), &s); err == nil {
		return s
	}
	return strings.ReplaceAll(raw, `&`, "&")
}

// --- helpers ---

func httpGet(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; StudyMate/1.0)")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d from youtube", resp.StatusCode)
	}

	return io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
}

// TranscriptWindow extracts transcript segments within ±windowSecs of focusSec.
func TranscriptWindow(segs []TranscriptSegment, focusSec, windowSecs float64) []TranscriptSegment {
	var out []TranscriptSegment
	for _, s := range segs {
		if s.StartSeconds >= focusSec-windowSecs && s.StartSeconds <= focusSec+windowSecs {
			out = append(out, s)
		}
	}
	return out
}

// TranscriptText renders segments as timestamped lines, e.g. "[1:05] text",
// so the model can cite timestamps accurately.
func TranscriptText(segs []TranscriptSegment) string {
	var sb strings.Builder
	for _, s := range segs {
		sb.WriteString("[")
		sb.WriteString(FormatTimestamp(int(s.StartSeconds)))
		sb.WriteString("] ")
		sb.WriteString(s.Text)
		sb.WriteString("\n")
	}
	return sb.String()
}

// FormatTimestamp renders seconds as m:ss or h:mm:ss.
func FormatTimestamp(secs int) string {
	h, m, s := secs/3600, (secs%3600)/60, secs%60
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%d:%02d", m, s)
}
