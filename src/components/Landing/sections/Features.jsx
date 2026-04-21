import { motion } from 'framer-motion'

const capabilityItems = [
  {
    title: 'Understand any topic in minutes',
    description:
      'From simple definitions to full breakdowns with examples, StudyMate explains like a calm tutor who knows your level.',
    tone: 'blue'
  },
  {
    title: 'Turn long notes into clear revision sheets',
    description:
      'Upload class notes, pasted text, or links and get concise summaries with the key points highlighted first.',
    tone: 'green'
  },
  {
    title: 'Practice with focused quiz sets',
    description:
      'Generate exam-style questions from your own materials and train active recall without leaving your workflow.',
    tone: 'yellow'
  }
]

const trustSignals = [
  {
    label: 'Responses in seconds',
    value: 'Fast'
  },
  {
    label: 'Built for revision flow',
    value: 'Focused'
  },
  {
    label: 'Works with your materials',
    value: 'Flexible'
  }
]

const Features = () => {
  return (
    <section id="features" className="feature-grid" aria-labelledby="feature-section-title">
      <div className="feature-grid-header">
        <p className="feature-grid-eyebrow">Product capabilities</p>
        <h2 id="feature-section-title" className="feature-grid-title">Designed like a modern learning product, built for daily study</h2>
      </div>

      <motion.article
        className="feature-hero-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55 }}
      >
        <div className="feature-hero-content">
          <p className="feature-hero-kicker">StudyMate Core</p>
          <h3 className="feature-hero-title">One workspace for asking, summarizing, and testing understanding</h3>
          <p className="feature-hero-copy">
            Move from confusion to confidence with a single flow. Ask questions, simplify difficult material,
            and reinforce it with quiz practice.
          </p>
        </div>

        <div className="feature-signal-list" aria-label="Core product strengths">
          {trustSignals.map((signal) => (
            <div key={signal.label} className="feature-signal-item">
              <span className="feature-signal-value">{signal.value}</span>
              <span className="feature-signal-label">{signal.label}</span>
            </div>
          ))}
        </div>
      </motion.article>

      <div className="feature-cards" role="list">
        {capabilityItems.map((item, index) => (
          <motion.article
            key={item.title}
            className={`feature-card feature-card-${item.tone}`}
            role="listitem"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
          >
            <span className="feature-card-dot" aria-hidden="true" />
            <h3 className="feature-card-title">{item.title}</h3>
            <p className="feature-card-copy">{item.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

export default Features