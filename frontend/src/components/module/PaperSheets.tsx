'use client';

import { useMemo } from 'react';

interface PaperSheetsProps {
  /** HTML obsah learn bloku (listy oddělené značkou <hr> = zalomení listu) */
  html: string;
  /** Třída pro vnitřní obsah (styly rendrovaného HTML) */
  contentClassName?: string;
}

/**
 * Vykreslí obsah modulu jako samostatné "listy" (jako stránky ve Wordu).
 * Obsah se dělí podle ručních zalomení listu, která lektor vkládá v editoru
 * (značka <hr>). Listy jsou bílé karty oddělené šedou mezerou; každý list má
 * dole uprostřed svoje číslo (obdobně jako stránky ve Wordu).
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

  return (
    <div className="relative flex flex-col gap-5 sm:gap-6">
      {sheets.map((sheetHtml, i) => (
        <div key={i} className="paper-sheet p-6 sm:p-10">
          <div className={contentClassName} dangerouslySetInnerHTML={{ __html: sheetHtml }} />
          {sheets.length > 1 && (
            <div className="mt-8 text-center text-xs text-muted-foreground select-none" aria-label={`List ${i + 1} z ${sheets.length}`}>
              {i + 1}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default PaperSheets;
