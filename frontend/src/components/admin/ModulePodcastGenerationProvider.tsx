'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Module, PodcastGenerationProgressResponse } from '@/api';
import { generateModulePodcast, getModule, getModulePodcastProgress } from '@/lib/api-client';
import { readApiErrorStatus } from '@/lib/api-error';
import { useToast } from '@/components/ui';

// Sledovani generovani podcastu modulu napric administraci. Generovani bezi na serveru,
// provider v admin layoutu jen polluje prubeh, takze prezije prepnuti modulu i kroku.
// O dokonceni informuje toastem a DOM udalosti MODULE_PODCAST_FINISHED_EVENT.

export const MODULE_PODCAST_FINISHED_EVENT = 'praktik-ai:module-podcast-finished';

export interface ModulePodcastFinishedDetail {
  moduleId: number;
  status: 'completed' | 'failed';
  error: string | null;
  // Modul s novym prepisem; chybi, kdyz se ho po dokonceni nepodarilo nacist
  module?: Module;
}

interface TrackedPodcast {
  title: string;
  progress: PodcastGenerationProgressResponse;
}

interface ModulePodcastGenerationContextValue {
  // Prubeh bezici generace; null = nic nebezi
  getProgress: (moduleId: number) => PodcastGenerationProgressResponse | null;
  // Chyba generace, ktera selhala v tomto sezeni
  getError: (moduleId: number) => string | null;
  start: (moduleId: number, title: string) => Promise<void>;
  // Po otevreni modulu se zepta backendu, jestli generovani nebezi (napr. po refreshi)
  resume: (moduleId: number, title: string) => void;
  // Podcast je hotovy, ale modul se nepodarilo nacist; generovat znovu by se platilo zbytecne
  isUnloaded: (moduleId: number) => boolean;
  // Znovu nacte modul po isUnloaded; true = povedlo se (udalost s modulem uz odesla)
  reload: (moduleId: number) => Promise<boolean>;
  // Dotazy na prubeh opakovane selhavaji, polling ale jeste bezi
  isFailing: (moduleId: number) => boolean;
}

const POLL_INTERVAL_MS = 2000;
// "pending" po spusteni = server o generovani nevi (restart), sledovani se ukonci
const MAX_PENDING_TICKS = 5;
// Server nebo sit nedostupne cca minutu -> sledovani se ukonci
const MAX_ERROR_TICKS = 30;
// Od tolika chyb za sebou ukazuje prubeh upozorneni na vypadek spojeni
const FAILING_TICKS = 3;
// Nacteni hotoveho prepisu: pocet pokusu, pauza mezi nimi a timeout jednoho pokusu
const REFRESH_ATTEMPTS = 3;
const REFRESH_DELAY_MS = 1500;
const REFRESH_TIMEOUT_MS = 15000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Zaseknuty request nesmi nechat panel navzdy v "Nacitani hotoveho podcastu"
function getModuleWithTimeout(moduleId: number): Promise<Module> {
  return Promise.race([
    getModule(moduleId),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), REFRESH_TIMEOUT_MS)),
  ]);
}

const withoutId = (set: Set<number>, id: number) => {
  if (!set.has(id)) return set;
  const next = new Set(set);
  next.delete(id);
  return next;
};

const dispatchFinished = (detail: ModulePodcastFinishedDetail) => {
  window.dispatchEvent(new CustomEvent(MODULE_PODCAST_FINISHED_EVENT, { detail }));
};

const ModulePodcastGenerationContext = createContext<ModulePodcastGenerationContextValue | null>(null);

export function ModulePodcastGenerationProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [tracked, setTracked] = useState<Map<number, TrackedPodcast>>(new Map());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [unloaded, setUnloaded] = useState<Set<number>>(new Set());
  const [failing, setFailing] = useState<Set<number>>(new Set());
  const trackedRef = useRef(tracked);
  trackedRef.current = tracked;
  const pendingTicks = useRef(new Map<number, number>());
  const errorTicks = useRef(new Map<number, number>());
  // Hotove generace, u kterych se jeste nacita prepis; polling je preskakuje
  const finishingRef = useRef(new Set<number>());

  const track = useCallback((moduleId: number, title: string, progress: PodcastGenerationProgressResponse) => {
    pendingTicks.current.delete(moduleId);
    errorTicks.current.delete(moduleId);
    setUnloaded((prev) => withoutId(prev, moduleId));
    setErrors((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
    setTracked((prev) => new Map(prev).set(moduleId, { title, progress }));
  }, []);

  const untrack = useCallback((moduleId: number) => {
    pendingTicks.current.delete(moduleId);
    errorTicks.current.delete(moduleId);
    finishingRef.current.delete(moduleId);
    setFailing((prev) => withoutId(prev, moduleId));
    setTracked((prev) => {
      if (!prev.has(moduleId)) return prev;
      const next = new Map(prev);
      next.delete(moduleId);
      return next;
    });
  }, []);

  // Hotovy podcast: nejdriv nacist modul s prepisem, az pak ukoncit sledovani.
  // Panel tak mezi toastem a daty neukaze znovu prazdny stav s tlacitkem generovani.
  const complete = useCallback(
    async (moduleId: number, entry: TrackedPodcast) => {
      if (finishingRef.current.has(moduleId)) return;
      finishingRef.current.add(moduleId);
      const total = entry.progress.total || 4;
      setTracked((prev) => {
        const current = prev.get(moduleId);
        if (!current) return prev;
        return new Map(prev).set(moduleId, {
          ...current,
          progress: { ...current.progress, step: total, total, label: 'Načítání hotového podcastu', status: 'running' },
        });
      });

      let module: Module | undefined;
      for (let attempt = 0; attempt < REFRESH_ATTEMPTS && !module; attempt++) {
        try {
          module = await getModuleWithTimeout(moduleId);
        } catch {
          if (attempt < REFRESH_ATTEMPTS - 1) await sleep(REFRESH_DELAY_MS);
        }
      }
      untrack(moduleId);

      if (module) {
        toast.show({ variant: 'success', title: 'Podcast je hotový', message: `Modul „${entry.title}“ má nový podcast.` });
        dispatchFinished({ moduleId, status: 'completed', error: null, module });
        return;
      }
      setUnloaded((prev) => new Set(prev).add(moduleId));
      toast.show({
        variant: 'warning',
        title: 'Podcast je hotový',
        message: `Modul „${entry.title}“ má nový podcast, ale nepodařilo se ho načíst. V panelu ho načtěte znovu.`,
        durationMs: 10000,
      });
    },
    [toast, untrack],
  );

  const finish = useCallback(
    (moduleId: number, status: 'completed' | 'failed' | 'lost', error: string | null) => {
      const entry = trackedRef.current.get(moduleId);
      if (!entry || finishingRef.current.has(moduleId)) return;
      if (status === 'completed') {
        void complete(moduleId, entry);
        return;
      }
      untrack(moduleId);

      if (status === 'lost') {
        toast.show({
          variant: 'warning',
          title: 'Průběh podcastu se nepodařilo sledovat',
          message: `Modul „${entry.title}“: server o generování neví nebo neodpovídá. Zkontrolujte modul později, případně generování spusťte znovu.`,
          durationMs: 10000,
        });
        return;
      }
      const message = error || 'Neznámá chyba';
      setErrors((prev) => new Map(prev).set(moduleId, message));
      toast.show({
        variant: 'error',
        title: 'Podcast se nepodařilo vytvořit',
        message: `Modul „${entry.title}“: ${message}`,
        durationMs: 10000,
      });
      dispatchFinished({ moduleId, status: 'failed', error });
    },
    [toast, complete, untrack],
  );

  const applyProgress = useCallback(
    (moduleId: number, result: unknown) => {
      if (finishingRef.current.has(moduleId)) return;
      if (!result || typeof result !== 'object' || !('status' in result)) {
        // Modul neexistuje nebo neni nas -> konec; jine chyby se zkousi do limitu
        const status = readApiErrorStatus(result);
        if (status === 404 || status === 403) {
          finish(moduleId, 'lost', null);
          return;
        }
        const ticks = (errorTicks.current.get(moduleId) ?? 0) + 1;
        errorTicks.current.set(moduleId, ticks);
        if (ticks === FAILING_TICKS) setFailing((prev) => new Set(prev).add(moduleId));
        if (ticks >= MAX_ERROR_TICKS) finish(moduleId, 'lost', null);
        return;
      }
      errorTicks.current.delete(moduleId);
      setFailing((prev) => withoutId(prev, moduleId));
      const progress = result as PodcastGenerationProgressResponse;
      if (progress.status === 'completed') return finish(moduleId, 'completed', null);
      if (progress.status === 'failed') return finish(moduleId, 'failed', progress.error ?? null);
      if (progress.status === 'pending') {
        const ticks = (pendingTicks.current.get(moduleId) ?? 0) + 1;
        pendingTicks.current.set(moduleId, ticks);
        if (ticks >= MAX_PENDING_TICKS) finish(moduleId, 'lost', null);
        return;
      }
      pendingTicks.current.delete(moduleId);
      setTracked((prev) => {
        const entry = prev.get(moduleId);
        // Krok necouva, dve odpovedi se mohou predbehnout
        if (!entry || progress.step < entry.progress.step) return prev;
        return new Map(prev).set(moduleId, { ...entry, progress });
      });
    },
    [finish],
  );

  // Polling bezi jen dokud je co sledovat; klic z ID interval nerestartuje s kazdym tikem
  const idsKey = useMemo(() => Array.from(tracked.keys()).sort((a, b) => a - b).join(','), [tracked]);
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(',').map(Number);
    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const results = await Promise.all(
          ids
            .filter((id) => !finishingRef.current.has(id))
            .map(async (id) => {
              try {
                return [id, await getModulePodcastProgress(id)] as const;
              } catch (err) {
                return [id, err] as const;
              }
            }),
        );
        if (cancelled) return;
        for (const [id, result] of results) applyProgress(id, result);
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [idsKey, applyProgress]);

  const start = useCallback(
    async (moduleId: number, title: string) => {
      // Chyby (napr. 400 u kurzu ve schvalovani) jdou volajicimu
      const progress = await generateModulePodcast(moduleId);
      if (progress.status === 'failed') {
        setErrors((prev) => new Map(prev).set(moduleId, progress.error || 'Neznámá chyba'));
        return;
      }
      track(moduleId, title, { ...progress, status: 'running' });
    },
    [track],
  );

  const resume = useCallback(
    (moduleId: number, title: string) => {
      if (trackedRef.current.has(moduleId)) return;
      getModulePodcastProgress(moduleId)
        .then((progress) => {
          if (progress.status === 'running' && !trackedRef.current.has(moduleId)) track(moduleId, title, progress);
        })
        .catch(() => {
          // bez prubehu panel ukaze jen ulozeny stav modulu
        });
    },
    [track],
  );

  const reload = useCallback(async (moduleId: number) => {
    try {
      const module = await getModuleWithTimeout(moduleId);
      setUnloaded((prev) => withoutId(prev, moduleId));
      dispatchFinished({ moduleId, status: 'completed', error: null, module });
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<ModulePodcastGenerationContextValue>(
    () => ({
      getProgress: (moduleId) => tracked.get(moduleId)?.progress ?? null,
      getError: (moduleId) => errors.get(moduleId) ?? null,
      start,
      resume,
      isUnloaded: (moduleId) => unloaded.has(moduleId),
      reload,
      isFailing: (moduleId) => failing.has(moduleId),
    }),
    [tracked, errors, start, resume, unloaded, reload, failing],
  );

  return <ModulePodcastGenerationContext.Provider value={value}>{children}</ModulePodcastGenerationContext.Provider>;
}

export function useModulePodcastGeneration(): ModulePodcastGenerationContextValue {
  const ctx = useContext(ModulePodcastGenerationContext);
  if (!ctx) throw new Error('useModulePodcastGeneration musí být uvnitř ModulePodcastGenerationProvider');
  return ctx;
}
