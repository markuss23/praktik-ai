'use client';

import { motion } from 'motion/react';
import { PartyPopper } from 'lucide-react';
import { useMemo } from 'react';

interface ModuleCompletedCardProps {
  moduleNumber: number;
  moduleTitle: string;
  ctaLabel: string;
  onContinue: () => void;
}

function rng(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/** Konfety padající shora dolů s rotací. */
function ConfettiSprinkle({ count = 30 }: { count?: number }) {
  const palette = ['#85C8A1', '#857AD2', '#B1475C', '#F4B860', '#7BAEE0'];
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const b = i * 11 + 3;
      const left = `${3 + rng(b) * 94}%`;
      const color = palette[i % palette.length];
      const isDot = rng(b + 1) > 0.4;
      const w = isDot ? 5 + Math.round(rng(b + 2) * 7) : 12 + Math.round(rng(b + 3) * 10);
      const h = isDot ? w : 4;
      const delay = rng(b + 4) * 0.7;
      const duration = 1.4 + rng(b + 5) * 1.2;
      const rotate = Math.round(rng(b + 6) * 720) - 360;
      const drift = Math.round(rng(b + 7) * 60) - 30;
      return { left, color, isDot, w, h, delay, duration, rotate, drift, key: i };
    });
  }, [count]);

  return (
    <div className="absolute inset-x-0 top-0 h-44 pointer-events-none overflow-hidden">
      {items.map((it) => (
        <motion.span
          key={it.key}
          className="absolute"
          style={{
            left: it.left,
            top: 0,
            width: it.w,
            height: it.h,
            backgroundColor: it.color,
            borderRadius: it.isDot ? '9999px' : '2px',
          }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 0 }}
          animate={{
            y: 200,
            x: it.drift,
            rotate: it.rotate,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            y: { duration: it.duration, delay: it.delay, ease: 'easeIn' },
            x: { duration: it.duration, delay: it.delay, ease: 'easeIn' },
            rotate: { duration: it.duration, delay: it.delay, ease: 'linear' },
            opacity: {
              duration: it.duration,
              delay: it.delay,
              ease: 'linear',
              times: [0, 0.15, 0.8, 1],
            },
          }}
        />
      ))}
    </div>
  );
}

export function ModuleCompletedCard({
  moduleNumber,
  moduleTitle,
  ctaLabel,
  onContinue,
}: ModuleCompletedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
    >
      <ConfettiSprinkle />

      <div className="relative px-6 sm:px-10 pt-12 pb-8 flex flex-col items-center text-center">
        {/* Animovaný kruh s ikonou */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-5">
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-dashed"
            style={{ borderColor: '#85C8A1' }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(133, 200, 161, 0.15)' }}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.2 }}
          >
            <PartyPopper className="w-10 h-10" style={{ color: '#0F2F1F' }} strokeWidth={1.7} />
          </motion.div>
        </div>

        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] text-white uppercase mb-4"
          style={{ backgroundColor: '#85C8A1' }}
        >
          Modul splněn
        </motion.span>

        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.6 }}
          className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3"
        >
          Modul {moduleNumber} dokončen!
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.7 }}
          className="text-sm sm:text-base text-gray-500 max-w-md mb-6 break-words"
        >
          Právě jste dokončili modul „{moduleTitle}". Skvělá práce!
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.85 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full max-w-md text-white font-semibold py-3.5 px-6 rounded-xl transition-shadow hover:shadow-lg"
          style={{ backgroundColor: '#5BB079' }}
        >
          {ctaLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default ModuleCompletedCard;
