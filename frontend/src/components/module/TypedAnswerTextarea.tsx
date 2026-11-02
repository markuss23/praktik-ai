'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

// Odpověď v testu se jen píše. Víc znaků najednou než slovo z našeptávače
// nebo opravy překlepu = vložený text (schránka mobilní klávesnice,
// rozšíření prohlížeče, automatické vyplnění). Serverová kontrola rychlosti
// psaní (typing_guard.py) je pojistka pro obejití v prohlížeči.
const MAX_INSERT_CHARS = 30;
const BLOCKED_INPUT_TYPES = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
]);

interface TypedAnswerTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  minHeight?: number;
}

/**
 * Pole pro psanou odpověď — vkládání (klávesnice, kontextové menu i mobil
 * spouští `paste`), kopírování, vyjmutí a přetažení textu dovnitř i ven jsou
 * zablokované.
 */
export function TypedAnswerTextarea({
  value,
  onChange,
  disabled,
  placeholder = 'Napište svou odpověď...',
  rows = 8,
  minHeight = 200,
}: TypedAnswerTextareaProps) {
  const noteId = useId();
  // Pokus o kopírování/vložení — ukáže se vysvětlení, proč se nic nestalo.
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const blockClipboard = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setClipboardBlocked(true);
  };
  // Undo/redo smí vrátit i delší, dřív napsaný úsek — onChange ho pak nebere jako vložení.
  const allowLongChangeRef = useRef(false);
  // Nativní `beforeinput` zná typ vstupu (vložení, přetažení…) a dá se zrušit
  // dřív, než se text vůbec objeví. Callback ref vrací úklid (React 19).
  const guardAnswerInput = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType.startsWith('history')) {
        allowLongChangeRef.current = true;
        return;
      }
      const inserted = e.data ?? e.dataTransfer?.getData('text/plain') ?? '';
      if (BLOCKED_INPUT_TYPES.has(e.inputType) || inserted.length > MAX_INSERT_CHARS) {
        e.preventDefault();
        setClipboardBlocked(true);
      }
    };
    el.addEventListener('beforeinput', onBeforeInput);
    return () => el.removeEventListener('beforeinput', onBeforeInput);
  }, []);

  return (
    <>
      <Textarea
        ref={guardAnswerInput}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          const allowLong = allowLongChangeRef.current;
          allowLongChangeRef.current = false;
          // Poslední pojistka: změna, kterou nevyvolal uživatel (skript,
          // rozšíření), nebo skok o víc znaků, než se dá napsat jedním
          // úhozem (vložení, které beforeinput zrušit nejde — IME,
          // mobilní klávesnice). Řízené pole pak React vrátí na původní text.
          if (!e.nativeEvent.isTrusted || (!allowLong && next.length - value.length > MAX_INSERT_CHARS)) {
            setClipboardBlocked(true);
            return;
          }
          onChange(next);
          setClipboardBlocked(false);
        }}
        onPaste={blockClipboard}
        onCopy={blockClipboard}
        onCut={blockClipboard}
        onDrop={blockClipboard}
        onDragStart={blockClipboard}
        aria-describedby={clipboardBlocked ? noteId : undefined}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        style={{ minHeight, resize: 'vertical' }}
        className={cn("field-sizing-fixed min-h-0", "w-full border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30 mb-3")}
      />
      {clipboardBlocked && (
        <p id={noteId} role="status" className="-mt-1 mb-3 text-xs text-muted-foreground">
          Kopírování a vkládání je vypnuté — odpověď napište vlastními slovy.
        </p>
      )}
    </>
  );
}
