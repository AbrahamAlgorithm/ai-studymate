import { auth } from '../firebase'

// empty means same origin, vite proxies /api to the go server in dev
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const UNREACHABLE = import.meta.env.DEV
    ? "Can't reach the API. Make sure the Go server is running (npm run dev starts both)."
    : "Can't reach StudyMate right now. Check your connection and try again."

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

// reads the server-sent events from a streamed answer, onText gets the full text so far
const readStream = async (res, onText) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let text = ''
    for (;;) {
        let chunk
        try {
            chunk = await reader.read()
        } catch (err) {
            if (err.name === 'AbortError') throw err
            throw new ApiError('The answer got cut off. Please try again.', 0)
        }
        const { value, done } = chunk
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let end
        while ((end = buffer.indexOf('\n\n')) >= 0) {
            const raw = buffer.slice(0, end)
            buffer = buffer.slice(end + 2)
            const event = raw.match(/^event: (.*)$/m)?.[1]
            const data = JSON.parse(raw.match(/^data: (.*)$/m)?.[1] || '{}')
            if (event === 'chunk') {
                text += data.text
                onText(text)
            } else if (event === 'reset') {
                // the model died halfway and another one is starting over
                text = ''
                onText(text)
            } else if (event === 'error') {
                throw new ApiError(data.error, 502)
            } else if (event === 'done') {
                return { response: text, model: data.model }
            }
        }
    }
    throw new ApiError('The answer got cut off. Please try again.', 502)
}

const request = async (path, { json, formData, signal, onText } = {}) => {
    const headers = await authHeader()
    if (onText) headers.Accept = 'text/event-stream'
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
        throw new ApiError(UNREACHABLE, 0)
    }

    if (res.ok && onText && res.headers.get('Content-Type')?.includes('text/event-stream')) {
        return readStream(res, onText)
    }

    const data = await res.json().catch(() => null)
    if (res.ok && data) return data
    if (data?.error) throw new ApiError(data.error, res.status)
    // no json body means our server never answered, e.g. the vite proxy couldn't connect
    if (res.status >= 500) throw new ApiError(UNREACHABLE, res.status)
    throw new ApiError('Something went wrong. Please try again.', res.status)
}

export const chat = ({ message, history, mode }, opts) =>
    request('/api/chat', { json: { message, history, mode }, ...opts })

export const analyzeHandout = ({ file, question, mode }, opts) => {
    const formData = new FormData()
    formData.append('file', file)
    if (question) formData.append('question', question)
    if (mode) formData.append('mode', mode)
    return request('/api/handout', { formData, ...opts })
}

export const youtubeInfo = (url, opts) =>
    request('/api/youtube/info', { json: { url }, ...opts })

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
