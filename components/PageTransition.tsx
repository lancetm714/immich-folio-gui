'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  enabled: boolean;
}

/**
 * Provides smooth page transitions using framer-motion.
 * Can be toggled on/off via gallery.yaml.
 */
export function PageTransition({ children, enabled }: PageTransitionProps) {
  const pathname = usePathname();

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{
          duration: 0.4,
          ease: [0.22, 1, 0.36, 1], // Custom "silk-smooth" cubic bezier
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
