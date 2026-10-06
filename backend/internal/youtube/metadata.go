package youtube

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const maxDescriptionLen = 4000

var httpClient = &http.Client{Timeout: 15 * time.Second}

type VideoMeta struct {
	VideoID     string    `json:"videoId"`
	Title       string    `json:"title"`
	Channel     string    `json:"channel"`
	Description string    `json:"description"`
	Thumbnail   string    `json:"thumbnail"`
	EmbedURL    string    `json:"embedUrl"`
	Duration    int       `json:"duration"` // seconds, 0 if we don't know
	Chapters    []Chapter `json:"chapters"`
}

type Chapter struct {
	Title        string `json:"title"`
	StartSeconds int    `json:"startSeconds"`
}

var (
	// watch?v=, youtu.be, shorts, embed and live links
	videoIDRegex = regexp.MustCompile(
		`(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|v/|shorts/|live/)|youtu\.be/)([a-zA-Z0-9_-]{11})`,
	)
	// chapter lines in a description, like "0:00 Intro" or "1:05:30 Wrap up"
	chapterLineRegex = regexp.MustCompile(`(?m)^\s*(\d+:\d{2}(?::\d{2})?)\s*[-–—:]?\s+(.+)$`)
)

func ExtractVideoID(rawURL string) (string, error) {
	m := videoIDRegex.FindStringSubmatch(rawURL)
	if len(m) < 2 {
		return "", fmt.Errorf("not a recognised YouTube video link")
	}
	return m[1], nil
}

// only title, channel and thumbnail, for when youtube won't answer the player api
func FetchOEmbed(ctx context.Context, videoID string) (*VideoMeta, error) {
	watchURL := "https://www.youtube.com/watch?v=" + videoID
	endpoint := "https://www.youtube.com/oembed?format=json&url=" + url.QueryEscape(watchURL)

	body, err := httpGet(ctx, endpoint, "")
	if err != nil {
		return nil, fmt.Errorf("video not found or not embeddable: %w", err)
	}

	var oe struct {
		Title        string `json:"title"`
		AuthorName   string `json:"author_name"`
		ThumbnailURL string `json:"thumbnail_url"`
	}
	if err := json.Unmarshal(body, &oe); err != nil {
		return nil, fmt.Errorf("parse oembed: %w", err)
	}

	return &VideoMeta{
		VideoID:   videoID,
		Title:     oe.Title,
		Channel:   oe.AuthorName,
		Thumbnail: oe.ThumbnailURL,
		EmbedURL:  embedURL(videoID),
		Chapters:  []Chapter{},
	}, nil
}

func embedURL(videoID string) string {
	return "https://www.youtube.com/embed/" + videoID
}

func parseChapters(description string) []Chapter {
	matches := chapterLineRegex.FindAllStringSubmatch(description, -1)
	chapters := make([]Chapter, 0, len(matches))
	for _, m := range matches {
		chapters = append(chapters, Chapter{
			Title:        strings.TrimSpace(m[2]),
			StartSeconds: TimestampToSeconds(m[1]),
		})
	}
	return chapters
}

// "1:30" -> 90, "1:05:30" -> 3930
func TimestampToSeconds(ts string) int {
	total := 0
	for _, p := range strings.Split(ts, ":") {
		n, _ := strconv.Atoi(p)
		total = total*60 + n
	}
	return total
}

func FormatTimestamp(secs int) string {
	h, m, s := secs/3600, (secs%3600)/60, secs%60
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%d:%02d", m, s)
}
