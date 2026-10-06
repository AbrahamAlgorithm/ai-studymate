import { useContext, useEffect, useRef, useState } from 'react'
import './Main.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import { ACCEPTED_UPLOADS, MAX_UPLOAD_BYTES } from '../../api/client'
import useSpeechRecognition from '../../hooks/useSpeechRecognition'
import MessageContent from './MessageContent'
import QuizView from './QuizView'
import VideoCard from './VideoCard'

const MODE_OPTIONS = [
    { id: 'ask', label: 'Ask & Learn', icon: assets.message_icon },
    { id: 'handout', label: 'Handout Analyzer', icon: assets.gallery_icon },
    { id: 'youtube', label: 'YouTube Tutor', icon: assets.youtube_icon, preserveColor: true },
    { id: 'quiz', label: 'Quiz Generator', icon: assets.bulb_icon },
]

const STARTER_PROMPTS = {
    ask: [
        'Teach me Newton\'s second law like I am 15, then give 3 practical examples.',
        'Explain entropy in simple terms, then summarize in 5 bullet points.',
        'Break down matrix multiplication with one worked example and a short quiz.',
    ],
    handout: [
        'Explain this handout in beginner-friendly language.',
        'Summarize this material into key ideas I can revise quickly.',
        'Create 5 MCQs and 2 theory questions from this handout, with answers.',
    ],
    youtube: [
        'Summarize this video by sections and include timestamps.',
        'Explain what happens at 12:30 in simpler words.',
        'What are the 3 most important ideas in this video?',
    ],
    quiz: [
        'Thermodynamics: first and second laws',
        'SQL joins, from beginner to advanced',
        'Beam deflection and bending moments',
    ],
}

const MODE_PLACEHOLDERS = {
    ask: 'Ask any question, or paste an article link to discuss it',
    handout: 'Attach a handout, then ask what you want to know',
    quiz: 'What topic should the quiz cover?',
}

const PENDING_LABELS = {
    ask: 'Thinking…',
    handout: 'Reading your material…',
    youtube: 'Watching the video…',
    quiz: 'Writing your quiz…',
}

const getInitials = (user) => {
    if (!user) return '?'
    if (user.displayName) {
        const parts = user.displayName.trim().split(/\s+/).filter(Boolean)
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return parts[0].slice(0, 2).toUpperCase()
    }
    if (user.email) {
        const raw = user.email.split('@')[0].replace(/\d+$/, '')
        return raw.slice(0, 2).toUpperCase()
    }
    return '?'
}

const getFirstName = (user) => {
    if (user?.displayName) return user.displayName.split(' ')[0]
    if (user?.email) {
        const prefix = user.email.split('@')[0]
        return prefix.replace(/[^a-zA-Z].*$/, '').replace(/^./, (c) => c.toUpperCase()) || 'there'
    }
    return 'there'
}

const formatBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`)

const Main = ({ onOpenSidebar }) => {
    const {
        onSent, stopGenerating, loading, setInput, input, themeMode, currentUser,
        thread, activeMode, changeMode, activeVideo, quizOptions, setQuizOptions,
        newChat, recordQuizScore,
    } = useContext(Context)

    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [attachedFile, setAttachedFile] = useState(null)
    const [fileError, setFileError] = useState('')
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)
    const mainRef = useRef(null)
    const containerRef = useRef(null)
    const touchStartX = useRef(null)
    const touchStartYRef = useRef(null)

    const speech = useSpeechRecognition((text) => setInput((prev) => (prev ? `${prev} ${text}` : text)))

    const showThread = thread.length > 0

    // grow the textarea up to 5 rows
    useEffect(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.style.height = 'auto'
        const lineHeight = parseInt(getComputedStyle(ta).lineHeight, 10) || 22
        const maxHeight = lineHeight * 5 + 16
        ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px'
    }, [input])

    useEffect(() => {
        const el = containerRef.current
        if (el && showThread) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }, [thread.length, showThread])

    // follow the answer while it streams, unless they've scrolled up to read
    const streamedLength = thread[thread.length - 1]?.response?.length || 0
    useEffect(() => {
        const el = containerRef.current
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight
    }, [streamedLength])

    // ios safari scrolls the body when an input gets focus, freezing it on mount is the only thing that stops it
    useEffect(() => {
        if (window.innerWidth > 760) return
        const body = document.body
        body.style.position = 'fixed'
        body.style.top = '0'
        body.style.left = '0'
        body.style.right = '0'
        body.style.overflow = 'hidden'
        return () => {
            body.style.position = ''
            body.style.top = ''
            body.style.left = ''
            body.style.right = ''
            body.style.overflow = ''
        }
    }, [])

    // swipe in from the left edge to open the sidebar
    useEffect(() => {
        const el = mainRef.current
        if (!el) return

        const onTouchStart = (e) => {
            if (window.innerWidth > 760) return
            const touch = e.touches[0]
            if (touch.clientX >= 10 && touch.clientX <= 65) {
                touchStartX.current = touch.clientX
                touchStartYRef.current = touch.clientY
            } else {
                touchStartX.current = null
            }
        }

        // not passive so preventDefault can stop the ios back gesture
        const onTouchMove = (e) => {
            if (touchStartX.current === null) return
            const touch = e.touches[0]
            const dx = touch.clientX - touchStartX.current
            const dy = Math.abs(touch.clientY - touchStartYRef.current)
            if (dx > 8 && dx > dy) e.preventDefault()
        }

        const onTouchEnd = (e) => {
            if (touchStartX.current === null) return
            const touch = e.changedTouches[0]
            const dx = touch.clientX - touchStartX.current
            const dy = Math.abs(touch.clientY - (touchStartYRef.current ?? touch.clientY))
            if (dx > 60 && dx > dy * 1.5 && onOpenSidebar) onOpenSidebar()
            touchStartX.current = null
            touchStartYRef.current = null
        }

        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: false })
        el.addEventListener('touchend', onTouchEnd, { passive: true })
        return () => {
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', onTouchEnd)
        }
    }, [onOpenSidebar])

    const resetTextarea = () => {
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    const handleModeChange = (modeId) => {
        changeMode(modeId)
        setFileError('')
        if (modeId !== 'handout') setAttachedFile(null)
    }

    const sendPrompt = (promptText) => {
        const clean = (promptText || '').trim()
        if (loading) return
        if (!clean && !attachedFile && !(activeMode === 'quiz' && quizOptions.source.trim())) return
        const file = activeMode === 'handout' ? attachedFile : null
        setAttachedFile(null)
        setFileError('')
        resetTextarea()
        onSent(clean, { file })
    }

    const handleStarter = (prompt) => {
        const needsSource =
            (activeMode === 'handout' && !attachedFile) ||
            (activeMode === 'youtube' && !activeVideo && !youtubeUrl.trim())
        if (activeMode === 'youtube' && youtubeUrl.trim()) {
            sendPrompt(`${youtubeUrl.trim()} ${prompt}`)
            setYoutubeUrl('')
            return
        }
        if (needsSource) {
            setInput(prompt)
            if (activeMode === 'handout') fileInputRef.current?.click()
            return
        }
        sendPrompt(prompt)
    }

    const handleYoutubeAnalyze = () => {
        const cleanUrl = youtubeUrl.trim()
        if (!cleanUrl) return
        sendPrompt(`${cleanUrl} ${input}`.trim())
        setYoutubeUrl('')
    }

    const acceptFile = (file) => {
        if (!file) return
        if (file.size > MAX_UPLOAD_BYTES) {
            setFileError(`"${file.name}" is ${formatBytes(file.size)}. The limit is 10 MB.`)
            return
        }
        setFileError('')
        if (activeMode !== 'handout') changeMode('handout')
        setAttachedFile(file)
        textareaRef.current?.focus()
    }

    const handlePickFile = () => fileInputRef.current?.click()

    const handleFileChange = (event) => {
        acceptFile(event.target.files?.[0])
        event.target.value = ''
    }

    const handleDrop = (event) => {
        event.preventDefault()
        setDragging(false)
        acceptFile(event.dataTransfer.files?.[0])
    }

    const inQuizSession = activeMode === 'quiz' && thread.some((ex) => ex.quiz)
    const placeholder = activeMode === 'youtube'
        ? (activeVideo ? 'Ask about this video, like "what happens at 12:30?"' : 'Paste a YouTube link, optionally followed by your question')
        : inQuizSession
            ? 'Ask about this quiz, like "explain question 2"'
            : MODE_PLACEHOLDERS[activeMode]

    const canSend = !loading && (input.trim() || attachedFile || (activeMode === 'quiz' && quizOptions.source.trim()))
    const activeModeOption = MODE_OPTIONS.find((m) => m.id === activeMode) || MODE_OPTIONS[0]
    const userInitials = getInitials(currentUser)
    // same initials always get the same colour
    const avatarHue = ((userInitials.charCodeAt(0) || 0) * 37 + (userInitials.charCodeAt(1) || 0) * 17) % 360

    return (
        <div
            ref={mainRef}
            className={`main ${themeMode === 'light' ? 'main-light' : 'main-dark'}${dragging ? ' is-dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                className="hidden-file"
                onChange={handleFileChange}
                accept={ACCEPTED_UPLOADS}
            />

            <div className="nav">
                <div className="nav-left">
                    <button className="hamburger-btn" aria-label="Open menu" onClick={onOpenSidebar}>
                        <span /><span /><span />
                    </button>
                    <button type="button" className="nav-logo" onClick={newChat} title="Back to dashboard">
                        StudyMate AI
                    </button>
                    <span className="nav-chip">{activeModeOption.label}</span>
                </div>
                <div className="nav-right">
                    <div className="user-meta">
                        <p>{currentUser?.email || 'Guest user'}</p>
                    </div>
                    <div
                        className="user-avatar-initials"
                        style={{ background: `hsl(${avatarHue},55%,40%)` }}
                        title={currentUser?.email || 'User'}
                        aria-label={`User avatar: ${userInitials}`}
                    >
                        {userInitials}
                    </div>
                </div>
            </div>

            <div ref={containerRef} className={`main-container${!showThread ? ' dashboard-mode' : ''}`}>
                {!showThread ? (
                    <>
                        <div className="greet">
                            <p className="greet-hi">Hi {getFirstName(currentUser)},</p>
                            <p className="greet-main"><span>Where should we start?</span></p>
                            <p className="greet-sub">Ask, upload, summarize, and test your understanding.</p>
                        </div>

                        <div className="mode-switcher">
                            {MODE_OPTIONS.map((mode) => (
                                <button
                                    key={mode.id}
                                    type="button"
                                    className={`mode-pill ${activeMode === mode.id ? 'active' : ''}`}
                                    onClick={() => handleModeChange(mode.id)}
                                >
                                    <img className={`ui-icon ${mode.preserveColor ? 'no-filter' : ''}`} src={mode.icon} alt="" />
                                    {mode.label}
                                </button>
                            ))}
                        </div>

                        <div className="mode-panel">
                            {activeMode === 'youtube' && (
                                <form
                                    className="youtube-inline"
                                    onSubmit={(e) => { e.preventDefault(); handleYoutubeAnalyze() }}
                                >
                                    <input
                                        type="url"
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        placeholder="Paste a YouTube link"
                                    />
                                    <button type="submit" disabled={!youtubeUrl.trim() || loading}>Analyze video</button>
                                </form>
                            )}
                            {activeMode === 'handout' && (
                                <div className="upload-inline">
                                    <button type="button" onClick={handlePickFile}>
                                        {attachedFile ? 'Choose a different file' : 'Upload handout / image'}
                                    </button>
                                    <p>PDF, image, or .txt/.md notes up to 10 MB. You can also drag a file here.</p>
                                </div>
                            )}
                            {activeMode === 'quiz' && (
                                <div className="quiz-options-panel">
                                    <label>
                                        Questions
                                        <select
                                            value={quizOptions.count}
                                            onChange={(e) => setQuizOptions((o) => ({ ...o, count: Number(e.target.value) }))}
                                        >
                                            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    </label>
                                    <label>
                                        Difficulty
                                        <select
                                            value={quizOptions.difficulty}
                                            onChange={(e) => setQuizOptions((o) => ({ ...o, difficulty: e.target.value }))}
                                        >
                                            <option value="mixed">Mixed</option>
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </label>
                                    <label>
                                        Type
                                        <select
                                            value={quizOptions.type}
                                            onChange={(e) => setQuizOptions((o) => ({ ...o, type: e.target.value }))}
                                        >
                                            <option value="mixed">Mixed</option>
                                            <option value="mcq">Multiple choice</option>
                                            <option value="theory">Theory</option>
                                        </select>
                                    </label>
                                    <label className="quiz-source">
                                        Source (optional)
                                        <input
                                            type="text"
                                            value={quizOptions.source}
                                            onChange={(e) => setQuizOptions((o) => ({ ...o, source: e.target.value }))}
                                            placeholder="Article or YouTube link, or paste notes"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="cards">
                            {(STARTER_PROMPTS[activeMode] || STARTER_PROMPTS.ask).map((prompt, index) => (
                                <button
                                    key={`${activeMode}-${index}`}
                                    type="button"
                                    className="card"
                                    onClick={() => handleStarter(prompt)}
                                >
                                    <p>{activeMode === 'quiz' ? `Quiz me on: ${prompt}` : prompt}</p>
                                    <img
                                        className={`ui-icon ${activeModeOption.preserveColor ? 'no-filter' : ''}`}
                                        src={activeModeOption.icon || assets.message_icon}
                                        alt=""
                                    />
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="result">
                        <div className="chat-thread">
                            {thread.map((ex, i) => {
                                const showVideo = ex.video && ex.video.videoId !== thread[i - 1]?.video?.videoId
                                return (
                                    <div key={ex.id} className="exchange">
                                        <div className="chat-bubble user-bubble">
                                            {ex.attachment && (
                                                <span className="attachment-chip in-bubble">📎 {ex.attachment.name}</span>
                                            )}
                                            <p>{ex.prompt}</p>
                                        </div>
                                        <div className={`chat-bubble ai-bubble${ex.error ? ' error-bubble' : ''}${ex.status === 'streaming' ? ' streaming' : ''}`}>
                                            {showVideo && <VideoCard video={ex.video} />}
                                            {ex.status === 'pending' || (ex.status === 'streaming' && !ex.response) ? (
                                                <div className="pending">
                                                    <div className="thinking-dots"><span /><span /><span /></div>
                                                    <span className="pending-label">{PENDING_LABELS[ex.mode] || PENDING_LABELS.ask}</span>
                                                </div>
                                            ) : ex.error ? (
                                                <p className="error-text">{ex.response}</p>
                                            ) : ex.quiz ? (
                                                <QuizView
                                                    exchange={ex}
                                                    onScore={(score, total) => recordQuizScore(ex.id, score, total)}
                                                    onNewQuiz={newChat}
                                                />
                                            ) : ex.response ? (
                                                <MessageContent text={ex.response} />
                                            ) : (
                                                <p className="error-text">No saved response for this question.</p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* kept outside .main-container so focusing it on mobile can't scroll the content */}
            <div className="main-bottom">
                {(attachedFile || fileError) && (
                    <div className="attachment-row">
                        {attachedFile && (
                            <span className="attachment-chip">
                                📎 {attachedFile.name} · {formatBytes(attachedFile.size)}
                                <button type="button" aria-label="Remove file" onClick={() => setAttachedFile(null)}>×</button>
                            </span>
                        )}
                        {fileError && <span className="attachment-error">{fileError}</span>}
                    </div>
                )}
                <div className="search-box">
                    <textarea
                        ref={textareaRef}
                        onChange={(e) => setInput(e.target.value)}
                        value={input}
                        rows={1}
                        placeholder={placeholder}
                        aria-label="Message"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                if (canSend) sendPrompt(input)
                            }
                        }}
                    />
                    <div className="search-actions">
                        <button type="button" className="icon-btn" onClick={handlePickFile} title="Attach a handout (PDF, image, notes)" aria-label="Attach file">
                            <img className="ui-icon" src={assets.gallery_icon} alt="" />
                        </button>
                        {speech.supported && (
                            <button
                                type="button"
                                className={`icon-btn${speech.listening ? ' listening' : ''}`}
                                onClick={speech.listening ? speech.stop : speech.start}
                                title={speech.listening ? 'Stop dictation' : 'Dictate your question'}
                                aria-label={speech.listening ? 'Stop dictation' : 'Start dictation'}
                            >
                                <img className="ui-icon" src={assets.mic_icon} alt="" />
                            </button>
                        )}
                        {loading ? (
                            <button type="button" className="icon-btn stop-btn" onClick={stopGenerating} title="Stop" aria-label="Stop generating">
                                <span className="stop-square" />
                            </button>
                        ) : canSend ? (
                            <button type="button" className="icon-btn" onClick={() => sendPrompt(input)} title="Send" aria-label="Send">
                                <img className="ui-icon" src={assets.send_icon} alt="" />
                            </button>
                        ) : null}
                    </div>
                </div>
                <p className="bottom-info">StudyMate can make mistakes, so double-check important facts.</p>
            </div>
        </div>
    )
}

export default Main
