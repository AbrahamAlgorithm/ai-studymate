import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Landing.css'

const learningFeatures = [
  {
    title: 'Ask And Learn',
    text: 'Ask anything and get teacher-style explanations, then a quick summary you can revise in minutes.'
  },
  {
    title: 'Upload Handouts And Images',
    text: 'Drop your notes, class handouts, or photos. StudyMate explains the topic, simplifies it, and extracts key points.'
  },
  {
    title: 'Generate Quizzes Instantly',
    text: 'Create MCQs and theory quizzes from your materials and get feedback that helps you improve weak spots.'
  },
  {
    title: 'Learn From YouTube Links',
    text: 'Paste a video URL to get transcript-based summaries, timestamp explanations, and quiz questions from the lesson.'
  }
]

const valueTabs = [
  {
    title: 'Clarity',
    text: 'Complex notes and lectures become simple language, key ideas, and practical examples students can actually remember.'
  },
  {
    title: 'Practice',
    text: 'Every topic turns into mixed quizzes with objective and theory questions so learners can test themselves immediately.'
  },
  {
    title: 'Retention',
    text: 'Summaries, flash takeaways, and targeted feedback make revision focused instead of overwhelming.'
  },
  {
    title: 'Video Intelligence',
    text: 'YouTube lessons become searchable study assets with transcript summaries and timestamp-based deep explanations.'
  }
]

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="brand-mark">StudyMate</Link>

          <nav className="header-nav-desktop">
            <a href="#features" className="header-nav-link">Features</a>
            <a href="#philosophy" className="header-nav-link">Philosophy</a>
            <a href="mailto:abrahamfolorunso6@gmail.com" className="header-nav-link">Contact</a>
          </nav>

          <div className="header-actions-desktop">
            <Link to="/signup" className="btn btn-solid btn-header">Start free</Link>
          </div>

          <div className="header-actions-mobile">
            <Link to="/signup" className="btn btn-solid btn-header">Start free</Link>
            <button
              type="button"
              className="menu-toggle"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span className={mobileMenuOpen ? 'bar bar-open-1' : 'bar'} />
              <span className={mobileMenuOpen ? 'bar bar-open-2' : 'bar'} />
              <span className={mobileMenuOpen ? 'bar bar-open-3' : 'bar'} />
            </button>
          </div>
        </div>

        <div className={mobileMenuOpen ? 'header-nav-mobile nav-mobile-open' : 'header-nav-mobile'}>
          <div className="header-nav-mobile-inner">
            <a href="#features" className="header-nav-link" onClick={closeMobileMenu}>Features</a>
            <a href="#philosophy" className="header-nav-link" onClick={closeMobileMenu}>Philosophy</a>
            <a href="mailto:abrahamfolorunso6@gmail.com" className="header-nav-link" onClick={closeMobileMenu}>Contact</a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <motion.p
            className="hero-tag"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            AI learning coach for real students
          </motion.p>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="hero-line">Learn deeply.</span>
            <span className="hero-line hero-line-muted">Revise clearly.</span>
          </motion.h1>

          <motion.p
            className="hero-copy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Turn your questions, handouts, images, and YouTube lessons into clear explanations, quick summaries, and quiz practice.
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/signup" className="btn btn-solid btn-large">
              Start learning free
              <svg className="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7" />
                <path d="M9 7H17V15" />
              </svg>
            </Link>
          </motion.div>
        </section>

        <section className="hero-showcase-wrap">
          <div className="hero-showcase-bg">
            <div className="hero-showcase-frame">
              <img src="/home.png" alt="StudyMate product preview" className="hero-showcase-image" />
            </div>
          </div>
        </section>

        <section id="features" className="feature-grid">
          {learningFeatures.map((feature, index) => (
            <motion.article
              key={feature.title}
              className="feature-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </motion.article>
          ))}
        </section>

        <section className="workflow-strip">
          <p>Ask or upload</p>
          <span className="dot" />
          <p>Understand the topic</p>
          <span className="dot" />
          <p>Take quizzes</p>
          <span className="dot" />
          <p>Track improvement</p>
        </section>

        <section id="philosophy" className="philosophy-section">
          <p className="section-label">[Our philosophy]</p>
          <h2>The learners and builders</h2>
          <p className="philosophy-lead">
            Every student wants three things from learning: understanding, confidence, and results.
            StudyMate is designed to transform scattered resources into clear explanations, meaningful practice,
            and measurable progress.
          </p>

          <div className="philosophy-shell">
            <div className="philosophy-orbit" aria-hidden="true">
              <div className="orbit-core">StudyMate</div>
              <div className="orbit-node orbit-node-top">Clarity</div>
              <div className="orbit-node orbit-node-right">Practice</div>
              <div className="orbit-node orbit-node-bottom">Retention</div>
              <div className="orbit-node orbit-node-left">Video IQ</div>
            </div>

            <div className="philosophy-tabs">
              {valueTabs.map((tab, index) => (
                <motion.article
                  key={tab.title}
                  className="philosophy-tab"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                >
                  <h3>{tab.title}</h3>
                  <p>{tab.text}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <h2>Build stronger study habits with AI that teaches.</h2>
          <p>From class handouts to YouTube videos, learn, revise, and test yourself in one focused workflow.</p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-solid btn-large">Create account</Link>
            <Link to="/signin" className="btn btn-ghost btn-large">I already have an account</Link>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Landing