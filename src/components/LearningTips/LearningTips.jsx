import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import './LearningTips.css'
import { Context } from '../../context/Context'

const LearningTips = () => {
    const { themeMode } = useContext(Context)
    const navigate = useNavigate()

    const tips = [
        {
            title: 'Active Recall',
            description: 'Test yourself frequently instead of just re-reading. This strengthens memory retention.',
            icon: '🧠'
        },
        {
            title: 'Spaced Repetition',
            description: 'Review material at increasing intervals. Review after 1 day, 3 days, 1 week, then longer.',
            icon: '📅'
        },
        {
            title: 'Feynman Technique',
            description: 'Explain concepts in simple terms as if teaching someone else. Identify gaps in understanding.',
            icon: '✍️'
        },
        {
            title: 'Interleaving',
            description: 'Mix different topics while studying instead of blocking one topic at a time.',
            icon: '🔀'
        },
        {
            title: 'Practice Problems',
            description: 'Work through problems from your material. Application deepens understanding faster.',
            icon: '💡'
        },
        {
            title: 'Teach Someone',
            description: 'Explain what you learned to a friend or study partner. It reveals weak areas quickly.',
            icon: '👥'
        }
    ]

    return (
        <div className={`learning-tips ${themeMode === 'light' ? 'tips-light' : 'tips-dark'}`}>
            <div className="tips-header">
                <button className="back-btn" onClick={() => navigate('/chat')}>← Back to Chat</button>
                <h1>Learning Tips & Strategies</h1>
                <p>Proven techniques to learn faster and retain better</p>
            </div>

            <div className="tips-grid">
                {tips.map((tip, index) => (
                    <div key={index} className="tip-card">
                        <div className="tip-icon">{tip.icon}</div>
                        <h2>{tip.title}</h2>
                        <p>{tip.description}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default LearningTips
