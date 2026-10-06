import { useState, useContext, useRef, useEffect } from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import { useNavigate } from 'react-router-dom'

const MODE_ICONS = {
    ask: assets.message_icon,
    handout: assets.gallery_icon,
    youtube: assets.youtube_icon,
    quiz: assets.bulb_icon,
}

const THEME_OPTIONS = [
    { value: 'system', label: 'System' },
    { value: 'light',  label: 'Light'  },
    { value: 'dark',   label: 'Dark'   },
]

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate()
    const [extended, setExtended] = useState(false)
    const [themePickerOpen, setThemePickerOpen] = useState(false)
    const themePickerRef = useRef(null)

    const {
        sessions, activeSessionId, newChat, themeMode, themePreference, setThemePreference,
        loading, openSession, logout, currentUser,
    } = useContext(Context)

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760
    const showExpanded = extended || (isOpen && isMobile)

    // Close picker when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (themePickerRef.current && !themePickerRef.current.contains(e.target)) {
                setThemePickerOpen(false)
            }
        }
        if (themePickerOpen) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [themePickerOpen])

    const closeOnMobile = () => {
        if (isMobile && onClose) onClose()
    }

    const loadSession = (sessionId) => {
        if (loading) return
        openSession(sessionId)
        closeOnMobile()
    }

    const formatPreview = (title) => {
        if (!title) return 'Untitled session'
        const clean = title.trim()
        return clean.length > 30 ? `${clean.slice(0, 30)}...` : clean
    }

    const handleNewChat = () => {
        newChat()
        closeOnMobile()
    }

    const sidebarClass = [
        'sidebar',
        themeMode === 'light' ? 'sidebar-light' : 'sidebar-dark',
        isOpen ? 'sidebar-open' : '',
    ].filter(Boolean).join(' ')

    return (
        <>
            {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

            <div className={sidebarClass}>
                <div className="top">
                    <div className="sidebar-brand">
                        <button
                            type="button"
                            className="sidebar-icon-btn"
                            onClick={() => setExtended(prev => !prev)}
                            title={extended ? 'Collapse sidebar' : 'Expand sidebar'}
                            aria-label={extended ? 'Collapse sidebar' : 'Expand sidebar'}
                        >
                            <img className="menu ui-icon" src={assets.menu_icon} alt="" />
                        </button>
                        {showExpanded && (
                            <div className="brand-meta">
                                <p>StudyMate</p>
                                <span>{currentUser?.email || 'Guest user'}</span>
                            </div>
                        )}
                    </div>

                    <div onClick={handleNewChat} className="new-chat" title="New study session" role="button" tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleNewChat()}>
                        <img className="ui-icon" src={assets.plus_icon} alt="" />
                        {showExpanded && <p>New Study</p>}
                    </div>

                    {showExpanded && (
                        <div className="recent">
                            <p className="recent-title">Recent Sessions</p>
                            {sessions.length === 0 && (
                                <p className="recent-empty">No sessions yet.</p>
                            )}
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSession(session.id)}
                                    className={`recent-entry${session.id === activeSessionId ? ' recent-active' : ''}`}
                                    title={session.title}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && loadSession(session.id)}
                                >
                                    <img
                                        className={`ui-icon${session.mode === 'youtube' ? ' no-filter' : ''}`}
                                        src={MODE_ICONS[session.mode] || assets.message_icon}
                                        alt=""
                                    />
                                    <p>{formatPreview(session.title)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bottom">
                    <div
                        className="bottom-item recent-entry"
                        onClick={() => navigate('/progress')}
                        onKeyDown={(e) => e.key === 'Enter' && navigate('/progress')}
                        title="Your progress"
                        role="button"
                        tabIndex={0}
                    >
                        <img className="ui-icon" src={assets.history_icon} alt="" />
                        {showExpanded && <p>Progress</p>}
                    </div>

                    <div
                        className="bottom-item recent-entry"
                        onClick={() => navigate('/learning-tips')}
                        onKeyDown={(e) => e.key === 'Enter' && navigate('/learning-tips')}
                        title="Study techniques"
                        role="button"
                        tabIndex={0}
                    >
                        <img className="ui-icon" src={assets.question_icon} alt="" />
                        {showExpanded && <p>Learning tips</p>}
                    </div>

                    {/* Theme picker */}
                    <div className="theme-picker-wrap" ref={themePickerRef}>
                        <div
                            className={`bottom-item recent-entry${themePickerOpen ? ' theme-row-active' : ''}`}
                            onClick={() => setThemePickerOpen(prev => !prev)}
                            title="Theme"
                        >
                            <img className="ui-icon" src={assets.setting_icon} alt="" />
                            {showExpanded && <p>Theme</p>}
                        </div>

                        {themePickerOpen && (
                            <div className="theme-picker-popup">
                                {THEME_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        className={`theme-option ${themePreference === opt.value ? 'theme-option-active' : ''}`}
                                        onClick={() => {
                                            setThemePreference(opt.value)
                                            setThemePickerOpen(false)
                                        }}
                                    >
                                        {opt.label}
                                        {themePreference === opt.value && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        className="bottom-item recent-entry"
                        title="Sign out"
                        onClick={async () => {
                            await logout()
                            navigate('/signin')
                        }}
                    >
                        <img className="ui-icon" src={assets.logout_icon} alt="" />
                        {showExpanded && <p>Sign out</p>}
                    </div>
                </div>
            </div>
        </>
    )
}

export default Sidebar
