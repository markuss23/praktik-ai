import DOMPurify, { type Config } from 'dompurify';

let hooksInstalled = false;

/**
 * dulezite:
 * Vyčistí HTML z backendu (obsah modulu) před vložením přes `dangerouslySetInnerHTML`.
 * Backend obsah nijak nekontroluje a lektor ho může uložit přímo přes API, takže
 * bez toho by `<img onerror>` / `<script>` běžel studentům i garantovi při schvalování
 * a mohl ukrást tokeny z localStorage.
 *
 * Na serveru vrací prázdný řetězec — DOMPurify potřebuje DOM a obsah modulu se
 * stejně načítá až na klientu.
 *
 * `config` zúží povolené tagy (např. odpovědi AI mentora).
 */
export function sanitizeHtml(html: string, config?: Config): string {
  if (typeof window === 'undefined') return '';

  if (!hooksInstalled) {
    // `target` DOMPurify standardně zahazuje; necháme ho, ale nové okno nesmí dostat `window.opener`.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.hasAttribute('target')) {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    hooksInstalled = true;
  }

  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'], ...config });
}
