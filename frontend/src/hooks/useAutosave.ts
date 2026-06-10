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
export function useAutosave<T>(
  value: T,
  save: () => Promise<void>,
  options: UseAutosaveOptions = {},
): { status: SaveStatus } {
  const { delay = 500, enabled = true } = options;

  const [status, setStatus] = useState<SaveStatus>('idle');

  // Poslední uložený snapshot pro porovnání změn.
  const savedSnapshotRef = useRef<string | null>(null);
  // Nejnovější hodnota a callback (pro flush na unmount).
  const valueRef = useRef(value);
  valueRef.current = value;
  const saveRef = useRef(save);
  saveRef.current = save;
  // Neuložená změna + běžící timery.
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uloží nejnovější hodnotu (volá se z timeru i z flushe na unmount).
  const runSaveRef = useRef(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    const snapshot = JSON.stringify(valueRef.current);
    setStatus('saving');
    try {
      await saveRef.current();
      savedSnapshotRef.current = snapshot;
      dirtyRef.current = false;
      setStatus('saved');
      if (savedResetRef.current) clearTimeout(savedResetRef.current);
      savedResetRef.current = setTimeout(() => setStatus('idle'), 2000);
    } catch {
      // Necháme dirty, zkusí to příští změna/flush.
      setStatus('pending');
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

    dirtyRef.current = true;
    setStatus('pending');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void runSaveRef.current();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled, delay]);

  // Flush na unmount.
  useEffect(() => {
    const runSave = runSaveRef.current;
    const dirty = dirtyRef;
    const savedReset = savedResetRef;
    return () => {
      if (savedReset.current) clearTimeout(savedReset.current);
      if (dirty.current) void runSave();
    };
  }, []);

  return { status };
}
