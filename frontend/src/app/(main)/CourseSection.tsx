'use client';

import { CatalogSelect, CourseCard, CourseRow, Button, Input } from "@/components/ui";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui-kit/segmented-control";
import { LynxMascotUnplugged } from "@/components/layout/LynxMascotUnplugged";
import { getCourses, getMyEnrollments, getCourseBlocks, getCourseSubjects } from "@/lib/api-client";
import { MyEnrollment, CourseBlock, CourseSubject, Course } from "@/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Loader2, RotateCw } from "lucide-react";
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import { MOCK_PROGRESS, filterMockCourses } from "./courseMocks";

/** Karty: 2 řádky × 3 karty. Řádky jsou nízké, vejde se jich víc. */
const PAGE_SIZE = { grid: 6, rows: 10 } as const;

type ViewMode = keyof typeof PAGE_SIZE;

/** Volba zobrazení se pamatuje per prohlížeč — jen pohodlí, ne stav. */
const VIEW_STORAGE_KEY = 'praktikai:courses:view';

type ErrorKind = 'backend-down' | 'unauthorized' | 'server-error';

const ERROR_COPY: Record<ErrorKind, { title: string; text: string }> = {
  'backend-down': {
    title: 'Backend není dostupný',
    text: 'Nepodařilo se připojit k API serveru. Ujistěte se, že backend běží a je dostupný.',
  },
  unauthorized: {
    title: 'Přístup odepřen',
    text: 'Tento obsah není veřejně dostupný. Pro zobrazení kurzů se prosím přihlaste.',
  },
  'server-error': {
    title: 'Chyba serveru',
    text: 'Server vrátil neočekávanou chybu. Zkuste to prosím znovu.',
  },
};

/** Filtry a přepínač leží na šedé stránce — bílá výplň je od ní odliší. */
const FIELD = 'bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30';

const GRID_CLASS = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6';
/** Řádky leží v jedné bílé ploše, oddělené vlasovou linkou. */
const ROWS_CLASS = 'divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm';

function classifyError(err: unknown): ErrorKind {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response: Response }).response?.status;
    if (status === 401 || status === 403) return 'unauthorized';
    return 'server-error';
  }
  return 'backend-down';
}

function CourseCardSkeleton() {
  return (
    <div
      className="bg-card overflow-hidden flex flex-col animate-pulse"
      style={{ width: '100%', maxWidth: '590px', height: '530px', borderRadius: '8px', border: '1px solid var(--border)' }}
    >
      <div style={{ width: '100%', height: '226px' }} className="bg-muted" />
      <div className="flex flex-col p-6 grow">
        <div className="h-6 bg-muted rounded w-3/4 mb-3" />
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-4 bg-muted rounded w-5/6 mb-2" />
        <div className="h-4 bg-muted rounded w-2/3 mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-6 bg-muted rounded-full w-20" />
        </div>
        <div className="mt-auto">
          <div className="h-12 bg-muted rounded-md w-full" />
        </div>
      </div>
    </div>
  );
}

function CourseRowSkeleton() {
  return (
    <li className="flex animate-pulse items-center gap-4 px-4 py-4 sm:px-5">
      <div className="h-14 w-20 shrink-0 rounded-md bg-muted sm:h-16 sm:w-28" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-1/2 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
      <div className="hidden h-9 w-28 rounded-md bg-muted sm:block" />
    </li>
  );
}

/** Karta čte i legacy pole `id`/`name`, která generovaný `Course` nemá. */
type CourseListItem = Course & Partial<{ id: number | string; name: string }>;

export default function CourseSection() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [usingMocks, setUsingMocks] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);

  // Stránkování — uživatel vidí vždy max PAGE_SIZE karet. Klik na šipku
  // *přepne* na další stránku (předchozí karty zmizí), takže na obrazovce
  // zůstává konstantní počet kurzů. Filtry resetují na první stránku.
  const [pageIndex, setPageIndex] = useState(0);
  const [paging, setPaging] = useState(false);

  const loadCourses = useCallback(async (params?: {
    textSearch?: string;
    courseBlockId?: number;
    courseSubjectId?: number;
  }) => {
    try {
      setErrorKind(null);
      setLoading(true);
      const data = await getCourses({
        isPublished: true,
        textSearch: params?.textSearch || undefined,
        courseBlockId: params?.courseBlockId,
        courseSubjectId: params?.courseSubjectId,
      });
      setCourses(data);
      setUsingMocks(false);
    } catch (err) {
      // Bez backendu se ve vývoji katalog vyplní ukázkami (courseMocks.ts),
      // aby šlo ladit karty i řádky. V produkci zůstává chybový stav.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Courses API unavailable, showing mock courses:', err);
        setCourses(filterMockCourses(params?.textSearch));
        setUsingMocks(true);
        return;
      }
      console.error('Failed to fetch courses:', err);
      setErrorKind(classifyError(err));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'grid' || saved === 'rows') setView(saved);
    } catch {
      // Bez localStorage (privátní okno apod.) zůstávají karty.
    }
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    setPageIndex(0);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Volba se jen nezapamatuje.
    }
  };

  useEffect(() => {
    // Load filter catalogs
    getCourseBlocks().then(setBlocks).catch(() => setBlocks([]));
    getCourseSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getMyEnrollments()
      .then(setEnrollments)
      .catch(() => setEnrollments([]));
  }, [isAuthenticated]);

  // Debounced search + filter apply. První běh (mount) se nedebouncuje —
  // jinak by homepage čekala 500 ms, než vůbec odešle první dotaz na kurzy.
  const firstFilterRun = useRef(true);
  useEffect(() => {
    const delay = firstFilterRun.current ? 0 : 500;
    firstFilterRun.current = false;
    const timeout = setTimeout(() => {
      loadCourses({
        textSearch: search || undefined,
        courseBlockId: selectedBlockId,
        courseSubjectId: selectedSubjectId,
      });
      // Po každé změně filtrů se vracíme na první stránku.
      setPageIndex(0);
    }, delay);
    return () => clearTimeout(timeout);
  }, [search, selectedBlockId, selectedSubjectId, loadCourses]);

  const handleReset = () => {
    setSearch('');
    setSelectedBlockId(undefined);
    setSelectedSubjectId(undefined);
  };

  // Krátké "fake" zpoždění aby přepínač působil jako akce, ne skok;
  // AnimatePresence postará o fade-out starých karet a fade-in nových.
  const goToPage = (next: number) => {
    if (paging) return;
    setPaging(true);
    setTimeout(() => {
      setPageIndex(next);
      setPaging(false);
    }, 220);
  };

  const pageSize = PAGE_SIZE[view];
  const totalPages = Math.max(1, Math.ceil(courses.length / pageSize));
  // Bezpečný clamp — kdyby se filtrem počet stránek snížil pod aktuální index.
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleCourses = courses.slice(
    safePageIndex * pageSize,
    (safePageIndex + 1) * pageSize,
  );

  const retry = () =>
    loadCourses({
      textSearch: search || undefined,
      courseBlockId: selectedBlockId,
      courseSubjectId: selectedSubjectId,
    });

  /** Společné props pro kartu i řádek — průběh ze zápisů, u ukázek z MOCK_PROGRESS. */
  const itemProps = (course: CourseListItem) => {
    const courseId = course.courseId || course.id;
    const mock = usingMocks ? MOCK_PROGRESS[course.courseId] : undefined;
    const enrollment = usingMocks ? undefined : enrollments.find(e => e.courseId === courseId);
    return {
      id: String(courseId),
      title: course.title || course.name || '',
      description: course.description || '',
      duration: course.durationMinutes ?? (course.modulesCount ? course.modulesCount * 20 : 60),
      difficulty: course.difficulty,
      completedModules: mock?.completedModules ?? enrollment?.completedModules ?? 0,
      totalModules: course.modulesCount || 0,
      isEnrolled: !!(mock || enrollment),
      isCompleted: !!(mock?.completed || enrollment?.completedAt),
    };
  };
  const canPrev = safePageIndex > 0;
  const canNext = safePageIndex < totalPages - 1;

  return (
    <div className="bg-[#F0F0F0] py-8 sm:py-12 lg:py-16">
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] sm:text-3xl">Kurzy</h2>
            <p className="mt-1 min-h-5 text-sm text-muted-foreground">
              {!loading && !errorKind && (
                <>
                  {courses.length} {czechPlural(courses.length, 'kurz', 'kurzy', 'kurzů')}
                  {usingMocks && ' · ukázková data, backend neběží'}
                </>
              )}
            </p>
          </div>

          <SegmentedControl
            variant="soft"
            size="lg"
            value={view}
            onValueChange={changeView}
            aria-label="Zobrazení kurzů"
          >
            <SegmentedControlItem value="grid">
              <LayoutGrid data-icon="inline-start" />
              Karty
            </SegmentedControlItem>
            <SegmentedControlItem value="rows">
              <List data-icon="inline-start" />
              Řádky
            </SegmentedControlItem>
          </SegmentedControl>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Najdi kurz!"
              className={cn(FIELD, "h-auto w-full pl-10 pr-4 py-2.5 focus:border-transparent")}
            />
          </div>

          {/* Kategorie (Block) */}
          <CatalogSelect
            value={selectedBlockId ?? 0}
            onValueChange={(next) => setSelectedBlockId(next === 0 ? undefined : next)}
            options={blocks.map((b) => ({ value: b.blockId, label: b.name }))}
            emptyLabel="Kategorie"
            aria-label="Kategorie"
            className={cn(FIELD, "px-4 py-2.5 min-w-[160px] data-[size=default]:h-auto")}
          />

          {/* Tema (Subject) */}
          <CatalogSelect
            value={selectedSubjectId ?? 0}
            onValueChange={(next) => setSelectedSubjectId(next === 0 ? undefined : next)}
            options={subjects.map((s) => ({ value: s.subjectId, label: s.name }))}
            emptyLabel="Téma"
            aria-label="Téma"
            className={cn(FIELD, "px-4 py-2.5 min-w-[160px] data-[size=default]:h-auto")}
          />

          {/* Reset */}
          <Button
            variant="plain"
            onClick={handleReset}
            className={cn(BTN_KEEP_BOX, FIELD, "px-5 py-2.5 font-medium hover:bg-muted transition-colors whitespace-nowrap")}
          >
            Resetovat
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            view === 'grid' ? (
              <motion.div
                key="skeletons-grid"
                className={GRID_CLASS}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {Array.from({ length: pageSize }, (_, i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </motion.div>
            ) : (
              <motion.ul
                key="skeletons-rows"
                className={ROWS_CLASS}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <CourseRowSkeleton key={i} />
                ))}
              </motion.ul>
            )
          ) : errorKind ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm sm:flex-row sm:gap-10 sm:px-12 sm:text-left"
            >
              <LynxMascotUnplugged className="h-auto w-24 shrink-0 sm:w-28" />
              <div>
                <p className="text-sm font-semibold text-destructive">Kurzy se nepodařilo načíst</p>
                <h3 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{ERROR_COPY[errorKind].title}</h3>
                <p className="mt-2 max-w-[52ch] text-muted-foreground">{ERROR_COPY[errorKind].text}</p>
                <Button size="lg" onClick={retry} className="mt-5 px-4 font-semibold">
                  <RotateCw data-icon="inline-start" />
                  Zkusit znovu
                </Button>
              </div>
            </motion.div>
          ) : courses.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center text-muted-foreground py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              Žádné kurzy neodpovídají vašemu hledání.
            </motion.div>
          ) : view === 'grid' ? (
            <motion.div
              key={`grid-page-${safePageIndex}-${courses.length}`}
              className={GRID_CLASS}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 },
                },
              }}
            >
              {visibleCourses.map((course) => (
                <motion.div
                  key={course.courseId || course.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.97 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <CourseCard {...itemProps(course)} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.ul
              key={`rows-page-${safePageIndex}-${courses.length}`}
              className={ROWS_CLASS}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.04 },
                },
              }}
            >
              {visibleCourses.map((course) => (
                <motion.li
                  key={course.courseId || course.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <CourseRow {...itemProps(course)} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Stránkovací ovládání — nahrazuje předchozí karty novými, takže
            na obrazovce zůstává vždy max PAGE_SIZE karet. Šipky se schovají,
            když není kam jít, vlastní AnimatePresence ošetří fade-in/out. */}
        <AnimatePresence>
          {!loading && !errorKind && totalPages > 1 && (
            <motion.div
              key="pagination"
              className="flex items-center justify-center gap-3 mt-8 sm:mt-10"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <motion.button
                type="button"
                onClick={() => goToPage(safePageIndex - 1)}
                disabled={!canPrev || paging}
                whileHover={canPrev && !paging ? { scale: 1.05 } : undefined}
                whileTap={canPrev && !paging ? { scale: 0.95 } : undefined}
                aria-label="Předchozí stránka kurzů"
                className="inline-flex items-center justify-center size-10 rounded-full bg-card border border-border shadow-sm text-foreground hover:shadow-md hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-shadow"
              >
                <ChevronLeft size={18} />
              </motion.button>

              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm text-sm font-semibold text-foreground min-w-[120px] justify-center">
                {paging ? (
                  <Loader2 size={14} className="animate-spin text-gradient-r" />
                ) : null}
                <span>
                  Strana <span className="text-gradient-r">{safePageIndex + 1}</span> / {totalPages}
                </span>
              </span>

              <motion.button
                type="button"
                onClick={() => goToPage(safePageIndex + 1)}
                disabled={!canNext || paging}
                whileHover={canNext && !paging ? { scale: 1.05 } : undefined}
                whileTap={canNext && !paging ? { scale: 0.95 } : undefined}
                aria-label="Další stránka kurzů"
                className="inline-flex items-center justify-center size-10 rounded-full bg-card border border-border shadow-sm text-foreground hover:shadow-md hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-shadow"
              >
                <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
