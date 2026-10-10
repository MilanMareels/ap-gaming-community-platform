'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface NoShowTrackerProps {
  count: number;
  limit: number;
  /** Size of each strike in pixels */
  size?: number;
  /** Animate strikes in one by one when they scroll into view */
  animateOnView?: boolean;
}

/** Row of strikes showing how many no-shows count towards a reservation block. */
export function NoShowTracker({ count, limit, size = 44, animateOnView = false }: NoShowTrackerProps) {
  const animateProp = animateOnView ? { whileInView: { scale: 1, opacity: 1 }, viewport: { once: true } } : { animate: { scale: 1, opacity: 1 } };

  return (
    <div className="flex items-center gap-3" role="img" aria-label={`${Math.min(count, limit)} van ${limit} no-shows`}>
      {Array.from({ length: limit }, (_, i) => {
        const filled = i < count;
        return (
          <motion.div
            key={i}
            initial={{ scale: 0.4, opacity: 0 }}
            {...animateProp}
            transition={{ delay: 0.15 + i * 0.15, type: 'spring', stiffness: 260, damping: 16 }}
            style={{ width: size, height: size }}
            className={
              filled
                ? 'rounded-full bg-[#d42422] text-white flex items-center justify-center shadow-[0_0_20px_rgba(212,36,34,0.45)]'
                : 'rounded-full border-2 border-dashed border-white/20 text-gray-500 flex items-center justify-center font-semibold'
            }
          >
            {filled ? <X size={size * 0.5} strokeWidth={3} /> : i + 1}
          </motion.div>
        );
      })}
    </div>
  );
}
