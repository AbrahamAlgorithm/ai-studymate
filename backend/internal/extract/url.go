package extract

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

const (
	maxPageBytes   = 3 << 20 // 3 MB of HTML is plenty for an article
	maxContentLen  = 12000   // keep AI prompts manageable
	minFragmentLen = 20      // skip tiny fragments like "Share" or "Menu"
)

// URLContent holds the extracted readable content from a web page.
type URLContent struct {
	Title   string
	Content string
}

// URL fetches a web page and returns its title and main readable text,
// stripping away navigation, footers, scripts, and ads. Only public http(s)
// destinations are allowed.
func URL(ctx context.Context, rawURL string) (*URLContent, error) {
	u, err := ValidateURL(rawURL)
	if err != nil {
		return nil, err
	}
	req, err := newRequest(ctx, u)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := SafeClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch url: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d fetching %s", resp.StatusCode, u.Host)
	}
	if ct := resp.Header.Get("Content-Type"); ct != "" && !strings.Contains(ct, "html") {
		return nil, fmt.Errorf("unsupported content type %q (expected an HTML page)", ct)
	}

	doc, err := goquery.NewDocumentFromReader(io.LimitReader(resp.Body, maxPageBytes))
	if err != nil {
		return nil, fmt.Errorf("parse html: %w", err)
	}

	// Remove boilerplate elements.
	doc.Find("script, style, noscript, nav, header, footer, aside, form, .ad, .ads, .advertisement, .sidebar, .menu, .cookie-banner").Remove()

	title := strings.TrimSpace(doc.Find("title").First().Text())

	// Prefer <article> or <main>, fall back to <body>.
	var contentSel *goquery.Selection
	if doc.Find("article").Length() > 0 {
		contentSel = doc.Find("article").First()
	} else if doc.Find("main").Length() > 0 {
		contentSel = doc.Find("main").First()
	} else {
		contentSel = doc.Find("body")
	}

	// Collect paragraph text.
	var parts []string
	contentSel.Find("p, h1, h2, h3, h4, li, pre").Each(func(_ int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if len(text) > minFragmentLen {
			parts = append(parts, text)
		}
	})

	content := strings.Join(parts, "\n")
	if content == "" {
		// Last resort: all text nodes.
		content = strings.Join(strings.Fields(contentSel.Text()), " ")
	}
	if content == "" {
		return nil, fmt.Errorf("no readable text found on the page")
	}

	return &URLContent{Title: title, Content: Truncate(content, maxContentLen)}, nil
}

// Truncate shortens s to at most n bytes without splitting a UTF-8 character.
func Truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for n > 0 && !isRuneStart(s[n]) {
		n--
	}
	return s[:n] + "...[truncated]"
}

func isRuneStart(b byte) bool { return b&0xC0 != 0x80 }
