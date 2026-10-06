package youtube

import "testing"

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

func TestParseISO8601Duration(t *testing.T) {
	for in, want := range map[string]int{"PT1H2M3S": 3723, "PT45S": 45, "PT10M": 600, "P1D": 0, "": 0} {
		if got := parseISO8601Duration(in); got != want {
			t.Errorf("parseISO8601Duration(%q) = %d, want %d", in, got, want)
		}
	}
}

func TestDecodeEmbeddedURL(t *testing.T) {
	got := decodeEmbeddedURL(`https://www.youtube.com/api/timedtext?v=abc&lang=en&sig=x`)
	if got != "https://www.youtube.com/api/timedtext?v=abc&lang=en&sig=x" {
		t.Errorf("decodeEmbeddedURL = %q", got)
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
