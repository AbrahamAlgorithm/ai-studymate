// Package static serves the built single-page app alongside the API.
package static

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// Exists reports whether dir contains a built app (an index.html).
func Exists(dir string) bool {
	info, err := os.Stat(filepath.Join(dir, "index.html"))
	return err == nil && !info.IsDir()
}

// SPA serves files from dir, falling back to index.html for client-side
// routes such as /chat. Unknown /api paths get a JSON 404 instead.
func SPA(dir string) gin.HandlerFunc {
	root := http.Dir(dir)
	fileServer := http.FileServer(root)

	return func(c *gin.Context) {
		p := c.Request.URL.Path
		if strings.HasPrefix(p, "/api/") || p == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.JSON(http.StatusMethodNotAllowed, gin.H{"error": "method not allowed"})
			return
		}

		// http.Dir rejects ".." traversal; path.Clean normalises the lookup.
		clean := path.Clean("/" + p)
		if f, err := root.Open(clean); err == nil {
			info, statErr := f.Stat()
			f.Close()
			if statErr == nil && !info.IsDir() {
				if strings.HasPrefix(clean, "/assets/") {
					// Vite fingerprints these filenames, so they can be cached forever.
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					c.Header("Cache-Control", "public, max-age=3600")
				}
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}

		// Client-side route: always serve a fresh index.html so deploys show up immediately.
		serveIndex(c, root)
	}
}

func serveIndex(c *gin.Context, root http.FileSystem) {
	f, err := root.Open("/index.html")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unavailable"})
		return
	}
	c.Header("Cache-Control", "no-cache")
	c.Header("Content-Type", "text/html; charset=utf-8")
	http.ServeContent(c.Writer, c.Request, "index.html", info.ModTime(), f)
}
