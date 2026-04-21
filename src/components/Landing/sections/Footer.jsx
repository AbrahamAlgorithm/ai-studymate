import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <motion.footer 
      className="footer"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>AI StudyMate</h3>
          <p>Transforming education through artificial intelligence</p>
          <div className="social-links">
            {['twitter', 'github', 'linkedin', 'discord'].map((platform) => (
              <motion.a 
                key={platform}
                href={`#${platform}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className={`ri-${platform}-fill`}></i>
              </motion.a>
            ))}
          </div>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h4>Platform</h4>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/enterprise">Enterprise</Link>
            <Link to="/security">Security</Link>
          </div>

          <div className="link-group">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
        </div>

        <div className="footer-newsletter">
          <h4>Stay Updated</h4>
          <p>Subscribe to our newsletter for AI learning tips and updates</p>
          <div className="newsletter-form">
            <input type="email" placeholder="Enter your email" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Subscribe
            </motion.button>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;