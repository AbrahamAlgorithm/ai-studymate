package static

import (
	"bytes"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func Exists(dir string) bool {
	info, err := os.Stat(filepath.Join(dir, "index.html"))
	return err == nil && !info.IsDir()
}

// real files get served as is, anything else gets index.html so routes like /chat work on refresh.
// head goes into index.html's <head>, that's how the browser gets its firebase settings without them being in the repo
func SPA(dir, head string) gin.HandlerFunc {
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

		// http.Dir already blocks ".." so this can't leave the folder
		clean := path.Clean("/" + p)
		if f, err := root.Open(clean); err == nil {
			info, statErr := f.Stat()
			f.Close()
			if statErr == nil && !info.IsDir() {
				if strings.HasPrefix(clean, "/assets/") {
					// vite hashes these filenames, so cache them forever
					c.Header("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					c.Header("Cache-Control", "public, max-age=3600")
				}
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
		}

		// never cache index.html or people won't see new deploys
		serveIndex(c, root, head)
	}
}

func serveIndex(c *gin.Context, root http.FileSystem, head string) {
	f, err := root.Open("/index.html")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	defer f.Close()
	page, err := io.ReadAll(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "unavailable"})
		return
	}
	if head != "" {
		page = bytes.Replace(page, []byte("</head>"), []byte(head+"</head>"), 1)
	}
	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", page)
}
