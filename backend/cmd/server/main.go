package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	firebase "firebase.google.com/go/v4"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"

	"studymate/backend/internal/ai"
	"studymate/backend/internal/handlers"
	"studymate/backend/internal/middleware"
	"studymate/backend/internal/static"
)

func main() {
	_ = godotenv.Load() // only matters locally, cloud run passes the real env vars

	ctx := context.Background()

	gemini, err := ai.NewGemini(ctx, ai.Config{
		APIKey:    os.Getenv("GEMINI_API_KEY"),
		Model:     os.Getenv("GEMINI_MODEL"),
		Fallbacks: fallbackModels(),
		Thinking:  os.Getenv("GEMINI_THINKING"),
	})
	if err != nil {
		log.Fatalf("init gemini: %v", err)
	}
	if gemini.Ready() {
		log.Printf("using %s, falls back to %v", gemini.Model(), fallbackModels())
	} else {
		log.Print("GEMINI_API_KEY is not set, AI requests will fail")
	}

	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		log.Fatal("FIREBASE_PROJECT_ID is required")
	}
	fbApp, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, firebaseOptions()...)
	if err != nil {
		log.Fatalf("init firebase: %v", err)
	}
	authClient, err := fbApp.Auth(ctx)
	if err != nil {
		log.Fatalf("init firebase auth: %v", err)
	}

	h := handlers.New(gemini)
	limiter := middleware.NewRateLimiter(envInt("RATE_LIMIT_PER_MINUTE", 20), envInt("RATE_LIMIT_BURST", 10))

	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), securityHeaders())
	_ = r.SetTrustedProxies(nil)

	// only needed when the frontend runs on another origin, prod is same origin
	r.Use(cors.New(cors.Config{
		AllowOrigins:  allowedOrigins(),
		AllowMethods:  []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders: []string{"Content-Length"},
		MaxAge:        12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		model := "none"
		if gemini.Ready() {
			model = gemini.Model()
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "model": model})
	})

	api := r.Group("/api", middleware.Auth(authClient), limiter.Middleware(), requestTimeout(2*time.Minute))
	{
		json := api.Group("", handlers.LimitJSONBody())
		json.POST("/chat", h.Chat)
		json.POST("/youtube/info", h.YoutubeInfo)
		json.POST("/youtube/ask", h.YoutubeAsk)
		json.POST("/quiz", h.Quiz)

		api.POST("/handout", h.Handout) // multipart, it checks its own size limit
	}

	staticDir := envOr("STATIC_DIR", "./web")
	if static.Exists(staticDir) {
		log.Printf("serving frontend from %s", staticDir)
		r.NoRoute(static.SPA(staticDir, firebaseWebConfig(projectID)))
	} else {
		r.NoRoute(func(c *gin.Context) { c.JSON(http.StatusNotFound, gin.H{"error": "not found"}) })
	}

	srv := &http.Server{
		Addr:              ":" + envOr("PORT", "8080"),
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("StudyMate listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	// cloud run sends SIGTERM before it kills the instance, so finish what's in flight
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Print("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

func firebaseOptions() []option.ClientOption {
	if saJSON := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON"); saJSON != "" {
		return []option.ClientOption{option.WithCredentialsJSON([]byte(saJSON))}
	}
	if os.Getenv("GOOGLE_APPLICATION_CREDENTIALS") != "" {
		return nil
	}
	// verifying id tokens only needs google's public keys, no credentials
	return []option.ClientOption{option.WithoutAuthentication()}
}

// the browser's firebase settings, handed over in index.html so they never have to be committed.
// the key is restricted to studymate's domains and to auth + firestore, so seeing it in the page is fine
func firebaseWebConfig(projectID string) string {
	apiKey := os.Getenv("FIREBASE_WEB_API_KEY")
	if apiKey == "" {
		log.Print("FIREBASE_WEB_API_KEY is not set, nobody will be able to sign in on the web app")
		return ""
	}
	config, _ := json.Marshal(map[string]string{
		"apiKey":     apiKey,
		"authDomain": projectID + ".firebaseapp.com",
		"projectId":  projectID,
	})
	return "<script>window.__FIREBASE_CONFIG__=" + string(config) + "</script>"
}

func fallbackModels() []string {
	raw := os.Getenv("GEMINI_FALLBACK_MODELS")
	if raw == "" {
		return ai.DefaultFallbacks
	}
	var models []string
	for _, m := range strings.Split(raw, ",") {
		if m = strings.TrimSpace(m); m != "" {
			models = append(models, m)
		}
	}
	return models
}

func allowedOrigins() []string {
	origins := []string{"http://localhost:5173", "http://localhost:4173"}
	for _, o := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}

func requestTimeout(d time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), d)
		defer cancel()
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		hdr := c.Writer.Header()
		hdr.Set("X-Content-Type-Options", "nosniff")
		hdr.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		hdr.Set("X-Frame-Options", "SAMEORIGIN")
		c.Next()
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if n, err := strconv.Atoi(os.Getenv(key)); err == nil && n > 0 {
		return n
	}
	return fallback
}
