package extract

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/ledongthuc/pdf"
)

const MaxDocumentChars = 150000

func PDF(data []byte) (text string, err error) {
	// the pdf lib panics on some broken files, treat that as no text
	defer func() {
		if r := recover(); r != nil {
			text, err = "", fmt.Errorf("unreadable pdf: %v", r)
		}
	}()

	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("open pdf: %w", err)
	}

	var sb strings.Builder
	for i := 1; i <= r.NumPage(); i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		pageText, err := page.GetPlainText(nil)
		if err != nil {
			continue // one bad page shouldn't kill the whole document
		}
		sb.WriteString(pageText)
		sb.WriteString("\n")
		if sb.Len() > MaxDocumentChars {
			break
		}
	}

	result := strings.TrimSpace(sb.String())
	if result == "" {
		return "", fmt.Errorf("pdf appears to be empty or scanned (no extractable text)")
	}
	return Truncate(result, MaxDocumentChars), nil
}
