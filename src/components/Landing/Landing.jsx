import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Landing.css'

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
            <Link to="/contact" className="header-nav-link">Contact</Link>
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
            <Link to="/contact" className="header-nav-link" onClick={closeMobileMenu}>Contact</Link>
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
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">© 2026 StudyMate</div>
      </footer>
    </div>
  )
}

export default Landing