package main

import (
	"context"
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
	// Local development convenience; in production, env vars come from Cloud Run.
	_ = godotenv.Load()

	ctx := context.Background()

	// ── AI providers ──────────────────────────────────────────────────────────
	geminiProvider, err := ai.NewGemini(ctx, os.Getenv("GEMINI_API_KEY"), os.Getenv("GEMINI_MODEL"))
	if err != nil {
		log.Fatalf("init gemini: %v", err)
	}
	openaiProvider := ai.NewOpenAI(os.Getenv("OPENAI_API_KEY"), os.Getenv("OPENAI_MODEL"))

	router := ai.NewRouter(geminiProvider, openaiProvider) // Gemini preferred
	log.Printf("AI provider: %s", router.ActiveProvider())
	if router.ActiveProvider() == "none" {
		log.Printf("WARNING: no AI provider configured — set GEMINI_API_KEY or OPENAI_API_KEY")
	}

	// ── Firebase Admin SDK (only used to verify ID tokens) ───────────────────
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		log.Fatal("FIREBASE_PROJECT_ID is required")
	}
	var firebaseOpts []option.ClientOption
	switch {
	case os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON") != "":
		firebaseOpts = append(firebaseOpts, option.WithCredentialsJSON([]byte(os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))))
	case os.Getenv("GOOGLE_APPLICATION_CREDENTIALS") != "":
		// Picked up automatically as Application Default Credentials.
	default:
		// Verifying ID tokens only needs Google's public signing keys and the
		// project ID, so don't require credentials (otherwise startup fails
		// anywhere without ADC, e.g. a fresh clone or a plain Docker run).
		firebaseOpts = append(firebaseOpts, option.WithoutAuthentication())
	}

	fbApp, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID}, firebaseOpts...)
	if err != nil {
		log.Fatalf("init firebase: %v", err)
	}
	authClient, err := fbApp.Auth(ctx)
	if err != nil {
		log.Fatalf("init firebase auth: %v", err)
	}

	// ── Handlers ──────────────────────────────────────────────────────────────
	h := handlers.New(router, os.Getenv("YOUTUBE_API_KEY"))
	limiter := middleware.NewRateLimiter(envInt("RATE_LIMIT_PER_MINUTE", 20), envInt("RATE_LIMIT_BURST", 10))

	// ── Gin ───────────────────────────────────────────────────────────────────
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), securityHeaders())
	_ = r.SetTrustedProxies(nil) // Cloud Run's front end sets X-Forwarded-For; don't trust it for ClientIP

	// CORS is only needed when the frontend runs on a different origin
	// (e.g. Vite without its /api proxy). In production the API and the app
	// share an origin.
	r.Use(cors.New(cors.Config{
		AllowOrigins:  allowedOrigins(),
		AllowMethods:  []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders: []string{"Content-Length"},
		MaxAge:        12 * time.Hour,
	}))

	// ── Routes ────────────────────────────────────────────────────────────────
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "provider": router.ActiveProvider()})
	})

	api := r.Group("/api", middleware.Auth(authClient), limiter.Middleware(), requestTimeout(2*time.Minute))
	{
		json := api.Group("", handlers.LimitJSONBody())
		json.POST("/chat", h.Chat)
		json.POST("/youtube/info", h.YoutubeInfo)
		json.POST("/youtube/ask", h.YoutubeAsk)
		json.POST("/quiz", h.Quiz)

		api.POST("/handout", h.Handout) // multipart; enforces its own size limit
	}

	// Serve the built React app (single container deploy). Skipped when the
	// directory doesn't exist, e.g. local dev where Vite serves the frontend.
	staticDir := envOr("STATIC_DIR", "./web")
	if static.Exists(staticDir) {
		log.Printf("serving frontend from %s", staticDir)
		r.NoRoute(static.SPA(staticDir))
	} else {
		r.NoRoute(func(c *gin.Context) { c.JSON(http.StatusNotFound, gin.H{"error": "not found"}) })
	}

	// ── Listen ────────────────────────────────────────────────────────────────
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

	// Cloud Run sends SIGTERM before stopping an instance; finish in-flight requests.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Print("shutting down…")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
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
