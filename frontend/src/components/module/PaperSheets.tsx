'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface PaperSheetsProps {
  /** HTML obsah learn bloku (listy oddělené značkou <hr> = zalomení listu) */
  html: string;
  /** Třída pro vnitřní obsah (styly rendrovaného HTML) */
  contentClassName?: string;
}

/**
 * Vykreslí obsah modulu jako samostatné "listy" (jako stránky ve Wordu).
 * Obsah se dělí podle ručních zalomení listu, která lektor vkládá v editoru
 * (značka <hr>). Listy jsou bílé karty oddělené šedou mezerou; vpravo nahoře
 * se podle scrollu ukazuje, na kterém listu student právě je.
 */
export function PaperSheets({ html, contentClassName = 'module-content' }: PaperSheetsProps) {
  // Rozdělení na listy podle značek zalomení (<hr ...>)
  const sheets = useMemo(() => {
    const parts = html
      .split(/<hr[^>]*>/i)
      .map(part => part.trim())
      .filter(part => part.length > 0);
    return parts.length > 0 ? parts : [''];
  }, [html]);

  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);

  // Sledování, na kterém listu student je (podle scrollu). Capture zachytí
  // i scroll uvnitř vnořeného scrollovacího kontejneru obsahu.
  useEffect(() => {
    if (sheets.length <= 1) {
      setActiveSheet(0);
      return;
    }
    const onScroll = () => {
      const offset = 140; // px od horního okraje, co považujeme za "aktuální"
      let idx = 0;
      for (let i = 0; i < sheetRefs.current.length; i++) {
        const el = sheetRefs.current[i];
        if (el && el.getBoundingClientRect().top - offset <= 0) idx = i;
      }
      setActiveSheet(idx);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [sheets.length]);

  return (
    <div className="relative flex flex-col gap-5 sm:gap-6">
      {sheets.length > 1 && (
        <div className="sticky top-2 z-20 self-end pointer-events-none">
          <span className="inline-block bg-gray-900/80 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
            List {activeSheet + 1} z {sheets.length}
          </span>
        </div>
      )}

      {sheets.map((sheetHtml, i) => (
        <div
          key={i}
          ref={el => { sheetRefs.current[i] = el; }}
          className="paper-sheet p-6 sm:p-10"
        >
          <div className={contentClassName} dangerouslySetInnerHTML={{ __html: sheetHtml }} />
        </div>
      ))}
    </div>
  );
}

export default PaperSheets;
