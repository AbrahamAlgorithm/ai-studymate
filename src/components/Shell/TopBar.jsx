import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Context } from '../../context/Context'
import './TopBar.css'

const initialsFor = (user) => {
    if (!user) return '?'
    if (user.displayName) {
        const parts = user.displayName.trim().split(/\s+/).filter(Boolean)
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
        return parts[0].slice(0, 2).toUpperCase()
    }
    if (user.email) return user.email.split('@')[0].replace(/\d+$/, '').slice(0, 2).toUpperCase()
    return '?'
}

const TopBar = ({ label, onOpenSidebar }) => {
    const { currentUser, newChat } = useContext(Context)
    const navigate = useNavigate()
    const initials = initialsFor(currentUser)
    // same initials always get the same colour
    const hue = ((initials.charCodeAt(0) || 0) * 37 + (initials.charCodeAt(1) || 0) * 17) % 360

    const goHome = () => {
        newChat()
        navigate('/chat')
    }

    return (
        <div className="topbar">
            <div className="topbar-left">
                <button className="hamburger-btn" aria-label="Open menu" onClick={onOpenSidebar}>
                    <span /><span /><span />
                </button>
                <button type="button" className="topbar-logo" onClick={goHome} title="Back to dashboard">
                    StudyMate AI
                </button>
                {label && <span className="topbar-chip">{label}</span>}
            </div>
            <div className="topbar-right">
                <p className="topbar-email">{currentUser?.email || 'Guest user'}</p>
                <div
                    className="topbar-avatar"
                    style={{ background: `hsl(${hue},55%,40%)` }}
                    title={currentUser?.email || 'User'}
                    aria-label={`User avatar: ${initials}`}
                >
                    {initials}
                </div>
            </div>
        </div>
    )
}

export default TopBar
