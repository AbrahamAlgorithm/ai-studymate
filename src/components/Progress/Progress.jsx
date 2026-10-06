import { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './Progress.css'
import { Context } from '../../context/Context'

const MODE_LABELS = {
    ask: 'Ask & Learn',
    handout: 'Handouts',
    youtube: 'YouTube',
    quiz: 'Quizzes',
}

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

// Consecutive days with activity, counting back from today (or yesterday).
const studyStreak = (dates) => {
    const days = new Set(dates.filter((d) => d.getTime() > 0).map(dayKey))
    const cursor = new Date()
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (days.has(dayKey(cursor))) {
        streak += 1
        cursor.setDate(cursor.getDate() - 1)
    }
    return streak
}

const formatDate = (date) =>
    date && date.getTime() > 0
        ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : ''

const Progress = () => {
    const { themeMode, history, sessions, openSession, historyLoaded } = useContext(Context)
    const navigate = useNavigate()

    const stats = useMemo(() => {
        const answered = history.filter((ex) => !ex.error && (ex.response || ex.quiz))
        const scored = history.filter((ex) => ex.quizScore?.total)
        const quizAverage = scored.length
            ? Math.round(
                (scored.reduce((sum, ex) => sum + ex.quizScore.score / ex.quizScore.total, 0) / scored.length) * 100
            )
            : null
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const byMode = Object.keys(MODE_LABELS).map((mode) => ({
            mode,
            count: history.filter((ex) => ex.mode === mode).length,
        }))

        return {
            cards: [
                { label: 'Study sessions', value: sessions.length, icon: '📚' },
                { label: 'Questions answered', value: answered.length, icon: '✅' },
                { label: 'Day streak', value: studyStreak(history.map((ex) => ex.createdAt)), icon: '🔥' },
                { label: 'This week', value: history.filter((ex) => ex.createdAt.getTime() > weekAgo).length, icon: '📈' },
                { label: 'Quiz average', value: quizAverage === null ? '—' : `${quizAverage}%`, icon: '🎯' },
            ],
            byMode,
            maxMode: Math.max(1, ...byMode.map((m) => m.count)),
        }
    }, [history, sessions])

    const open = (sessionId) => {
        openSession(sessionId)
        navigate('/chat')
    }

    return (
        <div className={`progress-page ${themeMode === 'light' ? 'progress-light' : 'progress-dark'}`}>
            <div className="progress-header">
                <button className="back-btn" onClick={() => navigate('/chat')}>← Back to Chat</button>
                <h1>Your Learning Progress</h1>
                <p>Track your study journey with StudyMate</p>
            </div>

            <div className="stats-grid">
                {stats.cards.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <p className="stat-value">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="sessions-section">
                <h2>How you study</h2>
                <div className="mode-bars">
                    {stats.byMode.map(({ mode, count }) => (
                        <div key={mode} className="mode-bar-row">
                            <span className="mode-bar-label">{MODE_LABELS[mode]}</span>
                            <div className="mode-bar-track">
                                <div className="mode-bar-fill" style={{ width: `${(count / stats.maxMode) * 100}%` }} />
                            </div>
                            <span className="mode-bar-count">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="sessions-section">
                <h2>Recent Sessions</h2>
                {!historyLoaded ? (
                    <div className="empty-state"><p>Loading…</p></div>
                ) : sessions.length === 0 ? (
                    <div className="empty-state">
                        <p>No study sessions yet. Start learning to see your progress here!</p>
                    </div>
                ) : (
                    <div className="sessions-list">
                        {sessions.slice(0, 20).map((session) => {
                            const last = session.exchanges[session.exchanges.length - 1]
                            return (
                                <button key={session.id} type="button" className="session-item" onClick={() => open(session.id)}>
                                    <div className="session-prompt">
                                        <p>{session.title.length > 80 ? `${session.title.slice(0, 80)}…` : session.title}</p>
                                    </div>
                                    <div className="session-status">
                                        {MODE_LABELS[session.mode] || 'Ask & Learn'} · {session.exchanges.length} msg
                                        {last.quizScore ? ` · ${last.quizScore.score}/${last.quizScore.total}` : ''}
                                        {formatDate(session.updatedAt) && ` · ${formatDate(session.updatedAt)}`}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Progress
