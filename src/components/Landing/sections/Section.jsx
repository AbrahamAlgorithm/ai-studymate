import React, { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';

const Section = ({ id, title, children, className = '' }) => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <motion.section
      ref={ref}
      id={id}
      className={`section ${className}`}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <motion.h2
        variants={{
          hidden: { opacity: 0, x: -20 },
          visible: { opacity: 1, x: 0 }
        }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {title}
      </motion.h2>
      {children}
    </motion.section>
  );
};

export default React.memo(Section);