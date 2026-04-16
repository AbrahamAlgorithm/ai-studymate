import React, { useContext, useMemo, useRef, useState } from 'react'
import './Main.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'

const Main = () => {
    const { onSent, recentPrompt, showResult, loading, resultData, setInput, input, themeMode, currentUser } = useContext(Context)
    const [activeMode, setActiveMode] = useState('ask')
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const fileInputRef = useRef(null)

    const modeOptions = [
        { id: 'ask', label: 'Ask & Learn', icon: assets.message_icon },
        { id: 'handout', label: 'Handout Analyzer', icon: assets.gallery_icon },
        { id: 'youtube', label: 'YouTube Tutor', icon: assets.youtube_icon, preserveColor: true },
        { id: 'quiz', label: 'Quiz Generator', icon: assets.bulb_icon },
    ]

    const starterPrompts = useMemo(() => ({
        ask: [
            'Teach me Newton\'s second law like I am 15, then give 3 practical examples.',
            'Explain entropy in simple terms, then summarize in 5 bullet points.',
            'Break down matrix multiplication with one worked example and a short quiz.'
        ],
        handout: [
            'Analyze this handout and explain the topic in beginner-friendly language.',
            'Summarize this material into key ideas I can revise quickly.',
            'Create 5 MCQs and 2 theory questions from this handout.'
        ],
        youtube: [
            'Summarize this video by sections and include timestamps.',
            'Explain what happens at minute 12:30 in simpler words.',
            'Generate a quiz from this video with answers at the end.'
        ],
        quiz: [
            'Create a 10-question mixed quiz on thermodynamics.',
            'Generate beginner-to-advanced questions on SQL joins.',
            'Give me 5 theory questions on beam deflection with marking guide.'
        ]
    }), [])

    const modePlaceholders = {
        ask: 'Ask any question and get step-by-step explanations',
        handout: 'Paste handout notes or ask the AI to simplify your material',
        youtube: 'Paste a YouTube URL or ask for timestamp explanations',
        quiz: 'Request MCQs or theory quizzes on any topic',
    }

    const handleModeChange = (modeId) => {
        setActiveMode(modeId)
        if (modeId === 'youtube') {
            setInput('Summarize this YouTube video and create a short quiz:')
        } else if (modeId === 'handout') {
            setInput('Analyze this material, explain it simply, and summarize it:')
        } else if (modeId === 'quiz') {
            setInput('Generate a mixed quiz on this topic:')
        } else {
            setInput('')
        }
    }

    const sendPrompt = (promptText) => {
        const clean = (promptText || '').trim()
        if (!clean || loading) {
            return
        }
        onSent(clean)
    }

    const handleYoutubeAnalyze = () => {
        const cleanUrl = youtubeUrl.trim()
        if (!cleanUrl) {
            return
        }
        const prompt = `YouTube Study Mode:\nVideo URL: ${cleanUrl}\n1) Summarize by sections with timestamps\n2) Explain key concepts simply\n3) Create 5 MCQs + 2 theory questions from the video.`
        sendPrompt(prompt)
        setYoutubeUrl('')
    }

    const handlePickFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click()
        }
    }

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0]
        if (!selectedFile) {
            return
        }
        const prompt = `Handout Mode:\nI uploaded a file named "${selectedFile.name}". Please:\n1) Explain what the handout is about in simple language\n2) Summarize key points\n3) Generate 5 MCQs and 2 theory questions.`
        sendPrompt(prompt)
        event.target.value = ''
    }

    const currentStarters = starterPrompts[activeMode] || starterPrompts.ask
    const activeModeOption = modeOptions.find((m) => m.id === activeMode) || modeOptions[0]

    return (
        <div className={`main ${themeMode === 'light' ? 'main-light' : 'main-dark'}`}>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden-file"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
            />
            <div className="nav">
                <div className="nav-left">
                    <p>StudyMate AI</p>
                    <span className="nav-chip">Study Coach</span>
                </div>
                <div className="nav-right">
                    <div className="user-meta">
                        <p>{currentUser?.email || 'Guest user'}</p>
                    </div>
                    <img src={assets.user_icon} alt="User" />
                </div>
            </div>

            <div className="main-container">
                {!showResult ? (
                    <>
                        <div className="greet">
                            <p><span>Learn deeper, faster.</span></p>
                            <p>Ask, upload, summarize, and test your understanding.</p>
                        </div>

                        <div className="mode-switcher">
                            {modeOptions.map((mode) => (
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
                                <div className="youtube-inline">
                                    <input
                                        type="url"
                                        value={youtubeUrl}
                                        onChange={(e) => setYoutubeUrl(e.target.value)}
                                        placeholder="Paste YouTube link and click Analyze"
                                    />
                                    <button type="button" onClick={handleYoutubeAnalyze}>Analyze Video</button>
                                </div>
                            )}

                            {activeMode === 'handout' && (
                                <div className="upload-inline">
                                    <button type="button" onClick={handlePickFile}>Upload Handout / Image</button>
                                    <p>Upload support is prompt-assisted for now. Full file parsing can be connected next.</p>
                                </div>
                            )}
                        </div>

                        <div className="cards">
                            {currentStarters.map((prompt, index) => (
                                <button
                                    key={`${activeMode}-${index}`}
                                    type="button"
                                    className="card"
                                    onClick={() => sendPrompt(prompt)}
                                >
                                    <p>{prompt}</p>
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
                            <div className="chat-bubble user-bubble">
                                <p>{recentPrompt}</p>
                            </div>
                            <div className="chat-bubble ai-bubble">
                                {loading ? (
                                    <div className="loader">
                                        <hr />
                                        <hr />
                                        <hr />
                                    </div>
                                ) : (
                                    <p dangerouslySetInnerHTML={{ __html: resultData }}></p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="main-bottom">
                    <div className="search-box">
                        <input
                            onChange={(e) => setInput(e.target.value)}
                            value={input}
                            type="text"
                            placeholder={modePlaceholders[activeMode]}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && input.trim()) {
                                    sendPrompt(input)
                                }
                            }}
                        />
                        <div>
                            <img
                                className="ui-icon"
                                src={assets.gallery_icon}
                                alt="Upload"
                                title="Upload handout"
                                onClick={handlePickFile}
                            />
                            <img className="ui-icon" src={assets.mic_icon} alt="Voice" />
                            {input.trim() ? <img className="ui-icon" onClick={() => sendPrompt(input)} src={assets.send_icon} alt="Send" /> : null}
                        </div>
                    </div>
                    <p className="bottom-info">
                        Ask. Understand. Practice. Improve.
                    </p>
                </div>
            </div>
        </div>

    )
}

export default Main
