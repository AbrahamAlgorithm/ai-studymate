import { useEffect, useState } from 'react'
import { Markdown } from './MessageContent'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * Interactive quiz: instant feedback on multiple-choice questions, reveal +
 * self-marking for theory questions, and a score once everything is answered.
 */
const QuizView = ({ exchange, onScore, onNewQuiz }) => {
    const questions = exchange.quiz || []
    const [answers, setAnswers] = useState({}) // id -> { choice?: number, correct: boolean, revealed?: boolean }
    const [scoreSaved, setScoreSaved] = useState(false)

    const answeredCount = Object.values(answers).filter((a) => a.correct !== undefined).length
    const score = Object.values(answers).filter((a) => a.correct).length
    const finished = questions.length > 0 && answeredCount === questions.length

    useEffect(() => {
        if (finished && !scoreSaved) {
            setScoreSaved(true)
            onScore?.(score, questions.length)
        }
    }, [finished, scoreSaved, score, questions.length, onScore])

    const record = (id, entry) => {
        setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...entry } }))
    }

    const retake = () => {
        setAnswers({})
        setScoreSaved(false)
    }

    return (
        <div className="quiz">
            <div className="quiz-header">
                <div>
                    <p className="quiz-title">{exchange.quizTitle || 'Quiz'}</p>
                    <p className="quiz-meta">
                        {questions.length} questions · {answeredCount} answered
                        {exchange.quizScore && !finished && (
                            <> · last score {exchange.quizScore.score}/{exchange.quizScore.total}</>
                        )}
                    </p>
                </div>
                <div className="quiz-actions">
                    {answeredCount > 0 && (
                        <button type="button" className="quiz-ghost-btn" onClick={retake}>Retake</button>
                    )}
                    {onNewQuiz && (
                        <button type="button" className="quiz-ghost-btn" onClick={onNewQuiz}>New quiz</button>
                    )}
                </div>
            </div>

            <ol className="quiz-list">
                {questions.map((q) => {
                    const a = answers[q.id] || {}
                    return (
                        <li key={q.id} className="quiz-item">
                            <div className="quiz-question">
                                <span className="quiz-num">{q.id}.</span>
                                <Markdown text={q.question} className="md md-inline" />
                            </div>

                            {q.type === 'mcq' ? (
                                <div className="quiz-options">
                                    {q.options.map((opt, i) => {
                                        const locked = a.choice !== undefined
                                        const state = !locked
                                            ? ''
                                            : i === q.answerIndex
                                                ? ' correct'
                                                : i === a.choice
                                                    ? ' wrong'
                                                    : ' dim'
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                disabled={locked}
                                                className={`quiz-option${state}`}
                                                onClick={() => record(q.id, { choice: i, correct: i === q.answerIndex })}
                                            >
                                                <span className="quiz-letter">{LETTERS[i]}</span>
                                                <Markdown text={opt} className="md md-inline" />
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="quiz-theory">
                                    {!a.revealed ? (
                                        <button type="button" className="quiz-ghost-btn" onClick={() => record(q.id, { revealed: true })}>
                                            Show model answer
                                        </button>
                                    ) : (
                                        <>
                                            <div className="quiz-answer">
                                                <p className="quiz-label">Model answer</p>
                                                <Markdown text={q.answer} />
                                            </div>
                                            {a.correct === undefined ? (
                                                <div className="quiz-selfmark">
                                                    <span>Did you get it?</span>
                                                    <button type="button" onClick={() => record(q.id, { correct: true })}>Yes</button>
                                                    <button type="button" onClick={() => record(q.id, { correct: false })}>Not quite</button>
                                                </div>
                                            ) : (
                                                <p className={`quiz-verdict ${a.correct ? 'ok' : 'bad'}`}>
                                                    {a.correct ? 'Marked correct' : 'Marked for review'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {q.explanation && (a.choice !== undefined || a.revealed) && (
                                <div className="quiz-explanation">
                                    <Markdown text={q.explanation} />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ol>

            {finished && (
                <div className="quiz-score">
                    <p>
                        You scored <strong>{score}/{questions.length}</strong> ({Math.round((score / questions.length) * 100)}%)
                    </p>
                    <p className="quiz-meta">
                        {score === questions.length
                            ? 'Perfect — try a harder difficulty next.'
                            : 'Ask me below to explain any question you missed.'}
                    </p>
                </div>
            )}
        </div>
    )
}

export default QuizView
