import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import '../Landing/Landing.css'
import './Contact.css'

const Contact = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // TODO: Connect to your backend or email service
      // For now, just simulate submission
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      setSubmitStatus('success')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        message: ''
      })

      setTimeout(() => setSubmitStatus(null), 3000)
    } catch (_error) {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus(null), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="contact-page">
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

      <main className="contact-main">
        <motion.div
          className="contact-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="contact-eyebrow">Get in touch</p>

          <h1 className="contact-title">
            Let's talk.
          </h1>

          <p className="contact-subtitle">
            Have a question or suggestion? We'd love to hear from you. Reach out and we'll respond as soon as we can.
          </p>
        </motion.div>

        <div className="contact-wrapper">
          <motion.div
            className="contact-form-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="contact-form-title">Send us a message</h2>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    First Name <span className="form-required">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    Last Name <span className="form-required">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address <span className="form-required">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message" className="form-label">
                  Message <span className="form-required">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us about your needs, questions, or how we can help..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="form-input form-textarea"
                  rows="6"
                />
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="form-submit-button"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? 'Sending...' : (
                  <>
                    <svg className="submit-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="M12 5l7 7-7 7" />
                    </svg>
                    Send Message
                  </>
                )}
              </motion.button>

              {submitStatus === 'success' && (
                <motion.p
                  className="form-message form-message-success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Thanks for reaching out! We'll be in touch soon.
                </motion.p>
              )}

              {submitStatus === 'error' && (
                <motion.p
                  className="form-message form-message-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Something went wrong. Please try again.
                </motion.p>
              )}
            </form>

            <p className="contact-privacy">
              We respect your inbox. We'll only use your details to respond to this inquiry.
            </p>
          </motion.div>
        </div>
      </main>

      <footer className="contact-footer">
        <div className="contact-footer-inner">© 2026 StudyMate</div>
      </footer>
    </div>
  )
}

export default Contact
