import { useState, useContext, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import { useLocation, useNavigate } from 'react-router-dom'

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
    const { pathname } = useLocation()
    const [extended, setExtended] = useState(false)
    const [themePickerOpen, setThemePickerOpen] = useState(false)
    const [pickerSpot, setPickerSpot] = useState(null)
    const themePickerRef = useRef(null)
    const popupRef = useRef(null)

    const {
        sessions, activeSessionId, newChat, themeMode, themePreference, setThemePreference,
        loading, openSession, logout, currentUser, historyError,
    } = useContext(Context)

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760
    const showExpanded = extended || (isOpen && isMobile)

    // close the picker on outside click, the popup sits in a portal so it counts as inside too
    useEffect(() => {
        const handler = (e) => {
            if (!themePickerRef.current?.contains(e.target) && !popupRef.current?.contains(e.target)) {
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
        if (pathname !== '/chat') navigate('/chat')
        closeOnMobile()
    }

    const formatPreview = (title) => {
        if (!title) return 'Untitled session'
        const clean = title.trim()
        return clean.length > 30 ? `${clean.slice(0, 30)}...` : clean
    }

    const handleNewChat = () => {
        newChat()
        if (pathname !== '/chat') navigate('/chat')
        closeOnMobile()
    }

    const goTo = (path) => {
        navigate(path)
        closeOnMobile()
    }

    // the collapsed sidebar is too narrow for the menu, so it's placed on the page instead of inside the sidebar
    const toggleThemePicker = () => {
        if (!themePickerOpen && themePickerRef.current) {
            const r = themePickerRef.current.getBoundingClientRect()
            setPickerSpot({ left: r.left, bottom: window.innerHeight - r.top + 8 })
        }
        setThemePickerOpen((prev) => !prev)
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
                                <p className="recent-empty">
                                    {historyError ? "Couldn't load your history right now." : 'No sessions yet.'}
                                </p>
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
                        className={`bottom-item recent-entry${pathname === '/progress' ? ' recent-active' : ''}`}
                        onClick={() => goTo('/progress')}
                        onKeyDown={(e) => e.key === 'Enter' && goTo('/progress')}
                        title="Your progress"
                        role="button"
                        tabIndex={0}
                    >
                        <img className="ui-icon" src={assets.history_icon} alt="" />
                        {showExpanded && <p>Progress</p>}
                    </div>

                    <div
                        className={`bottom-item recent-entry${pathname === '/learning-tips' ? ' recent-active' : ''}`}
                        onClick={() => goTo('/learning-tips')}
                        onKeyDown={(e) => e.key === 'Enter' && goTo('/learning-tips')}
                        title="Study techniques"
                        role="button"
                        tabIndex={0}
                    >
                        <img className="ui-icon" src={assets.question_icon} alt="" />
                        {showExpanded && <p>Learning tips</p>}
                    </div>

                    <div className="theme-picker-wrap" ref={themePickerRef}>
                        <div
                            className={`bottom-item recent-entry${themePickerOpen ? ' theme-row-active' : ''}`}
                            onClick={toggleThemePicker}
                            title="Theme"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && toggleThemePicker()}
                        >
                            <img className="ui-icon" src={assets.setting_icon} alt="" />
                            {showExpanded && <p>Theme</p>}
                        </div>

                        {themePickerOpen && pickerSpot && createPortal(
                            <div className={themeMode === 'light' ? 'sidebar-light' : 'sidebar-dark'}>
                            <div className="theme-picker-popup" ref={popupRef} style={pickerSpot}>
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
                            </div>,
                            document.body
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
