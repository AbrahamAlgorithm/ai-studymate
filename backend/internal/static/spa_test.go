package static

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSPA(t *testing.T) {
	dir := t.TempDir()
	must(t, os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html><head><title>app</title></head></html>"), 0o644))
	must(t, os.MkdirAll(filepath.Join(dir, "assets"), 0o755))
	must(t, os.WriteFile(filepath.Join(dir, "assets", "app-abc123.js"), []byte("console.log(1)"), 0o644))

	if !Exists(dir) || Exists(t.TempDir()) {
		t.Fatal("Exists is wrong")
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.NoRoute(SPA(dir, `<script>window.__FIREBASE_CONFIG__={"apiKey":"k"}</script>`))

	cases := []struct {
		path, wantBody, wantCache string
		wantCode                  int
	}{
		{"/", "window.__FIREBASE_CONFIG__", "no-cache", 200},
		{"/chat", `{"apiKey":"k"}</script></head>`, "no-cache", 200},
		{"/assets/app-abc123.js", "console.log(1)", "immutable", 200},
		{"/../../etc/passwd", "<head>", "no-cache", 200},
		{"/api/nope", `"not found"`, "", 404},
	}
	for _, tc := range cases {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tc.path, nil))
		if w.Code != tc.wantCode || !strings.Contains(w.Body.String(), tc.wantBody) {
			t.Errorf("%s: %d %q", tc.path, w.Code, w.Body.String())
		}
		if tc.wantCache != "" && !strings.Contains(w.Header().Get("Cache-Control"), tc.wantCache) {
			t.Errorf("%s: Cache-Control = %q", tc.path, w.Header().Get("Cache-Control"))
		}
	}
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}
