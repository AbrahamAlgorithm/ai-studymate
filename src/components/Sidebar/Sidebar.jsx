import React, { useState, useContext } from 'react'
import './Sidebar.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'
import { useNavigate } from 'react-router-dom'

const Sidebar = () => {
    const navigate = useNavigate()
    const [extended, setExtended] = useState(false)
    const { prevPrompts, newChat, themeMode, toggleTheme, loading, openHistoryItem, logout, currentUser } = useContext(Context)

    const loadPrompt = (promptObj) => {
        if (loading) {
            return
        }
        openHistoryItem(promptObj)
    }

    const formatPreview = (prompt) => {
        if (!prompt) {
            return 'Untitled session'
        }
        const clean = prompt.trim()
        return clean.length > 28 ? `${clean.slice(0, 28)}...` : clean
    }

    return (
        <div className={`sidebar ${themeMode === 'light' ? 'sidebar-light' : 'sidebar-dark'}`}>
            <div className="top">
                <div className="sidebar-brand">
                    <img onClick={() => setExtended(prev => !prev)} className='menu ui-icon' src={assets.menu_icon} alt="Toggle" />
                    {extended ? (
                        <div className="brand-meta">
                            <p>StudyMate</p>
                            <span>{currentUser?.email || 'Guest user'}</span>
                        </div>
                    ) : null}
                </div>
                <div onClick={() => newChat()} className="new-chat">
                    <img className="ui-icon" src={assets.plus_icon} alt="" />
                    {extended ? <p>New Study</p> : null}
                </div>
                {extended
                    ? <div className="recent">
                        <p className="recent-title">Recent Sessions</p>
                        {prevPrompts.map((item, index) => {
                            return (
                                <div key={index} onClick={() => loadPrompt(item)} className="recent-entry">
                                    <img className="ui-icon" src={assets.message_icon} alt="" />
                                    <p>{formatPreview(item.prompt)}</p>
                                </div>
                            )
                        })}
                    </div>
                    : null
                }
            </div>
            <div className="bottom">
                <div className="bottom-item recent-entry" onClick={() => navigate('/learning-tips')}>
                    <img className="ui-icon" src={assets.question_icon} alt="" />
                    {extended ? <p>Learning Tips</p> : null}
                </div>
                <div className="bottom-item recent-entry" onClick={() => navigate('/progress')}>
                    <img className="ui-icon" src={assets.history_icon} alt="" />
                    {extended ? <p>Progress</p> : null}
                </div>
                <div className="bottom-item recent-entry" onClick={toggleTheme}>
                    <img className="ui-icon" src={assets.setting_icon} alt="" />
                    {extended ? <p>{themeMode === 'dark' ? 'Switch to light' : 'Switch to dark'}</p> : null}
                </div>
                <div
                    className="bottom-item recent-entry"
                    onClick={async () => {
                        await logout()
                        navigate('/signin')
                    }}
                >
                    <img className="ui-icon no-filter" src={assets.logout_icon} alt="" />
                    {extended ? <p>Sign out</p> : null}
                </div>
            </div>
        </div>
    )
}

export default Sidebar