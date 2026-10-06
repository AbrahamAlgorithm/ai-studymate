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

	"google.golang.org/api/option"
	yt "google.golang.org/api/youtube/v3"
)

const maxDescriptionLen = 4000

// httpClient is used for all outbound YouTube requests (fixed, trusted hosts).
var httpClient = &http.Client{Timeout: 15 * time.Second}

// VideoMeta holds all structured metadata about a YouTube video.
type VideoMeta struct {
	VideoID     string    `json:"videoId"`
	Title       string    `json:"title"`
	Channel     string    `json:"channel"`
	Description string    `json:"description"`
	Thumbnail   string    `json:"thumbnail"`
	EmbedURL    string    `json:"embedUrl"`
	Duration    int       `json:"duration"` // seconds, 0 when unknown
	Chapters    []Chapter `json:"chapters"`
}

// Chapter is a named section within a video.
type Chapter struct {
	Title        string `json:"title"`
	StartSeconds int    `json:"startSeconds"`
}

var (
	// Matches video ID from various YouTube URL forms.
	videoIDRegex = regexp.MustCompile(
		`(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|v/|shorts/|live/)|youtu\.be/)([a-zA-Z0-9_-]{11})`,
	)
	// Matches chapter lines: "0:00 Intro" or "1:05:30 Title"
	chapterLineRegex = regexp.MustCompile(`(?m)^\s*(\d+:\d{2}(?::\d{2})?)\s*[-–—:]?\s+(.+)$`)
)

// ExtractVideoID parses a video ID from any supported YouTube URL.
func ExtractVideoID(rawURL string) (string, error) {
	m := videoIDRegex.FindStringSubmatch(rawURL)
	if len(m) < 2 {
		return "", fmt.Errorf("not a recognised YouTube video link")
	}
	return m[1], nil
}

// FetchMeta retrieves video metadata. It uses the YouTube Data API v3 when an
// API key is configured and falls back to the keyless oEmbed endpoint
// (title, channel, thumbnail only) otherwise.
func FetchMeta(ctx context.Context, apiKey, videoID string) (*VideoMeta, error) {
	if apiKey != "" {
		meta, err := fetchMetaDataAPI(ctx, apiKey, videoID)
		if err == nil {
			return meta, nil
		}
		// Fall through to oEmbed so a quota/key problem doesn't break the feature.
		oe, oeErr := fetchMetaOEmbed(ctx, videoID)
		if oeErr != nil {
			return nil, err
		}
		return oe, nil
	}
	return fetchMetaOEmbed(ctx, videoID)
}

func fetchMetaDataAPI(ctx context.Context, apiKey, videoID string) (*VideoMeta, error) {
	svc, err := yt.NewService(ctx, option.WithAPIKey(apiKey), option.WithHTTPClient(httpClient))
	if err != nil {
		return nil, fmt.Errorf("youtube service: %w", err)
	}

	resp, err := svc.Videos.List([]string{"snippet", "contentDetails"}).Id(videoID).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("youtube videos.list: %w", err)
	}
	if len(resp.Items) == 0 {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	item := resp.Items[0]
	snippet := item.Snippet

	thumbnail := ""
	if snippet.Thumbnails != nil {
		switch {
		case snippet.Thumbnails.Maxres != nil:
			thumbnail = snippet.Thumbnails.Maxres.Url
		case snippet.Thumbnails.High != nil:
			thumbnail = snippet.Thumbnails.High.Url
		case snippet.Thumbnails.Medium != nil:
			thumbnail = snippet.Thumbnails.Medium.Url
		}
	}

	duration := 0
	if item.ContentDetails != nil {
		duration = parseISO8601Duration(item.ContentDetails.Duration)
	}

	description := snippet.Description
	if r := []rune(description); len(r) > maxDescriptionLen {
		description = string(r[:maxDescriptionLen])
	}

	return &VideoMeta{
		VideoID:     videoID,
		Title:       snippet.Title,
		Channel:     snippet.ChannelTitle,
		Description: description,
		Thumbnail:   thumbnail,
		EmbedURL:    embedURL(videoID),
		Duration:    duration,
		Chapters:    parseChapters(snippet.Description),
	}, nil
}

func fetchMetaOEmbed(ctx context.Context, videoID string) (*VideoMeta, error) {
	watchURL := "https://www.youtube.com/watch?v=" + videoID
	endpoint := "https://www.youtube.com/oembed?format=json&url=" + url.QueryEscape(watchURL)

	body, err := httpGet(ctx, endpoint)
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

// parseISO8601Duration converts a YouTube API duration string (e.g. "PT1H2M3S") to seconds.
func parseISO8601Duration(d string) int {
	if !strings.HasPrefix(d, "PT") {
		return 0
	}
	dur, err := time.ParseDuration(
		strings.ToLower(
			strings.NewReplacer("PT", "", "H", "h", "M", "m", "S", "s").Replace(d),
		),
	)
	if err != nil {
		return 0
	}
	return int(dur.Seconds())
}

// parseChapters extracts YouTube-style chapter markers from a video description.
// Format per line: "0:00 Chapter title" or "1:05:30 Chapter title"
func parseChapters(description string) []Chapter {
	matches := chapterLineRegex.FindAllStringSubmatch(description, -1)
	chapters := make([]Chapter, 0, len(matches))
	for _, m := range matches {
		if len(m) < 3 {
			continue
		}
		chapters = append(chapters, Chapter{
			Title:        strings.TrimSpace(m[2]),
			StartSeconds: TimestampToSeconds(m[1]),
		})
	}
	return chapters
}

// TimestampToSeconds converts "1:30" or "1:05:30" to seconds.
func TimestampToSeconds(ts string) int {
	total := 0
	for _, p := range strings.Split(ts, ":") {
		n, _ := strconv.Atoi(p)
		total = total*60 + n
	}
	return total
}
