'use client';

import { motion } from 'motion/react';
import { PartyPopper } from 'lucide-react';
import { useMemo } from 'react';

interface ModuleCompletedCardProps {
  /** 1-based pořadí dokončeného modulu v kurzu. */
  moduleNumber: number;
  /** Název dokončeného modulu — zobrazuje se v uvozovkách v textu. */
  moduleTitle: string;
  /** Text tlačítka — liší se podle toho, jestli je další modul, nebo končí kurz. */
  ctaLabel: string;
  /** Akce po kliknutí na CTA. */
  onContinue: () => void;
}

/** Náhodně rozesetý konfeti dekorativní prvek nad ikonou. Pozice jsou
 *  generovány deterministicky z indexu, aby SSR ↔ klient nebyly out-of-sync. */
function ConfettiSprinkle({ count = 22 }: { count?: number }) {
  const palette = ['#85C8A1', '#857AD2', '#B1475C', '#F4B860', '#7BAEE0'];
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      // Deterministický pseudonáhodný generátor (sin-hash) — stejné výsledky
      // při SSR i v klientu, žádný hydration mismatch.
      const seed = (i + 1) * 9301 + 49297;
      const r1 = ((seed * 233280) % 100) / 100;
      const r2 = ((seed * 6481) % 100) / 100;
      const r3 = ((seed * 1234) % 100) / 100;
      const left = `${5 + r1 * 90}%`;
      const top = `${r2 * 60}%`;
      const color = palette[i % palette.length];
      const isDot = r3 > 0.45;
      const size = isDot ? 6 + Math.round(r3 * 6) : 14 + Math.round(r3 * 8);
      return { left, top, color, isDot, size, key: i };
    });
  }, [count]);

  return (
    <div className="absolute inset-x-0 top-0 h-32 pointer-events-none overflow-hidden">
      {items.map((it, idx) => (
        <motion.span
          key={it.key}
          initial={{ opacity: 0, y: -8, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.04 * idx, ease: 'easeOut' }}
          className="absolute"
          style={{
            left: it.left,
            top: it.top,
            width: it.isDot ? it.size : it.size,
            height: it.isDot ? it.size : 4,
            backgroundColor: it.color,
            borderRadius: it.isDot ? '9999px' : '2px',
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
        {/* Animovaný kruh s ikonou — pružinový pop-in + jemný "puls" rámu */}
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
