package youtube

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

const maxResponseBytes = 8 << 20

type TranscriptSegment struct {
	Text         string  `json:"text"`
	StartSeconds float64 `json:"startSeconds"`
	Duration     float64 `json:"duration"`
}

type playerClient struct {
	userAgent string
	context   map[string]any
}

// the web caption urls now need a proof of origin token, the mobile app clients still don't
var playerClients = []playerClient{
	{
		userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
		context:   map[string]any{"clientName": "ANDROID", "clientVersion": "20.10.38", "androidSdkVersion": 30, "hl": "en", "gl": "US"},
	},
	{
		userAgent: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)",
		context:   map[string]any{"clientName": "IOS", "clientVersion": "20.10.4", "deviceModel": "iPhone16,2", "hl": "en", "gl": "US"},
	},
}

type captionTrack struct {
	BaseURL      string `json:"baseUrl"`
	LanguageCode string `json:"languageCode"`
	Kind         string `json:"kind"` // "asr" means auto-generated
}

type playerResponse struct {
	PlayabilityStatus struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	} `json:"playabilityStatus"`
	VideoDetails struct {
		Title            string `json:"title"`
		Author           string `json:"author"`
		LengthSeconds    string `json:"lengthSeconds"`
		ShortDescription string `json:"shortDescription"`
		Thumbnail        struct {
			Thumbnails []struct {
				URL   string `json:"url"`
				Width int    `json:"width"`
			} `json:"thumbnails"`
		} `json:"thumbnail"`
	} `json:"videoDetails"`
	Captions struct {
		Renderer struct {
			Tracks []captionTrack `json:"captionTracks"`
		} `json:"playerCaptionsTracklistRenderer"`
	} `json:"captions"`
}

// metadata and transcript from one player call, the transcript is empty when the video has no captions
func FetchVideo(ctx context.Context, videoID string) (*VideoMeta, []TranscriptSegment, error) {
	var meta *VideoMeta
	var lastErr error
	for _, client := range playerClients {
		p, err := fetchPlayer(ctx, client, videoID)
		if err != nil {
			lastErr = err
			continue
		}
		meta = p.meta(videoID)
		track, ok := pickTrack(p.Captions.Renderer.Tracks)
		if !ok {
			return meta, []TranscriptSegment{}, nil
		}
		segs, err := fetchCaptions(ctx, client, track.BaseURL)
		if err == nil && len(segs) > 0 {
			return meta, segs, nil
		}
		lastErr = fmt.Errorf("captions: %v", err)
	}
	if meta != nil {
		return meta, []TranscriptSegment{}, lastErr
	}
	return nil, nil, lastErr
}

func fetchPlayer(ctx context.Context, client playerClient, videoID string) (*playerResponse, error) {
	body, _ := json.Marshal(map[string]any{
		"context": map[string]any{"client": client.context},
		"videoId": videoID,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://www.youtube.com/youtubei/v1/player?prettyPrint=false", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", client.userAgent)

	data, err := do(req)
	if err != nil {
		return nil, err
	}
	var p playerResponse
	if err := json.Unmarshal(data, &p); err != nil {
		return nil, fmt.Errorf("parse player response: %w", err)
	}
	if p.PlayabilityStatus.Status != "OK" {
		return nil, fmt.Errorf("player said %s: %s", p.PlayabilityStatus.Status, p.PlayabilityStatus.Reason)
	}
	return &p, nil
}

func (p *playerResponse) meta(videoID string) *VideoMeta {
	d := p.VideoDetails
	description := d.ShortDescription
	if r := []rune(description); len(r) > maxDescriptionLen {
		description = string(r[:maxDescriptionLen])
	}
	thumbnail := "https://i.ytimg.com/vi/" + videoID + "/hqdefault.jpg"
	best := 0
	for _, t := range d.Thumbnail.Thumbnails {
		if t.Width > best {
			best, thumbnail = t.Width, t.URL
		}
	}
	duration, _ := strconv.Atoi(d.LengthSeconds)
	return &VideoMeta{
		VideoID:     videoID,
		Title:       d.Title,
		Channel:     d.Author,
		Description: description,
		Thumbnail:   thumbnail,
		EmbedURL:    embedURL(videoID),
		Duration:    duration,
		Chapters:    parseChapters(d.ShortDescription),
	}
}

// english first (proper captions over auto-generated), otherwise the auto-generated track, which is the spoken language
func pickTrack(tracks []captionTrack) (captionTrack, bool) {
	isEnglish := func(t captionTrack) bool { return t.LanguageCode == "en" || strings.HasPrefix(t.LanguageCode, "en-") }
	for _, want := range []func(captionTrack) bool{
		func(t captionTrack) bool { return isEnglish(t) && t.Kind != "asr" },
		isEnglish,
		func(t captionTrack) bool { return t.Kind == "asr" },
	} {
		for _, t := range tracks {
			if want(t) {
				return t, true
			}
		}
	}
	if len(tracks) > 0 {
		return tracks[0], true
	}
	return captionTrack{}, false
}

var fmtParam = regexp.MustCompile(`&fmt=[^&]*`)

type timedTextXML struct {
	Texts []struct {
		Start float64 `xml:"start,attr"`
		Dur   float64 `xml:"dur,attr"`
		Text  string  `xml:",chardata"`
	} `xml:"text"`
}

func fetchCaptions(ctx context.Context, client playerClient, baseURL string) ([]TranscriptSegment, error) {
	// without fmt you get the small <transcript><text> format
	data, err := httpGet(ctx, fmtParam.ReplaceAllString(baseURL, ""), client.userAgent)
	if err != nil {
		return nil, err
	}
	return parseTimedText(data)
}

func parseTimedText(data []byte) ([]TranscriptSegment, error) {
	var tt timedTextXML
	if err := xml.Unmarshal(data, &tt); err != nil {
		return nil, fmt.Errorf("parse captions: %w", err)
	}
	segs := make([]TranscriptSegment, 0, len(tt.Texts))
	for _, t := range tt.Texts {
		// the text comes double escaped, &amp;#39; and friends
		text := strings.Join(strings.Fields(html.UnescapeString(t.Text)), " ")
		if text == "" {
			continue
		}
		segs = append(segs, TranscriptSegment{Text: text, StartSeconds: t.Start, Duration: t.Dur})
	}
	return segs, nil
}

func httpGet(ctx context.Context, url, userAgent string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if userAgent == "" {
		userAgent = "Mozilla/5.0 (compatible; StudyMate/1.0)"
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	return do(req)
}

func do(req *http.Request) ([]byte, error) {
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

func TranscriptWindow(segs []TranscriptSegment, focusSec, windowSecs float64) []TranscriptSegment {
	var out []TranscriptSegment
	for _, s := range segs {
		if s.StartSeconds >= focusSec-windowSecs && s.StartSeconds <= focusSec+windowSecs {
			out = append(out, s)
		}
	}
	return out
}

// ~30 second paragraphs with one timestamp each, way fewer tokens than a stamp on every line
func TranscriptText(segs []TranscriptSegment) string {
	var sb strings.Builder
	chunkStart := -1.0
	for _, s := range segs {
		if chunkStart < 0 || s.StartSeconds-chunkStart >= 30 {
			if chunkStart >= 0 {
				sb.WriteString("\n")
			}
			chunkStart = s.StartSeconds
			sb.WriteString("[" + FormatTimestamp(int(s.StartSeconds)) + "]")
		}
		sb.WriteString(" " + s.Text)
	}
	if sb.Len() > 0 {
		sb.WriteString("\n")
	}
	return sb.String()
}
