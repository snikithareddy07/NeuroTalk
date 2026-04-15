import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Landing.css';

const features = [
  {
    id: 1,
    title: 'Emotion Detection',
    description: 'Advanced AI accurately identifies subtle emotional nuances in your written reflections.',
    icon: '🔮'
  },
  {
    id: 2,
    title: 'Pattern Analysis',
    description: 'Uncover repeating cognitive distortions and understand your deep-rooted thought loops.',
    icon: '🧠'
  },
  {
    id: 3,
    title: 'Trend Tracking',
    description: 'Visualize your mental well-being journey over time with dynamic, interactive charts.',
    icon: '📈'
  },
  {
    id: 4,
    title: 'Smart Suggestions',
    description: 'Receive actionable, personalized coping strategies customized to your current mindset.',
    icon: '💡'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const Landing = () => {
  return (
    <div className="landing-container">
      {/* Background glowing orbs */}
      <div className="glow-orb orb-purple"></div>
      <div className="glow-orb orb-blue"></div>

      <motion.section 
        className="hero-section"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="hero-badge" variants={itemVariants}>
          <span>Introducing NeuroTalk v1.0</span>
        </motion.div>
        
        <motion.h1 className="hero-title" variants={itemVariants}>
          Understand Your Mind,<br />
          <span className="text-gradient">One Message at a Time</span>
        </motion.h1>
        
        <motion.p className="hero-description" variants={itemVariants}>
          Empower your mental well-being with state-of-the-art AI. Dive deep into your thoughts, detect cognitive patterns, and achieve emotional clarity like never before.
        </motion.p>
        
        <motion.div className="hero-cta" variants={itemVariants}>
          <Link to="/signup" className="btn-primary">
            Get Started
            <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/login" className="btn-secondary">
            Sign In
          </Link>
        </motion.div>
      </motion.section>

      <motion.section 
        className="features-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.div className="features-grid">
          {features.map((feature) => (
            <motion.div 
              key={feature.id} 
              className="feature-card"
              variants={itemVariants}
            >
              <div className="feature-icon-wrapper">
                <span className="feature-icon">{feature.icon}</span>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </div>
  );
};

export default Landing;
