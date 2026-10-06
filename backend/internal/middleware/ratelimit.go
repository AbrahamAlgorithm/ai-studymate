package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter limits requests per authenticated user. State is in-memory,
// so on Cloud Run the limit applies per instance — enough to stop a single
// account from burning through the AI quota.
type RateLimiter struct {
	mu       sync.Mutex
	limiters map[string]*userLimiter
	limit    rate.Limit
	burst    int
}

type userLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter allows perMinute requests per user per minute, with bursts up to burst.
func NewRateLimiter(perMinute, burst int) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*userLimiter),
		limit:    rate.Limit(float64(perMinute) / 60.0),
		burst:    burst,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	ul, ok := rl.limiters[key]
	if !ok {
		ul = &userLimiter{limiter: rate.NewLimiter(rl.limit, rl.burst)}
		rl.limiters[key] = ul
	}
	ul.lastSeen = time.Now()
	return ul.limiter.Allow()
}

func (rl *RateLimiter) cleanup() {
	for range time.Tick(5 * time.Minute) {
		rl.mu.Lock()
		for k, ul := range rl.limiters {
			if time.Since(ul.lastSeen) > 10*time.Minute {
				delete(rl.limiters, k)
			}
		}
		rl.mu.Unlock()
	}
}

// Middleware must run after Auth so the user ID is available.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetString(CtxUID)
		if key == "" {
			key = "ip:" + c.ClientIP()
		}
		if !rl.allow(key) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "You're sending requests too quickly. Please wait a moment and try again.",
			})
			return
		}
		c.Next()
	}
}
