package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

type fakeVerifier struct{}

func (fakeVerifier) VerifyIDToken(_ context.Context, token string) (*firebaseauth.Token, error) {
	if token != "good" {
		return nil, errors.New("bad token")
	}
	return &firebaseauth.Token{UID: "user-1", Claims: map[string]any{"email": "a@b.c"}}, nil
}

func newRouter(rl *RateLimiter) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	handlers := []gin.HandlerFunc{Auth(fakeVerifier{})}
	if rl != nil {
		handlers = append(handlers, rl.Middleware())
	}
	handlers = append(handlers, func(c *gin.Context) { c.String(http.StatusOK, c.GetString(CtxUID)) })
	r.GET("/x", handlers...)
	return r
}

func get(r http.Handler, auth string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestAuth(t *testing.T) {
	r := newRouter(nil)
	for header, want := range map[string]int{
		"":             http.StatusUnauthorized,
		"good":         http.StatusUnauthorized,
		"Basic good":   http.StatusUnauthorized,
		"Bearer ":      http.StatusUnauthorized,
		"Bearer wrong": http.StatusUnauthorized,
		"Bearer good":  http.StatusOK,
		"bearer good":  http.StatusOK,
	} {
		if w := get(r, header); w.Code != want {
			t.Errorf("Authorization %q: status = %d, want %d", header, w.Code, want)
		}
	}
	if w := get(r, "Bearer good"); w.Body.String() != "user-1" {
		t.Errorf("uid not set in context: %q", w.Body.String())
	}
}

func TestRateLimiter(t *testing.T) {
	r := newRouter(NewRateLimiter(1, 3))
	for i := 0; i < 3; i++ {
		if w := get(r, "Bearer good"); w.Code != http.StatusOK {
			t.Fatalf("request %d: status = %d", i, w.Code)
		}
	}
	if w := get(r, "Bearer good"); w.Code != http.StatusTooManyRequests {
		t.Fatalf("burst exceeded: status = %d, want 429", w.Code)
	}
}
