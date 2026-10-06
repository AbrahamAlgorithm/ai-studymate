package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

const (
	CtxUID   = "uid"
	CtxEmail = "email"
)

// TokenVerifier verifies Firebase ID tokens (satisfied by *auth.Client).
type TokenVerifier interface {
	VerifyIDToken(ctx context.Context, idToken string) (*firebaseauth.Token, error)
}

// Auth returns a Gin middleware that verifies Firebase ID tokens.
func Auth(verifier TokenVerifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		scheme, token, ok := strings.Cut(header, " ")
		if !ok || !strings.EqualFold(scheme, "Bearer") || strings.TrimSpace(token) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Please sign in to continue."})
			return
		}

		verified, err := verifier.VerifyIDToken(c.Request.Context(), strings.TrimSpace(token))
		if err != nil {
			log.Printf("[auth] token rejected: %v", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Your session has expired. Please sign in again."})
			return
		}

		c.Set(CtxUID, verified.UID)
		if email, ok := verified.Claims["email"].(string); ok {
			c.Set(CtxEmail, email)
		}
		c.Next()
	}
}
