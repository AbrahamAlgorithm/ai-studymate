package extract

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
)

func TestIsPublicAddr(t *testing.T) {
	for addr, want := range map[string]bool{
		"8.8.8.8":          true,
		"142.250.80.46":    true,
		"2606:4700::1111":  true,
		"127.0.0.1":        false,
		"10.1.2.3":         false,
		"172.16.0.1":       false,
		"192.168.1.1":      false,
		"169.254.169.254":  false, // cloud metadata server
		"100.64.0.1":       false,
		"0.0.0.0":          false,
		"::1":              false,
		"fe80::1":          false,
		"fd00::1":          false,
		"::ffff:127.0.0.1": false,
	} {
		if got := IsPublicAddr(netip.MustParseAddr(addr)); got != want {
			t.Errorf("IsPublicAddr(%s) = %v, want %v", addr, got, want)
		}
	}
}

func TestValidateURL(t *testing.T) {
	for _, bad := range []string{"file:///etc/passwd", "gopher://x", "javascript:alert(1)", "/relative", "http://"} {
		if _, err := ValidateURL(bad); err == nil {
			t.Errorf("ValidateURL(%q) should fail", bad)
		}
	}
	if _, err := ValidateURL("https://en.wikipedia.org/wiki/Entropy"); err != nil {
		t.Errorf("valid URL rejected: %v", err)
	}
}

func TestURLBlocksLocalTargets(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("<html><body><p>internal secret page content here</p></body></html>"))
	}))
	defer srv.Close()

	_, err := URL(context.Background(), srv.URL)
	if !errors.Is(err, ErrBlockedAddress) {
		t.Fatalf("expected local server to be blocked, got %v", err)
	}
}

func TestTruncateKeepsUTF8Valid(t *testing.T) {
	s := strings.Repeat("é", 10) // 2 bytes each
	got := Truncate(s, 5)
	if !strings.HasPrefix(got, "éé") || strings.Contains(got, "�") {
		t.Errorf("Truncate split a rune: %q", got)
	}
	if Truncate("short", 100) != "short" {
		t.Error("short strings must be unchanged")
	}
}

func TestPDFRejectsGarbage(t *testing.T) {
	if _, err := PDF([]byte("not a pdf")); err == nil {
		t.Error("expected error for non-PDF input")
	}
}
