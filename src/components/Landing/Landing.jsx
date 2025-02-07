import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './Landing.css'
import { TypeAnimation } from 'react-type-animation';
import Footer from './sections/Footer'

const ProcessFlow = () => (
  <motion.div 
    className="process-flow"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8 }}
  >
    <div className="process-container">
      {/* Question Card */}
      <motion.div 
        className="process-card question"
        animate={{ 
          rotate: [-6, -4, -6],
          y: [0, -5, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="card-content">
          <svg className="icon pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <path d="M12 17h.01"/>
          </svg>
          <div className="card-label">Ask Question</div>
        </div>
        <motion.div 
          className="glow"
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      <div className="connection-line">
        <motion.div 
          className="line-progress"
          animate={{ scaleX: [0, 1] }}
          transition={{ duration: 1.5, delay: 0.5 }}
        >
          <motion.div 
            className="moving-dot"
            animate={{
              x: [0, "100%"],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
        <motion.div 
          className="progress-label"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
        >
          AI Processing
        </motion.div>
      </div>

      {/* Brain/AI Card */}
      <motion.div 
        className="process-card brain"
        animate={{ 
          scale: [1, 1.02, 1],
          rotate: [0, 2, 0]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="card-content">
          <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 8V4H8"/>
            <rect width="16" height="12" x="4" y="8" rx="2"/>
            <path d="M2 14h2"/>
            <path d="M20 14h2"/>
          </svg>
          <div className="card-label">AI Analysis</div>
          <motion.div 
            className="ripple"
            animate={{
              scale: [1, 1.5],
              opacity: [0.5, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        </div>
      </motion.div>

      <div className="connection-line">
        <motion.div 
          className="line-progress gradient"
          animate={{ scaleX: [0, 1] }}
          transition={{ duration: 1.5, delay: 1 }}
        >
          <motion.div 
            className="moving-dot"
            animate={{
              x: [0, "100%"],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
        <motion.div 
          className="progress-label"
          animate={{
            scale: [1, 1.05, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
        >
          Personalized
        </motion.div>
      </div>

      {/* Solution Card */}
      <motion.div 
        className="process-card solution"
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, -2, 0]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05 }}
      >
        <div className="card-content">
          <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <div className="card-label">Learn & Understand</div>
        </div>
        <motion.div 
          className="sparkles"
          animate={{
            rotate: [0, 360],
            scale: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>
    </div>
  </motion.div>
);

// Add to Landing component after hero section;

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

  const headlines = [
    "Master Complex Subjects with AI",
    "Learn Faster with AI Assistance", 
    "Understand Better with AI Support"
  ];

  const [currentHeadline, setCurrentHeadline] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    const typingTimer = setTimeout(() => {
      if (currentHeadline < headlines.length - 1) {
        setIsTyping(false);
        setTimeout(() => {
          setCurrentHeadline(prev => prev + 1);
          setIsTyping(true);
        }, 500);
      }
    }, 3000);

    return () => clearTimeout(typingTimer);
  }, [currentHeadline]);

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
            <motion.div className="mesh-gradient"></motion.div>
            <div className="grid-overlay"></div>
            <motion.div 
              className="floating-shapes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="shape"
                  animate={{
                    y: [0, -20, 0],
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 8,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              ))}
            </motion.div>
          </div>

          <div className="hero-content-wrapper">
            <motion.div 
              className="hero-content"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="hero-badge"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span>✨ AI-Powered Learning</span>
              </motion.div>

              <h1 className="hero-title">
                <motion.div
                  key={currentHeadline}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {isTyping && (
                    <TypeAnimation
                      sequence={[
                        "Master Complex Subjects with AI", // Type in
                        2000, // Wait 2s
                        "", // Delete
                        100, // Wait 0.1s
                        "Learn Faster with AI Assistance",
                        2000,
                        "",
                        100, 
                        "Understand Better with AI Support",
                        2000,
                        "",
                        100
                      ]}
                      wrapper="span"
                      cursor={true}
                      repeat={Infinity}
                      speed={50}
                      deletionSpeed={50}
                      className="typed-text"
                    />
                    )}
                  </motion.span>
                </motion.div>
              </h1>

              <motion.p 
                className="hero-subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                Your intelligent study companion that adapts to your learning style
              </motion.p>

              <ProcessFlow />

              <motion.div 
                className="hero-cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                {/* <Link to="/signup">
                  <motion.button 
                    className="cta-button"
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 8px 30px rgba(0,198,255,0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="cta-text">Start Learning Now</span>
                    <motion.span 
                      className="cta-arrow"
                      animate={{ x: [0, 5, 0] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      →
                    </motion.span>
                  </motion.button>
                </Link> */}
              </motion.div>
            </motion.div>
          </div>
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

      <Footer />
    </div>
  )
}

export default Landing