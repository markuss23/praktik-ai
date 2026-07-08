import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved';

interface UseAutosaveOptions {
  // Prodleva (ms) od poslední změny do uložení. Výchozí 500.
  delay?: number;
  // Dokud je false, hook nic nedělá (např. během inicializace dat).
  enabled?: boolean;
}

// Debounced autosave: po `delay` ms od poslední změny zavolá save().
// Initial hodnotu přeskočí, při unmountu doulží neuloženou změnu (flush).
// "Uloženo" hlásí jen když aktuální hodnota opravdu odpovídá uložené;
// změny během ukládání se po dokončení uloží znovu.
export function useAutosave<T>(
  value: T,
  save: () => Promise<void>,
  options: UseAutosaveOptions = {},
): { status: SaveStatus } {
  const { delay = 500, enabled = true } = options;

  const [status, setStatus] = useState<SaveStatus>('idle');

  // Poslední úspěšně uložený snapshot.
  const savedSnapshotRef = useRef<string | null>(null);
  // Nejnovější hodnota / callback / delay (pro běh mimo render).
  const valueRef = useRef(value);
  valueRef.current = value;
  const saveRef = useRef(save);
  saveRef.current = save;
  const delayRef = useRef(delay);
  delayRef.current = delay;

  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSaveRef = useRef(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (savingRef.current) return; // už běží; po dokončení se znovu zkontroluje

    const snapshot = JSON.stringify(valueRef.current);
    if (snapshot === savedSnapshotRef.current) return; // není co ukládat

    savingRef.current = true;
    setStatus('saving');
    try {
      await saveRef.current();
      savedSnapshotRef.current = snapshot;
    } catch {
      savingRef.current = false;
      setStatus('pending'); // necháme neuložené, zkusí příští změna/flush
      return;
    }
    savingRef.current = false;

    // Změnilo se něco během ukládání? Pokud ano, ulož znovu.
    if (JSON.stringify(valueRef.current) === savedSnapshotRef.current) {
      setStatus('saved');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('pending');
      timerRef.current = setTimeout(() => void runSaveRef.current(), delayRef.current);
    }
  });

  useEffect(() => {
    if (!enabled) return;

    const snapshot = JSON.stringify(value);

    // První běh po zapnutí: nastav baseline, neukládej.
    if (savedSnapshotRef.current === null) {
      savedSnapshotRef.current = snapshot;
      return;
    }

    // Beze změny.
    if (snapshot === savedSnapshotRef.current) return;

    setStatus('pending');
    // Když právě běží uložení, nový timer neplánuj – přeplánuje se po jeho dokončení.
    if (!savingRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void runSaveRef.current(), delay);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled, delay]);

  // Flush na unmount – ať se rozepsaný obsah neztratí při odchodu z editace.
  useEffect(() => {
    const runSave = runSaveRef.current;
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (JSON.stringify(valueRef.current) !== savedSnapshotRef.current) void runSave();
    };
  }, []);

  return { status };
}
