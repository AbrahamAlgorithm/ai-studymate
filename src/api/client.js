import { auth } from '../firebase'

// Same-origin in production (the Go server serves the app). In development,
// Vite proxies /api to the backend, so this stays empty unless overridden.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
    constructor(message, status) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

const authHeader = async () => {
    const user = auth.currentUser
    if (!user) throw new ApiError('Please sign in to continue.', 401)
    return { Authorization: `Bearer ${await user.getIdToken()}` }
}

const request = async (path, { json, formData, signal } = {}) => {
    const headers = await authHeader()
    let body
    if (json !== undefined) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(json)
    } else if (formData) {
        body = formData
    }

    let res
    try {
        res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body, signal })
    } catch (err) {
        if (err.name === 'AbortError') throw err
        throw new ApiError('Could not reach StudyMate. Check your connection and try again.', 0)
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new ApiError(data.error || `Something went wrong (HTTP ${res.status}). Please try again.`, res.status)
    }
    return data
}

/** Ask & Learn chat. history: [{role: 'user'|'assistant', content}] */
export const chat = ({ message, history, mode }, opts) =>
    request('/api/chat', { json: { message, history, mode }, ...opts })

/** Upload a handout (PDF, image, .txt/.md) with an optional question. */
export const analyzeHandout = ({ file, question, mode }, opts) => {
    const formData = new FormData()
    formData.append('file', file)
    if (question) formData.append('question', question)
    if (mode) formData.append('mode', mode)
    return request('/api/handout', { formData, ...opts })
}

/** Video metadata + transcript (when captions are available). */
export const youtubeInfo = (url, opts) =>
    request('/api/youtube/info', { json: { url }, ...opts })

/** Ask a question about a loaded video. */
export const youtubeAsk = ({ video, question, history }, opts) =>
    request('/api/youtube/ask', {
        json: {
            videoId: video.videoId,
            title: video.title,
            channel: video.channel,
            description: video.description,
            chapters: video.chapters || [],
            transcript: video.transcript || [],
            question,
            history,
        },
        ...opts,
    })

/** Generate a structured quiz. source: optional link (web page or YouTube) or pasted text. */
export const generateQuiz = ({ topic, count, difficulty, type, source }, opts) => {
    let context
    const cleanSource = (source || '').trim()
    if (cleanSource) {
        context = /^https?:\/\//i.test(cleanSource)
            ? { type: 'url', content: cleanSource }
            : { type: 'text', content: cleanSource }
    }
    return request('/api/quiz', { json: { topic, count, difficulty, type, context }, ...opts })
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ACCEPTED_UPLOADS = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md'
