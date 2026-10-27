'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  getCourse,
  getCourseGenerationProgress,
  listActiveCourseGenerations,
  type CourseGenerationProgress,
} from '@/lib/api-client';
import { useToast } from '@/components/ui';

/**
 * Sledování AI generování kurzů napříč administrací.
 *
 * Generování běží na serveru jako task nezávislý na stránce; tady se jen
 * polluje průběh. Provider sedí v admin layoutu, takže polling přežije
 * přepínání pohledů i odchod z formuláře. Po refreshi se zeptá backendu, co
 * právě běží, a doplní to o kurzy z localStorage (kdyby generace stihla
 * doběhnout dřív, než se uživatel vrátil — backend už ji mezi běžícími nemá,
 * průběh ale ještě vrátí).
 *
 * O dokončení informuje toastem a DOM událostí COURSE_GENERATION_FINISHED_EVENT
 * (stejný vzor jako REVIEW_COUNT_EVENT v AdminSidebar), na kterou si sedne
 * přehled kurzů (obnoví seznam) i formulář AI tvorby (otevře editor).
 */

export const COURSE_GENERATION_FINISHED_EVENT = 'praktik-ai:course-generation-finished';

export type CourseGenerationOutcome = 'completed' | 'failed' | 'lost';

export interface CourseGenerationFinishedDetail {
  courseId: number;
  title: string | null;
  status: CourseGenerationOutcome;
  error: string | null;
}

export interface TrackedGeneration {
  courseId: number;
  title: string | null;
  progress: CourseGenerationProgress;
}

interface CourseGenerationContextValue {
  /** Kurzy, jejichž generování právě sledujeme (klíč = courseId). */
  generations: ReadonlyMap<number, TrackedGeneration>;
  getProgress: (courseId: number) => CourseGenerationProgress | null;
  isGenerating: (courseId: number) => boolean;
  /** Začne sledovat kurz, jehož generování bylo právě spuštěno. */
  track: (courseId: number, title?: string | null) => void;
}

const STORAGE_KEY = 'praktik-ai:active-course-generations';
// Starší klíč s jediným ID — přečte se jednou a smaže, ať se neztratí generace
// spuštěná před nasazením téhle verze.
const LEGACY_STORAGE_KEY = 'praktik-ai:active-course-generation';

const POLL_INTERVAL_MS = 1500;
// Kolik po sobě jdoucích „pending" odpovědí tolerujeme, než generaci prohlásíme
// za ztracenou. Backend průběh drží jen v paměti: po restartu o kurzu neví a
// vrací „pending" napořád. Těsně po spuštění může jeden tik předběhnout zápis.
const MAX_PENDING_TICKS = 6;

const INITIAL_PROGRESS: CourseGenerationProgress = {
  step: 0,
  total: 5,
  label: 'Spouštění generování',
  status: 'running',
  error: null,
};

interface StoredGeneration {
  courseId: number;
  title: string | null;
}

function readStoredGenerations(): StoredGeneration[] {
  if (typeof window === 'undefined') return [];
  const result: StoredGeneration[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const id = Number((item as { courseId?: unknown })?.courseId);
          if (Number.isFinite(id) && id > 0) {
            const title = (item as { title?: unknown }).title;
            result.push({ courseId: id, title: typeof title === 'string' ? title : null });
          }
        }
      }
    }
    const legacy = Number(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Number.isFinite(legacy) && legacy > 0 && !result.some((g) => g.courseId === legacy)) {
      result.push({ courseId: legacy, title: null });
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage nedostupný (soukromý režim) — bez něj jen nepřežije refresh
  }
  return result;
}

function writeStoredGenerations(items: StoredGeneration[]) {
  if (typeof window === 'undefined') return;
  try {
    if (items.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignorujeme, viz výše
  }
}

function isProgress(value: unknown): value is CourseGenerationProgress {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CourseGenerationProgress).status === 'string' &&
    typeof (value as CourseGenerationProgress).step === 'number'
  );
}

/** Stavový kód z chyby `getCourseGenerationProgress` („API error: 404"). */
function errorStatus(err: unknown): number | null {
  const message = err instanceof Error ? err.message : '';
  const match = message.match(/API error: (\d{3})/);
  return match ? Number(match[1]) : null;
}

const CourseGenerationContext = createContext<CourseGenerationContextValue | null>(null);

export function CourseGenerationProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const router = useRouter();

  // Uložené generace jdou rovnou do výchozího stavu — kdyby se načítaly až
  // efektem, persist-efekt níže by úložiště stihl přepsat prázdným seznamem.
  const [generations, setGenerations] = useState<Map<number, TrackedGeneration>>(
    () => new Map(readStoredGenerations().map((g) => [g.courseId, { ...g, progress: INITIAL_PROGRESS }])),
  );
  // Zrcadlo stavu pro callbacky, které potřebují aktuální název bez re-renderu
  const generationsRef = useRef(generations);
  generationsRef.current = generations;
  const pendingTicks = useRef(new Map<number, number>());

  useEffect(() => {
    writeStoredGenerations(
      Array.from(generations.values()).map(({ courseId, title }) => ({ courseId, title })),
    );
  }, [generations]);

  const setTitle = useCallback((courseId: number, title: string) => {
    setGenerations((prev) => {
      const entry = prev.get(courseId);
      if (!entry || entry.title === title) return prev;
      const next = new Map(prev);
      next.set(courseId, { ...entry, title });
      return next;
    });
  }, []);

  const track = useCallback((courseId: number, title: string | null = null) => {
    pendingTicks.current.delete(courseId);
    setGenerations((prev) => {
      const next = new Map(prev);
      next.set(courseId, {
        courseId,
        title: title ?? prev.get(courseId)?.title ?? null,
        progress: INITIAL_PROGRESS,
      });
      return next;
    });
  }, []);

  // Po mountu (a tedy i po refreshi) doplň generace, o kterých ví backend.
  // Název kurzu dohledáme dodatečně — do toastu a banneru.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let ids: number[] = [];
      try {
        ids = await listActiveCourseGenerations();
      } catch {
        return; // backend nedostupný — zůstanou jen generace z localStorage
      }
      if (cancelled || ids.length === 0) return;
      setGenerations((prev) => {
        const missing = ids.filter((id) => !prev.has(id));
        if (missing.length === 0) return prev;
        const next = new Map(prev);
        for (const id of missing) next.set(id, { courseId: id, title: null, progress: INITIAL_PROGRESS });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const untitled = Array.from(generations.values()).filter((g) => g.title === null);
    if (untitled.length === 0) return;
    let cancelled = false;
    for (const g of untitled) {
      getCourse(g.courseId)
        .then((course) => {
          if (!cancelled) setTitle(g.courseId, course.title);
        })
        .catch(() => {
          // kurz bez názvu v toastu nevadí
        });
    }
    return () => {
      cancelled = true;
    };
    // Spouštět jen při změně množiny sledovaných kurzů, ne při každém tiku průběhu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.from(generations.keys()).join(','), setTitle]);

  const finish = useCallback(
    (courseId: number, status: CourseGenerationOutcome, error: string | null) => {
      const entry = generationsRef.current.get(courseId);
      if (!entry) return;
      pendingTicks.current.delete(courseId);
      setGenerations((prev) => {
        if (!prev.has(courseId)) return prev;
        const next = new Map(prev);
        next.delete(courseId);
        return next;
      });

      const name = entry.title ? `„${entry.title}"` : 'Kurz';
      if (status === 'completed') {
        toast.show({
          variant: 'success',
          title: 'Kurz je vygenerovaný',
          message: `${name} je připravený k úpravám.`,
          durationMs: 8000,
          action: {
            label: 'Otevřít editor',
            onClick: () => router.push(`/admin?view=course-content&courseId=${courseId}`),
          },
        });
      } else if (status === 'failed') {
        toast.show({
          variant: 'error',
          title: 'Generování kurzu selhalo',
          message: `${name}: ${error || 'neznámá chyba'}. V přehledu kurzů ho můžete spustit znovu.`,
          durationMs: 10000,
        });
      } else {
        toast.show({
          variant: 'warning',
          title: 'Generování se nepodařilo obnovit',
          message: `Server o běžícím generování kurzu ${name} neví, nejspíš byl mezitím restartován. V přehledu kurzů ho spusťte znovu.`,
          durationMs: 10000,
        });
      }

      const detail: CourseGenerationFinishedDetail = { courseId, title: entry.title, status, error };
      window.dispatchEvent(new CustomEvent(COURSE_GENERATION_FINISHED_EVENT, { detail }));
    },
    [toast, router],
  );

  const applyProgress = useCallback(
    (courseId: number, result: unknown) => {
      if (!isProgress(result)) {
        // Chyba pollingu: kurz neexistuje nebo není náš → přestat sledovat;
        // cokoli jiného (síť, 5xx) zkusíme příští tik.
        const status = errorStatus(result);
        if (status === 404 || status === 403) finish(courseId, 'lost', null);
        return;
      }
      if (result.status === 'completed') {
        finish(courseId, 'completed', null);
        return;
      }
      if (result.status === 'failed') {
        finish(courseId, 'failed', result.error);
        return;
      }
      if (result.status === 'pending') {
        const ticks = (pendingTicks.current.get(courseId) ?? 0) + 1;
        pendingTicks.current.set(courseId, ticks);
        if (ticks >= MAX_PENDING_TICKS) finish(courseId, 'lost', null);
        return;
      }
      pendingTicks.current.delete(courseId);
      setGenerations((prev) => {
        const entry = prev.get(courseId);
        if (!entry) return prev;
        // Krok nikdy necouvá — dvě odpovědi se mohou předběhnout
        if (result.step < entry.progress.step) return prev;
        const next = new Map(prev);
        next.set(courseId, { ...entry, progress: result });
        return next;
      });
    },
    [finish],
  );

  // Polling běží jen dokud je co sledovat; klíč z ID zajistí, že se interval
  // nerestartuje s každým tikem průběhu.
  const idsKey = useMemo(
    () => Array.from(generations.keys()).sort((a, b) => a - b).join(','),
    [generations],
  );
  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(',').map(Number);
    let cancelled = false;
    let inFlight = false;
    const tick = async () => {
      if (inFlight) return; // při pomalé odpovědi nepřekrývat požadavky
      inFlight = true;
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              return [id, await getCourseGenerationProgress(id)] as const;
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
    void tick();
    const timer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [idsKey, applyProgress]);

  const value = useMemo<CourseGenerationContextValue>(
    () => ({
      generations,
      getProgress: (courseId) => generations.get(courseId)?.progress ?? null,
      isGenerating: (courseId) => generations.has(courseId),
      track,
    }),
    [generations, track],
  );

  return <CourseGenerationContext.Provider value={value}>{children}</CourseGenerationContext.Provider>;
}

const EMPTY_GENERATIONS: ReadonlyMap<number, TrackedGeneration> = new Map();

export function useCourseGeneration(): CourseGenerationContextValue {
  const ctx = useContext(CourseGenerationContext);
  if (!ctx) {
    // Mimo admin layout (např. testy) se nic nesleduje; generování na serveru
    // tím není dotčeno.
    return {
      generations: EMPTY_GENERATIONS,
      getProgress: () => null,
      isGenerating: () => false,
      track: () => {},
    };
  }
  return ctx;
}
