import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Context } from '../../context/Context'
import TopBar from '../Shell/TopBar'
import '../Shell/Page.css'
import './LearningTips.css'

// each one opens the chat in the mode that fits, with a prompt they just need to fill the topic into
const TECHNIQUES = [
    {
        title: 'Active recall',
        body: 'Test yourself instead of re-reading. Pulling an answer out of memory is what makes it stick.',
        mode: 'quiz',
        prompt: '',
        action: 'Make a quiz',
    },
    {
        title: 'Spaced repetition',
        body: 'Review after a day, three days, a week, then longer. Each review right before you forget locks it in.',
        mode: 'ask',
        prompt: 'Make me a 2 week spaced repetition plan for [topic], with what to review each day.',
        action: 'Plan my reviews',
    },
    {
        title: 'Feynman technique',
        body: "Explain the idea in plain words, like you're teaching someone new to it. The parts you can't explain are your gaps.",
        mode: 'ask',
        prompt: "I'll explain [topic] in my own words. Point out anything wrong or missing: ",
        action: 'Explain it back',
    },
    {
        title: 'Interleaving',
        body: 'Mix related topics in one session instead of finishing one before the next. It trains you to pick the right method.',
        mode: 'quiz',
        prompt: 'A mixed quiz on [topic 1], [topic 2] and [topic 3]',
        action: 'Mixed quiz',
    },
    {
        title: 'Practice problems',
        body: 'Work through problems before reading the solutions. Using an idea shows you whether you really get it.',
        mode: 'ask',
        prompt: 'Give me 5 practice problems on [topic], from easy to hard. Keep the solutions until I ask.',
        action: 'Get problems',
    },
    {
        title: 'Teach someone',
        body: 'Teach what you learned to a friend. Their questions find the weak spots fast.',
        mode: 'ask',
        prompt: "Be a curious classmate. I'll teach you [topic], ask me questions that test whether I really understand it.",
        action: 'Teach StudyMate',
    },
]

const LearningTips = ({ onOpenSidebar }) => {
    const { newChat, changeMode, setInput } = useContext(Context)
    const navigate = useNavigate()

    const tryIt = (technique) => {
        newChat()
        changeMode(technique.mode)
        setInput(technique.prompt)
        navigate('/chat')
    }

    return (
        <div className="page">
            <TopBar label="Study techniques" onOpenSidebar={onOpenSidebar} />
            <div className="page-body">
                <div className="page-inner">
                    <header className="page-header">
                        <h1 className="page-title">Study smarter</h1>
                        <p className="page-subtitle">
                            Six techniques that make what you learn stick, and a quick way to try each one with StudyMate.
                        </p>
                    </header>

                    <div className="tips-grid">
                        {TECHNIQUES.map((t, i) => (
                            <article key={t.title} className="tip-card">
                                <span className="tip-index">{String(i + 1).padStart(2, '0')}</span>
                                <h2 className="tip-title">{t.title}</h2>
                                <p className="tip-body">{t.body}</p>
                                <button type="button" className="pill-btn" onClick={() => tryIt(t)}>{t.action}</button>
                            </article>
                        ))}
                    </div>

                    <p className="tips-footnote">Swap the [topic] in the prompt for whatever you're studying.</p>
                </div>
            </div>
        </div>
    )
}

export default LearningTips
