import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './Hero.css';

const FloatingElement = ({ delay, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay }}
  >
    {children}
  </motion.div>
);

const Hero = () => (
  <section id="home" className="hero-section">
    <div className="hero-background">
      <div className="gradient-overlay"></div>
      <div className="animated-squares"></div>
    </div>
    
    <motion.div className="hero-content">
      <FloatingElement delay={0.2}>
        <h1 className="gradient-text">Transform Your Learning Experience</h1>
      </FloatingElement>

      <FloatingElement delay={0.4}>
        <p className="hero-subtitle">Harness the power of AI to enhance your study sessions</p>
      </FloatingElement>

      <motion.div className="feature-highlights">
        <FloatingElement delay={0.6}>
          <div className="highlight-item">
            <span className="highlight-icon">🚀</span>
            <span>Smart Learning</span>
          </div>
        </FloatingElement>
        
        <FloatingElement delay={0.7}>
          <div className="highlight-item">
            <span className="highlight-icon">🎯</span>
            <span>Personalized Path</span>
          </div>
        </FloatingElement>
        
        <FloatingElement delay={0.8}>
          <div className="highlight-item">
            <span className="highlight-icon">⚡</span>
            <span>Real-time AI</span>
          </div>
        </FloatingElement>
      </motion.div>

      <FloatingElement delay={1}>
        <motion.div
          className="cta-container"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link to="/signup" className="cta-button">
            Get Started
            <span className="cta-arrow">→</span>
          </Link>
        </motion.div>
      </FloatingElement>
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
);

export default Hero;