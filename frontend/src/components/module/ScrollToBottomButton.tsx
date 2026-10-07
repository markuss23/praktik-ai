'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown } from 'lucide-react';

interface ScrollToBottomButtonProps {
  /** Vnitřní scrollovací kontejner obsahu (na mobilu scrolluje window). */
  targetRef: React.RefObject<HTMLDivElement | null>;
}

/** Kolik px před koncem se tlačítko skryje — u konce už není kam scrollovat. */
const HIDE_THRESHOLD = 160;

/**
 * Levitující kolečko vpravo dole, které sjede na konec obsahu příručky.
 * Zobrazuje se jen dokud je kam scrollovat; z-30 je pod poznámkovým
 * panelem (z-40), aby ho otevřené poznámky překryly.
 */
export function ScrollToBottomButton({ targetRef }: ScrollToBottomButtonProps) {
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    const el = targetRef.current;
    const containerRemaining = el ? el.scrollHeight - el.scrollTop - el.clientHeight : 0;
    const doc = document.documentElement;
    const windowRemaining = doc.scrollHeight - window.scrollY - window.innerHeight;
    setVisible(Math.max(containerRemaining, windowRemaining) > HIDE_THRESHOLD);
  }, [targetRef]);

  // Capture zachytí i scroll vnitřního kontejneru. Výšku obsahu hlídá
  // ResizeObserver na dětech kontejneru (mění se při přepnutí části i po
  // načtení obrázků); MutationObserver ho po výměně obsahu znovu připojí.
  useEffect(() => {
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    const el = targetRef.current;
    let resizeObserver: ResizeObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(update);
      const observeChildren = () => {
        resizeObserver?.disconnect();
        Array.from(el.children).forEach((child) => resizeObserver?.observe(child));
      };
      observeChildren();
      mutationObserver = new MutationObserver(() => {
        observeChildren();
        update();
      });
      mutationObserver.observe(el, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [update, targetRef]);

  const scrollToBottom = () => {
    const el = targetRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToBottom}
          aria-label="Sjet na konec stránky"
          title="Sjet na konec"
          className="fixed bottom-6 right-5 z-30 flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground border border-border shadow-lg hover:text-gradient-r hover:shadow-xl transition-colors"
        >
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="flex"
          >
            <ArrowDown size={18} />
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default ScrollToBottomButton;
