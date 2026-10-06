import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Context } from '../../context/Context'
import TopBar from '../Shell/TopBar'
import '../Shell/Page.css'
import './Progress.css'

const MODE_LABELS = {
    ask: 'Ask & Learn',
    handout: 'Handouts',
    youtube: 'YouTube',
    quiz: 'Quizzes',
}

const DAY = 24 * 60 * 60 * 1000
const CHART_DAYS = 14

const startOfDay = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

const shortDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
const longDate = (date) => date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// counts back from today, or yesterday if they haven't studied yet today
const studyStreak = (dayKeys) => {
    const days = new Set(dayKeys)
    let cursor = startOfDay(new Date()).getTime()
    if (!days.has(cursor)) cursor -= DAY
    let streak = 0
    while (days.has(cursor)) {
        streak += 1
        cursor -= DAY
    }
    return streak
}

const StatTile = ({ label, value, sub, tone }) => (
    <div className="stat-tile">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className={`stat-sub${tone ? ` ${tone}` : ''}`}>{sub}</p>}
    </div>
)

const ActivityChart = ({ days }) => {
    const [hover, setHover] = useState(null)
    const peak = Math.max(...days.map((d) => d.count))
    const peakIndex = days.findIndex((d) => d.count === peak)
    const hovered = hover === null ? null : days[hover]

    return (
        <div className="activity" onPointerLeave={() => setHover(null)}>
            <div className="activity-plot" role="img" aria-label={`Questions per day for the last ${CHART_DAYS} days, peak ${peak}`}>
                {days.map((d, i) => (
                    <button
                        key={d.key}
                        type="button"
                        className={`activity-col${hover === i ? ' is-hover' : ''}`}
                        onPointerEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                        aria-label={`${longDate(d.date)}: ${plural(d.count, 'question')}`}
                    >
                        {peak > 0 && i === peakIndex && <span className="activity-peak">{d.count}</span>}
                        {d.count > 0 && <span className="activity-bar" style={{ height: `${(d.count / peak) * 100}%` }} />}
                    </button>
                ))}
            </div>
            <div className="activity-axis" aria-hidden="true">
                {days.map((d, i) => (
                    <span key={d.key}>{i === 0 ? shortDate(d.date) : i === days.length - 1 ? 'Today' : ''}</span>
                ))}
            </div>
            {hovered && (
                <div className="chart-tip" style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
                    <strong>{plural(hovered.count, 'question')}</strong>
                    <span>{longDate(hovered.date)}</span>
                </div>
            )}
            {peak === 0 && <p className="activity-empty">Nothing in the last two weeks yet.</p>}
            <table className="sr-only">
                <caption>Questions per day</caption>
                <tbody>
                    {days.map((d) => (
                        <tr key={d.key}><th scope="row">{longDate(d.date)}</th><td>{d.count}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const ModeBars = ({ modes, total }) => {
    const max = Math.max(1, ...modes.map((m) => m.count))
    return (
        <ul className="mode-bars">
            {modes.map((m) => (
                <li
                    key={m.mode}
                    className="mode-row"
                    title={total ? `${Math.round((m.count / total) * 100)}% of your questions` : undefined}
                >
                    <span className="mode-name">{MODE_LABELS[m.mode]}</span>
                    <span className="mode-track">
                        {m.count > 0 && <span className="mode-fill" style={{ width: `${(m.count / max) * 85}%` }} />}
                        <span className="mode-count">{m.count}</span>
                    </span>
                </li>
            ))}
        </ul>
    )
}

const Progress = ({ onOpenSidebar }) => {
    const { history, sessions, openSession, historyLoaded, historyError } = useContext(Context)
    const navigate = useNavigate()

    const stats = useMemo(() => {
        const answered = history.filter((ex) => !ex.error && (ex.response || ex.quiz))
        const dated = answered.filter((ex) => ex.createdAt.getTime() > 0)
        const today = startOfDay(new Date()).getTime()

        const perDay = new Map()
        for (const ex of dated) {
            const key = startOfDay(ex.createdAt).getTime()
            perDay.set(key, (perDay.get(key) || 0) + 1)
        }
        const days = Array.from({ length: CHART_DAYS }, (_, i) => {
            const key = today - (CHART_DAYS - 1 - i) * DAY
            return { key, date: new Date(key), count: perDay.get(key) || 0 }
        })

        const inWindow = (from, to) => dated.filter((ex) => ex.createdAt.getTime() >= from && ex.createdAt.getTime() < to).length
        const thisWeek = inWindow(today - 6 * DAY, today + DAY)
        const lastWeek = inWindow(today - 13 * DAY, today - 6 * DAY)

        const scored = history.filter((ex) => ex.quizScore?.total)
        const quizAverage = scored.length
            ? Math.round((scored.reduce((sum, ex) => sum + ex.quizScore.score / ex.quizScore.total, 0) / scored.length) * 100)
            : null

        const modes = Object.keys(MODE_LABELS)
            .map((mode) => ({ mode, count: answered.filter((ex) => ex.mode === mode).length }))
            .sort((a, b) => b.count - a.count)

        return {
            answered: answered.length,
            thisWeek,
            weekDelta: thisWeek - lastWeek,
            streak: studyStreak([...perDay.keys()]),
            studiedToday: perDay.has(today),
            quizAverage,
            quizzesTaken: scored.length,
            days,
            modes,
        }
    }, [history])

    const open = (sessionId) => {
        openSession(sessionId)
        navigate('/chat')
    }

    const deltaText = stats.weekDelta === 0
        ? 'Same as last week'
        : `${stats.weekDelta > 0 ? '+' : '−'}${Math.abs(stats.weekDelta)} vs last week`

    return (
        <div className="page">
            <TopBar label="Progress" onOpenSidebar={onOpenSidebar} />
            <div className="page-body">
                <div className="page-inner">
                    <header className="page-header">
                        <h1 className="page-title">Your progress</h1>
                        <p className="page-subtitle">How much you've been studying, how you study, and how your quizzes are going.</p>
                    </header>

                    {historyError && (
                        <p className="page-warning">Couldn't load your history right now, so these numbers only cover this visit.</p>
                    )}

                    <section className="stat-row" aria-label="Summary">
                        <StatTile label="Questions answered" value={stats.answered} sub={`across ${plural(sessions.length, 'session')}`} />
                        <StatTile
                            label="This week"
                            value={stats.thisWeek}
                            sub={deltaText}
                            tone={stats.weekDelta > 0 ? 'up' : stats.weekDelta < 0 ? 'down' : ''}
                        />
                        <StatTile
                            label="Day streak"
                            value={stats.streak}
                            sub={stats.studiedToday ? 'Studied today' : stats.streak ? 'Study today to keep it going' : 'Ask something to start one'}
                        />
                        <StatTile
                            label="Quiz average"
                            value={stats.quizAverage === null ? 'None yet' : `${stats.quizAverage}%`}
                            sub={stats.quizzesTaken ? `from ${plural(stats.quizzesTaken, 'quiz', 'quizzes')}` : 'Finish a quiz to see it'}
                        />
                    </section>

                    <section className="panel">
                        <div className="panel-head">
                            <h2>Questions per day</h2>
                            <span className="panel-note">Last {CHART_DAYS} days</span>
                        </div>
                        <ActivityChart days={stats.days} />
                    </section>

                    <div className="panel-grid">
                        <section className="panel">
                            <div className="panel-head">
                                <h2>How you study</h2>
                                <span className="panel-note">Questions by mode</span>
                            </div>
                            <ModeBars modes={stats.modes} total={stats.answered} />
                        </section>

                        <section className="panel">
                            <div className="panel-head">
                                <h2>Recent sessions</h2>
                                {sessions.length > 0 && <span className="panel-note">{plural(sessions.length, 'session')}</span>}
                            </div>
                            {sessions.length === 0 && !historyLoaded ? (
                                <p className="panel-empty">Loading…</p>
                            ) : sessions.length === 0 ? (
                                <div className="panel-empty">
                                    <p>No sessions yet.</p>
                                    <button type="button" className="pill-btn" onClick={() => navigate('/chat')}>Start studying</button>
                                </div>
                            ) : (
                                <ul className="session-list">
                                    {sessions.slice(0, 8).map((session) => {
                                        const last = session.exchanges[session.exchanges.length - 1]
                                        return (
                                            <li key={session.id}>
                                                <button type="button" className="session-row" onClick={() => open(session.id)}>
                                                    <span className="session-mode">{MODE_LABELS[session.mode] || 'Ask & Learn'}</span>
                                                    <span className="session-title">{session.title}</span>
                                                    <span className="session-meta">
                                                        {last.quizScore ? `${last.quizScore.score}/${last.quizScore.total} · ` : ''}
                                                        {session.updatedAt?.getTime() > 0 ? shortDate(session.updatedAt) : ''}
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Progress
