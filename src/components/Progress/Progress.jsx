import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import './Progress.css'
import { Context } from '../../context/Context'

const Progress = () => {
    const { themeMode, prevPrompts } = useContext(Context)
    const navigate = useNavigate()

    const totalSessions = prevPrompts.length
    const completedSessions = prevPrompts.filter((p) => p.response).length
    const progressPercent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    const stats = [
        {
            label: 'Total Study Sessions',
            value: totalSessions,
            icon: '📚'
        },
        {
            label: 'Completed Responses',
            value: completedSessions,
            icon: '✅'
        },
        {
            label: 'Progress',
            value: `${progressPercent}%`,
            icon: '📈'
        }
    ]

    return (
        <div className={`progress-page ${themeMode === 'light' ? 'progress-light' : 'progress-dark'}`}>
            <div className="progress-header">
                <button className="back-btn" onClick={() => navigate('/chat')}>← Back to Chat</button>
                <h1>Your Learning Progress</h1>
                <p>Track your study journey with StudyMate</p>
            </div>

            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <p className="stat-value">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="sessions-section">
                <h2>Recent Sessions</h2>
                {prevPrompts.length === 0 ? (
                    <div className="empty-state">
                        <p>No study sessions yet. Start learning to see your progress here!</p>
                    </div>
                ) : (
                    <div className="sessions-list">
                        {prevPrompts.slice().reverse().map((session, index) => (
                            <div key={index} className="session-item">
                                <div className="session-prompt">
                                    <p>{session.prompt.slice(0, 80)}...</p>
                                </div>
                                <div className="session-status">
                                    {session.response ? '✅ Completed' : '⏳ In Progress'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Progress
