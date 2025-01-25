import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './Landing.css'

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
        transition={{ duration: 0.5 }}
      >
        <h1>AI StudyMate</h1>
        
        <div className="mobile-menu" onClick={() => setIsOpen(!isOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className={`nav-links ${isOpen ? 'active' : ''}`}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
          >
            <a onClick={() => scrollToSection('home')}>Home</a>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
          >
            <a onClick={() => scrollToSection('about')}>About</a>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`nav-link ${activeSection === 'features' ? 'active' : ''}`}
          >
            <a onClick={() => scrollToSection('features')}>Features</a>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}
          >
            <a onClick={() => scrollToSection('contact')}>Contact</a>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1 }}
            className={`nav-link ${location.pathname === '/signin' ? 'active' : ''}`}
          >
            <Link to="/signin">Sign In</Link>
          </motion.div>
        </div>
      </motion.nav>
      
      <main>
        <section id="home" className="hero-section">
          {/* ...existing hero content... */}
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