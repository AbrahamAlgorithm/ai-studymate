import React, { useState, useContext } from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import { useNavigate } from 'react-router-dom'

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate()
    const [extended, setExtended] = useState(false)
    const { prevPrompts, newChat, themeMode, toggleTheme, loading, openHistoryItem, logout, currentUser } = useContext(Context)

    // On mobile, always show expanded content when the drawer is open
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760
    const showExpanded = extended || (isOpen && isMobile)

    const loadPrompt = (promptObj) => {
        if (loading) return
        openHistoryItem(promptObj)
        if (onClose) onClose()
    }

    const formatPreview = (prompt) => {
        if (!prompt) return 'Untitled session'
        const clean = prompt.trim()
        return clean.length > 30 ? `${clean.slice(0, 30)}...` : clean
    }

    const handleNewChat = () => {
        newChat()
        if (onClose) onClose()
    }

    const go = (path) => {
        navigate(path)
        if (onClose) onClose()
    }

    const sidebarClass = [
        'sidebar',
        themeMode === 'light' ? 'sidebar-light' : 'sidebar-dark',
        isOpen ? 'sidebar-open' : '',
    ].filter(Boolean).join(' ')

    return (
        <>
            {/* Tap backdrop to close drawer on mobile */}
            {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

            <div className={sidebarClass}>
                <div className="top">
                    <div className="sidebar-brand">
                        <img
                            onClick={() => setExtended(prev => !prev)}
                            className="menu ui-icon"
                            src={assets.menu_icon}
                            alt="Toggle"
                        />
                        {showExpanded && (
                            <div className="brand-meta">
                                <p>StudyMate</p>
                                <span>{currentUser?.email || 'Guest user'}</span>
                            </div>
                        )}
                    </div>

                    <div onClick={handleNewChat} className="new-chat">
                        <img className="ui-icon" src={assets.plus_icon} alt="" />
                        {showExpanded && <p>New Study</p>}
                    </div>

                    {showExpanded && (
                        <div className="recent">
                            <p className="recent-title">Recent Sessions</p>
                            {prevPrompts.length === 0 && (
                                <p className="recent-empty">No sessions yet.</p>
                            )}
                            {prevPrompts.map((item, index) => (
                                <div key={index} onClick={() => loadPrompt(item)} className="recent-entry">
                                    <img className="ui-icon" src={assets.message_icon} alt="" />
                                    <p>{formatPreview(item.prompt)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bottom">
                    <div className="bottom-item recent-entry" onClick={() => go('/learning-tips')}>
                        <img className="ui-icon" src={assets.question_icon} alt="" />
                        {showExpanded && <p>Learning Tips</p>}
                    </div>
                    <div className="bottom-item recent-entry" onClick={() => go('/progress')}>
                        <img className="ui-icon" src={assets.history_icon} alt="" />
                        {showExpanded && <p>Progress</p>}
                    </div>
                    <div className="bottom-item recent-entry" onClick={toggleTheme}>
                        <img className="ui-icon" src={assets.setting_icon} alt="" />
                        {showExpanded && <p>{themeMode === 'dark' ? 'Switch to light' : 'Switch to dark'}</p>}
                    </div>
                    <div
                        className="bottom-item recent-entry"
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