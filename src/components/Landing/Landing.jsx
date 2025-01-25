import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './Landing.css'

const NavLink = ({ to, children, isActive, onClick }) => (
  <motion.div
    className={`nav-link ${isActive ? 'active' : ''}`}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <a onClick={onClick}>{children}</a>
    {isActive && (
      <motion.div
        className="link-indicator"
        layoutId="indicator"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </motion.div>
);

const Landing = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const location = useLocation()

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' })
    setIsOpen(false)
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'features', 'contact']
      const scrollPosition = window.scrollY + 100

      sections.forEach(section => {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
          }
        }
      })
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-container">
      <motion.nav 
        className="landing-nav"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.div 
          className="brand"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <h1>AI StudyMate</h1>
        </motion.div>
        
        <div className="mobile-menu" onClick={() => setIsOpen(!isOpen)}>
          <motion.span animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 8 : 0 }} />
          <motion.span animate={{ opacity: isOpen ? 0 : 1 }} />
          <motion.span animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -8 : 0 }} />
        </div>

        <AnimatePresence>
          <motion.div 
            className={`nav-links ${isOpen ? 'active' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NavLink to="home" isActive={activeSection === 'home'} onClick={() => scrollToSection('home')}>
              Home
            </NavLink>
            <NavLink to="about" isActive={activeSection === 'about'} onClick={() => scrollToSection('about')}>
              About
            </NavLink>
            <NavLink to="features" isActive={activeSection === 'features'} onClick={() => scrollToSection('features')}>
              Features
            </NavLink>
            <NavLink to="contact" isActive={activeSection === 'contact'} onClick={() => scrollToSection('contact')}>
              Contact
            </NavLink>
            <motion.div className="auth-buttons">
              <Link to="/signin">
                <motion.button className="signin-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  Sign In
                </motion.button>
              </Link>
              <Link to="/signup">
                <motion.button className="signup-btn" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  Sign Up
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.nav>
      
      <main>
        <section id="home" className="hero-section">
          <div className="hero-background">
            <div className="gradient-overlay"></div>
            <div className="animated-grid"></div>
          </div>

          <motion.div 
            className="hero-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <motion.h1 
              className="hero-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Transform Your Learning Experience
            </motion.h1>

            <motion.p 
              className="hero-subtitle"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Harness the power of AI to enhance your study sessions
            </motion.p>

            <motion.div 
              className="feature-highlights"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {['Smart Learning', 'Real-time AI', 'Personalized Path'].map((feature, index) => (
                <motion.div 
                  key={feature}
                  className="highlight-item"
                  whileHover={{ scale: 1.05 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <span className="highlight-icon">✨</span>
                  {feature}
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="cta-container"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Link to="/signup">
                <motion.button 
                  className="cta-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started
                  <span className="arrow">→</span>
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="scroll-indicator"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <span>Scroll to explore</span>
            <div className="scroll-arrow">↓</div>
          </motion.div>
        </section>

        <section id="about" className="section">
          <h2>About Us</h2>
          {/* Add about content */}
        </section>

        <section id="features" className="section">
          <h2>Features</h2>
          {/* Add features content */}
        </section>

        <section id="contact" className="section">
          <h2>Contact</h2>
          {/* Add contact content */}
        </section>
      </main>

      <motion.footer 
        className="footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p>&copy; {new Date().getFullYear()} AI StudyMate. All rights reserved.</p>
      </motion.footer>
    </div>
  )
}

export default Landing