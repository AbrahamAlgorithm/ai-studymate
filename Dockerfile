# One image: the Go API also serves the built React app, so the frontend and
# API share an origin in production (no CORS, no API URL to configure).

# ── 1. Frontend ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js eslint.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ── 2. Backend ───────────────────────────────────────────────────────────────
FROM golang:1.26-alpine AS api
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# ── 3. Runtime ───────────────────────────────────────────────────────────────
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata && adduser -D -H -u 10001 app
WORKDIR /app
COPY --from=api /server /app/server
COPY --from=web /app/dist /app/web
ENV STATIC_DIR=/app/web PORT=8080
USER app
EXPOSE 8080
CMD ["/app/server"]
