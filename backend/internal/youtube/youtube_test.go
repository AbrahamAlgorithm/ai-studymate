package youtube

import (
	"context"
	"os"
	"strings"
	"testing"
)

func TestExtractVideoID(t *testing.T) {
	for url, want := range map[string]string{
		"https://www.youtube.com/watch?v=dQw4w9WgXcQ":                "dQw4w9WgXcQ",
		"https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=30": "dQw4w9WgXcQ",
		"https://youtu.be/dQw4w9WgXcQ?si=abc":                        "dQw4w9WgXcQ",
		"https://www.youtube.com/shorts/dQw4w9WgXcQ":                 "dQw4w9WgXcQ",
		"https://www.youtube.com/embed/dQw4w9WgXcQ":                  "dQw4w9WgXcQ",
		"https://www.youtube.com/live/dQw4w9WgXcQ":                   "dQw4w9WgXcQ",
	} {
		got, err := ExtractVideoID(url)
		if err != nil || got != want {
			t.Errorf("ExtractVideoID(%q) = %q, %v", url, got, err)
		}
	}
	for _, bad := range []string{"https://vimeo.com/123", "https://www.youtube.com/channel/abc", "hello"} {
		if _, err := ExtractVideoID(bad); err == nil {
			t.Errorf("ExtractVideoID(%q) should fail", bad)
		}
	}
}

func TestParseChapters(t *testing.T) {
	desc := "Great lecture!\n0:00 Intro\n2:15 - Free body diagrams\n1:05:30 Summary\nnot a chapter 3:00"
	ch := parseChapters(desc)
	if len(ch) != 3 {
		t.Fatalf("got %d chapters: %+v", len(ch), ch)
	}
	if ch[1].Title != "Free body diagrams" || ch[1].StartSeconds != 135 {
		t.Errorf("chapter 2 = %+v", ch[1])
	}
	if ch[2].StartSeconds != 3930 {
		t.Errorf("chapter 3 start = %d", ch[2].StartSeconds)
	}
}

func TestTimestamps(t *testing.T) {
	if FormatTimestamp(65) != "1:05" || FormatTimestamp(3723) != "1:02:03" {
		t.Error("FormatTimestamp wrong")
	}
	if TimestampToSeconds("12:30") != 750 || TimestampToSeconds("1:02:03") != 3723 {
		t.Error("TimestampToSeconds wrong")
	}
}

func TestTranscriptWindowAndText(t *testing.T) {
	segs := []TranscriptSegment{{Text: "a", StartSeconds: 0}, {Text: "b", StartSeconds: 300}, {Text: "c", StartSeconds: 900}}
	w := TranscriptWindow(segs, 310, 120)
	if len(w) != 1 || w[0].Text != "b" {
		t.Errorf("window = %+v", w)
	}
	if got := TranscriptText(w); got != "[5:00] b\n" {
		t.Errorf("TranscriptText = %q", got)
	}
}

func TestPickTrack(t *testing.T) {
	ar := captionTrack{LanguageCode: "ar", Kind: "asr"}
	enAuto := captionTrack{LanguageCode: "en", Kind: "asr"}
	enGB := captionTrack{LanguageCode: "en-GB"}
	fr := captionTrack{LanguageCode: "fr"}
	deAuto := captionTrack{LanguageCode: "de", Kind: "asr"}

	cases := []struct {
		tracks []captionTrack
		want   string
	}{
		{[]captionTrack{ar, enAuto, enGB}, "en-GB"}, // proper english beats auto-generated
		{[]captionTrack{ar, enAuto}, "en"},          // this video listed arabic first
		{[]captionTrack{fr, deAuto}, "de"},          // no english, use the spoken language
		{[]captionTrack{fr}, "fr"},
	}
	for _, tc := range cases {
		if got, ok := pickTrack(tc.tracks); !ok || got.LanguageCode != tc.want {
			t.Errorf("pickTrack(%v) = %q, want %q", tc.tracks, got.LanguageCode, tc.want)
		}
	}
	if _, ok := pickTrack(nil); ok {
		t.Error("no tracks should mean no pick")
	}
}

func TestParseTimedText(t *testing.T) {
	xml := `<?xml version="1.0" encoding="utf-8" ?><transcript>` +
		`<text start="0.16" dur="3.7">it&amp;#39;s a load
balancer</text><text start="2" dur="1">  </text><text start="31.5" dur="2">cache &amp;amp; database</text></transcript>`
	segs, err := parseTimedText([]byte(xml))
	if err != nil {
		t.Fatal(err)
	}
	if len(segs) != 2 || segs[0].Text != "it's a load balancer" || segs[1].Text != "cache & database" || segs[1].StartSeconds != 31.5 {
		t.Fatalf("segs = %+v", segs)
	}
	if got := TranscriptText(segs); got != "[0:00] it's a load balancer\n[0:31] cache & database\n" {
		t.Errorf("TranscriptText = %q", got)
	}
}

func TestTranscriptTextGroupsIntoParagraphs(t *testing.T) {
	segs := []TranscriptSegment{{Text: "a", StartSeconds: 0}, {Text: "b", StartSeconds: 10}, {Text: "c", StartSeconds: 31}, {Text: "d", StartSeconds: 45}}
	if got := TranscriptText(segs); got != "[0:00] a b\n[0:31] c d\n" {
		t.Errorf("TranscriptText = %q", got)
	}
}

// talks to youtube for real, run it with: YOUTUBE_LIVE=1 go test ./internal/youtube -run Live -v
func TestFetchVideoLive(t *testing.T) {
	if os.Getenv("YOUTUBE_LIVE") == "" {
		t.Skip("set YOUTUBE_LIVE=1 to run")
	}
	meta, segs, err := FetchVideo(context.Background(), "SE2KF-vxvS0")
	if err != nil || meta == nil {
		t.Fatalf("meta = %+v, err = %v", meta, err)
	}
	if !strings.Contains(meta.Title, "System Design") || meta.Duration == 0 || len(meta.Chapters) == 0 {
		t.Errorf("meta = %+v", meta)
	}
	if len(segs) < 100 || !strings.Contains(strings.ToLower(TranscriptText(segs[:20])), "system") {
		t.Errorf("expected an english transcript, got %d segments, starts %q", len(segs), TranscriptText(segs[:min(3, len(segs))]))
	}
	t.Logf("%q by %s, %ds, %d chapters, %d transcript lines, starts: %s", meta.Title, meta.Channel, meta.Duration, len(meta.Chapters), len(segs), TranscriptText(segs[:3]))
}
