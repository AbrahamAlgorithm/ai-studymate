# StudyMate

**An AI study coach.** Ask questions and get step-by-step explanations, upload your handouts, learn from YouTube lessons, and test yourself with interactive quizzes, all in one place.

<img src="docs/screenshot.png" alt="StudyMate explaining Newton's second law with a worked example" width="720">

## Features

| Mode | What it does |
|---|---|
| **Ask & Learn** | Multi-turn tutoring with Markdown and LaTeX maths. Paste an article link and StudyMate reads the page before answering. |
| **Handout Analyzer** | Upload a PDF, image, or `.txt`/`.md` notes (up to 10 MB). Text is pulled out on the server, and scanned PDFs or photos go straight to Gemini. |
| **YouTube Tutor** | Paste a video link to load its title, chapters and transcript (no YouTube API key needed). Ask things like *"what happens at 12:30?"* and the answer focuses on that part of the video. |
| **Quiz Generator** | Builds multiple-choice and theory quizzes on a topic or from a source link, with instant feedback, model answers, explanations and a score. |

There's also saved study sessions per user, a progress page (streak, weekly activity, quiz average), voice dictation, light/dark/system themes, email and Google sign-in, and a mobile-first layout.

<img src="docs/quiz.png" alt="Interactive quiz with instant feedback" width="720">

## How it works

```
Browser (React + Vite)
  │  Firebase Auth (sign-in)       Firestore (study history, per-user rules)
  │
  └── /api/*  ── Bearer <Firebase ID token> ──▶  Go API (Gin)
                                                  ├─ verifies the token
                                                  ├─ per-user rate limiting
                                                  ├─ PDF / web page / YouTube extraction
                                                  └─ Gemini, with retries and fallback models
```

- The Go server also serves the built React app, so it's one container on Cloud Run and the frontend and API share an origin.
- The Gemini key only lives on the server. The Firebase web config in `src/firebase.js` is public on purpose, the data is protected by [`firestore.rules`](firestore.rules).
- Answers stream in as they're written, so the first words show up in about a second.
- If the main model is overloaded or retired, requests fall back to the next model in the list instead of failing.
- YouTube transcripts come from the same player api the YouTube app uses. YouTube sometimes blocks that from cloud servers, in which case answers fall back to the video's title and description.

**Stack:** React 18, Vite, MUI, react-markdown + KaTeX · Go 1.26, Gin, Google Gen AI SDK · Firebase Auth + Firestore · Docker, Cloud Run, GitHub Actions.

## Getting started

You need Node 20+, Go 1.26+ and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/AbrahamAlgorithm/aistudymate.git
cd aistudymate
npm install

cp backend/.env.example backend/.env   # then add your GEMINI_API_KEY
npm run dev                            # Go API on :8080 and the app on http://localhost:5173
```

`npm run dev` starts both. Use `npm run dev:api` or `npm run dev:web` to run just one of them.

### Environment variables (`backend/.env`)

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | |
| `FIREBASE_PROJECT_ID` | yes | Used to verify users' ID tokens, no service account needed. |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.5-flash`. |
| `GEMINI_FALLBACK_MODELS` | no | Comma separated, tried in order when the main model is busy. Defaults to `gemini-3.5-flash-lite,gemini-3.8-flash`. |
| `GEMINI_THINKING` | no | `minimal`, `low`, `medium` or `high`. Defaults to `minimal`, more thinking means slower answers. |
| `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_BURST` | no | Per-user AI request limits, 20 a minute with bursts of 10 by default. |

### Checks

```bash
npm run lint
npm run build
npm run test:api
cd backend && go test ./internal/... -run Live -v   # calls Gemini for real, needs GEMINI_API_KEY exported
cd backend && YOUTUBE_LIVE=1 go test ./internal/youtube -run Live -v   # fetches a real video and transcript
```

## Deployment

Pushing to `main` runs lint, build and the Go tests, then deploys to Cloud Run with `gcloud run deploy --source .` using the root `Dockerfile`.

The Gemini key isn't stored in GitHub. Set it once on the Cloud Run service with Secret Manager:

```bash
printf '%s' "YOUR_GEMINI_KEY" | gcloud secrets create gemini-api-key --data-file=- --project my-portfolio-492519
gcloud secrets add-iam-policy-binding gemini-api-key --project my-portfolio-492519 \
  --member "serviceAccount:$(gcloud projects describe my-portfolio-492519 --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role roles/secretmanager.secretAccessor
gcloud run services update studymate-nau --region us-central1 --project my-portfolio-492519 \
  --update-secrets GEMINI_API_KEY=gemini-api-key:latest
```

Later deploys keep it. In the Firebase console you also need to:

- paste `firestore.rules` into Firestore > Rules and publish it
- enable **Google** under Authentication > Sign-in method, and add the Cloud Run domain under **Authorized domains**

## Project structure

```
src/
  api/client.js          calls to the Go API (adds the ID token)
  context/Context.jsx    auth, sessions, modes, history
  components/Main/       chat, markdown renderer, quiz, video card
backend/
  cmd/server/            entrypoint, routes, serves the built app
  internal/ai/           Gemini client, retries and model fallback
  internal/handlers/     chat, handout, youtube and quiz endpoints
  internal/extract/      PDF and web page text (blocks internal addresses)
  internal/youtube/      metadata, chapters, transcripts
  internal/middleware/   Firebase token auth, rate limiting
firestore.rules          who can read and write what
Dockerfile               one image with the React build and the Go server
```

## License

MIT, see [LICENSE](LICENSE).

## Contact

Abraham Folorunso, abrahamfolorunso6@gmail.com
