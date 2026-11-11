'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Loader2, RotateCw, Search } from "lucide-react";
import type { Course, CourseBlock, CourseSubject } from "@/api";
import {
  Button,
  CatalogSelect,
  CourseCard,
  CourseCardSkeleton,
  CourseRow,
  CourseRowSkeleton,
  Input,
  type CourseItemProps,
} from "@/components/ui";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui-kit/segmented-control";
import { LynxMascotUnplugged } from "@/components/layout/LynxMascotUnplugged";
import { useAuth } from "@/hooks/useAuth";
import {
  getCourseBlocks,
  getCourses,
  getCourseSubjects,
  getMyEnrollments,
  type MyEnrollmentExtended,
} from "@/lib/api-client";
import { BTN_KEEP_BOX, cn, czechPlural } from "@/lib/utils";
import { MOCK_PROGRESS, filterMockCourses } from "./courseMocks";

/**
 * Katalog kurzů — nadpis, přepínač Karty / Řádky, filtry, výpis a stránkování.
 * Jedna komponenta pro úvodní stránku, `/courses` i „Moje kurzy":
 *
 * - `scope="all"` (výchozí) — publikované kurzy; hledání a filtry jdou na
 *   server, u přihlášeného se k nim dopočítá průběh ze zápisů.
 * - `scope="enrolled"` — jen kurzy, do kterých je uživatel zapsán. Zdrojem
 *   pravdy jsou zápisy (ukážou se i kurzy, které mezitím zmizely z katalogu);
 *   katalog je jen doplní o obtížnost a délku a obslouží filtr kategorie /
 *   tématu. Přibude filtr „Stav" a „Pokračovat" vede rovnou na rozpracovaný modul.
 *
 * Komponenta nemá vlastní pozadí ani kontejner — ty dodává stránka.
 */

/** Karty: 2 řádky × 3 karty. Řádky jsou nízké, vejde se jich víc. */
const PAGE_SIZE = { grid: 6, rows: 10 } as const;

type ViewMode = keyof typeof PAGE_SIZE;

/** Volba zobrazení se pamatuje per prohlížeč (a sdílí mezi stránkami) — jen pohodlí, ne stav. */
const VIEW_STORAGE_KEY = 'praktikai:courses:view';

export type CourseCatalogScope = 'all' | 'enrolled';

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

/** Stav zápisu pro filtr v `scope="enrolled"`. 0 = bez filtru (CatalogSelect pracuje s čísly). */
const STATUS_FILTERS = [
  { value: 1, label: 'Probíhající', match: (e: MyEnrollmentExtended) => !e.completedAt && (e.completedModules ?? 0) > 0 },
  { value: 2, label: 'Nezačaté', match: (e: MyEnrollmentExtended) => !e.completedAt && (e.completedModules ?? 0) === 0 },
  { value: 3, label: 'Dokončené', match: (e: MyEnrollmentExtended) => !!e.completedAt },
] as const;

/** Filtry a přepínač leží na šedé stránce — bílá výplň je od ní odliší. */
const FIELD = 'bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30';
/** Na mobilu půl řádku mřížky (`w-full`), od `sm` vlastní šířka v řadě filtrů. */
const SELECT_FIELD = cn(FIELD, 'w-full min-w-0 px-4 py-2.5 data-[size=default]:h-auto sm:w-auto sm:min-w-[160px]');

const GRID_CLASS = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6';
/** Řádky leží v jedné bílé ploše, oddělené vlasovou linkou. */
const ROWS_CLASS = 'divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm';

const PAGER_BUTTON =
  'inline-flex items-center justify-center size-10 rounded-full bg-card border border-border shadow-sm text-foreground hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-shadow';

function classifyError(err: unknown): ErrorKind {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response: Response }).response?.status;
    if (status === 401 || status === 403) return 'unauthorized';
    return 'server-error';
  }
  return 'backend-down';
}

/** Rozpracovaný modul (kde uživatel skončil), jinak další na řadě, jinak detail kurzu. */
function resumeHref(e: MyEnrollmentExtended): string {
  const moduleId = e.lastVisitedModuleId ?? e.nextModule?.moduleId ?? null;
  return moduleId ? `/modules/${moduleId}` : `/courses/${e.courseId}`;
}

/** Karta čte i legacy pole `id`/`name`, která generovaný `Course` nemá. */
type CourseListItem = Course & Partial<{ id: number | string; name: string }>;

interface CourseCatalogProps {
  /** Nadpis sekce. */
  title?: string;
  /** Na samostatné stránce je katalog hlavním obsahem → `h1`. */
  headingAs?: 'h1' | 'h2';
  scope?: CourseCatalogScope;
  /**
   * Zápisy, pokud je stránka už načetla (Moje kurzy) — katalog je pak
   * nestahuje znovu. Bez nich si je u přihlášeného načte sám.
   */
  enrollments?: MyEnrollmentExtended[];
  className?: string;
}

export function CourseCatalog({
  title = 'Kurzy',
  headingAs: Heading = 'h2',
  scope = 'all',
  enrollments: enrollmentsProp,
  className,
}: CourseCatalogProps) {
  const enrolledOnly = scope === 'enrolled';
  const ownsEnrollments = enrollmentsProp === undefined;

  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [fetchedEnrollments, setFetchedEnrollments] = useState<MyEnrollmentExtended[]>([]);
  const enrollments = enrollmentsProp ?? fetchedEnrollments;
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  /** V `enrolled` režimu katalog jen doplňuje zápisy — jeho výpadek není chyba. */
  const [catalogFailed, setCatalogFailed] = useState(false);
  const [usingMocks, setUsingMocks] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState(0);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);

  // Stránkování — uživatel vidí vždy max PAGE_SIZE položek. Klik na šipku
  // *přepne* na další stránku (předchozí zmizí), takže na obrazovce zůstává
  // konstantní počet kurzů. Každá změna filtru vrací na první stránku.
  const [pageIndex, setPageIndex] = useState(0);
  const [paging, setPaging] = useState(false);

  const loadCourses = useCallback(async (params: {
    textSearch?: string;
    courseBlockId?: number;
    courseSubjectId?: number;
  }) => {
    try {
      setErrorKind(null);
      setLoading(true);
      const data = await getCourses({
        isPublished: true,
        textSearch: params.textSearch || undefined,
        courseBlockId: params.courseBlockId,
        courseSubjectId: params.courseSubjectId,
      });
      setCourses(data);
      setUsingMocks(false);
      setCatalogFailed(false);
    } catch (err) {
      if (enrolledOnly) {
        console.warn('Courses API unavailable, showing enrollments without catalog details:', err);
        setCourses([]);
        setCatalogFailed(true);
        return;
      }
      // Bez backendu se ve vývoji katalog vyplní ukázkami (courseMocks.ts),
      // aby šlo ladit karty i řádky. V produkci zůstává chybový stav.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Courses API unavailable, showing mock courses:', err);
        setCourses(filterMockCourses(params.textSearch));
        setUsingMocks(true);
        return;
      }
      console.error('Failed to fetch courses:', err);
      setErrorKind(classifyError(err));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [enrolledOnly]);

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
    getCourseBlocks().then(setBlocks).catch(() => setBlocks([]));
    getCourseSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!ownsEnrollments || !isAuthenticated) return;
    getMyEnrollments()
      .then(setFetchedEnrollments)
      .catch(() => setFetchedEnrollments([]));
  }, [ownsEnrollments, isAuthenticated]);

  // V katalogu jde hledání na server; v „mých kurzech" se hledá lokálně
  // nad zápisy, takže psaní nespouští nový dotaz.
  const serverSearch = enrolledOnly ? '' : search;

  // Debounced search + filter apply. První běh (mount) se nedebouncuje —
  // jinak by stránka čekala 500 ms, než vůbec odešle první dotaz na kurzy.
  const firstFilterRun = useRef(true);
  useEffect(() => {
    const delay = firstFilterRun.current ? 0 : 500;
    firstFilterRun.current = false;
    const timeout = setTimeout(() => {
      loadCourses({
        textSearch: serverSearch || undefined,
        courseBlockId: selectedBlockId,
        courseSubjectId: selectedSubjectId,
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [serverSearch, selectedBlockId, selectedSubjectId, loadCourses]);

  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPageIndex(0);
  };

  const handleReset = () => {
    setSearch('');
    setSelectedBlockId(undefined);
    setSelectedSubjectId(undefined);
    setStatusFilter(0);
    setPageIndex(0);
  };

  const retry = () =>
    loadCourses({
      textSearch: serverSearch || undefined,
      courseBlockId: selectedBlockId,
      courseSubjectId: selectedSubjectId,
    });

  // Krátké "fake" zpoždění aby přepínač působil jako akce, ne skok;
  // AnimatePresence postará o fade-out starých položek a fade-in nových.
  const goToPage = (next: number) => {
    if (paging) return;
    setPaging(true);
    setTimeout(() => {
      setPageIndex(next);
      setPaging(false);
    }, 220);
  };

  /** Jednotná data pro kartu i řádek, ať jde o katalog nebo zápisy. */
  const items = useMemo<CourseItemProps[]>(() => {
    if (!enrolledOnly) {
      const enrollmentById = new Map(enrollments.map((e) => [e.courseId, e]));
      return courses.map((course) => {
        const courseId = course.courseId || course.id;
        const mock = usingMocks ? MOCK_PROGRESS[course.courseId] : undefined;
        const enrollment = usingMocks ? undefined : enrollmentById.get(Number(courseId));
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
          href: enrollment ? resumeHref(enrollment) : undefined,
        };
      });
    }

    const catalogById = new Map(courses.map((c) => [c.courseId, c]));
    // Kategorii / téma umí jen server — bez katalogu se tyto filtry ignorují.
    const filterByCatalog = !catalogFailed && (selectedBlockId !== undefined || selectedSubjectId !== undefined);
    const status = STATUS_FILTERS.find((s) => s.value === statusFilter);
    const q = search.trim().toLocaleLowerCase('cs');

    return enrollments
      .filter((e) => !filterByCatalog || catalogById.has(e.courseId))
      .filter((e) => !status || status.match(e))
      .filter((e) => !q || `${e.course.title} ${e.course.description ?? ''}`.toLocaleLowerCase('cs').includes(q))
      .map((e) => {
        const course = catalogById.get(e.courseId);
        const totalModules = e.totalModules || e.course.modulesCount || course?.modulesCount || 0;
        return {
          id: String(e.courseId),
          title: course?.title || e.course.title,
          description: course?.description || e.course.description || '',
          duration: course?.durationMinutes ?? (totalModules ? totalModules * 20 : 60),
          difficulty: course?.difficulty,
          completedModules: e.completedModules ?? 0,
          totalModules,
          isEnrolled: true,
          isCompleted: !!e.completedAt,
          href: resumeHref(e),
        };
      });
  }, [enrolledOnly, courses, enrollments, usingMocks, catalogFailed, selectedBlockId, selectedSubjectId, statusFilter, search]);

  const statusOptions = useMemo(
    () =>
      STATUS_FILTERS.map((s) => ({
        value: s.value,
        label: `${s.label} (${enrollments.filter(s.match).length})`,
      })),
    [enrollments],
  );

  const pageSize = PAGE_SIZE[view];
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Bezpečný clamp — kdyby se filtrem počet stránek snížil pod aktuální index.
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visibleItems = items.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
  const canPrev = safePageIndex > 0;
  const canNext = safePageIndex < totalPages - 1;

  const countLabel = (n: number) => `${n} ${czechPlural(n, 'kurz', 'kurzy', 'kurzů')}`;

  return (
    <section className={className}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <Heading className="text-2xl font-bold text-foreground sm:text-3xl">{title}</Heading>
          <p className="mt-1 min-h-5 text-sm text-muted-foreground">
            {!loading && !errorKind && (
              <>
                {enrolledOnly && items.length !== enrollments.length
                  ? `${items.length} z ${countLabel(enrollments.length)}`
                  : countLabel(items.length)}
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

      {/* Filter Bar — mobil: hledání přes celou šířku, selecty po dvou vedle sebe;
          od `sm` jedna (zalamovací) řada. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:min-w-[240px] sm:flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            placeholder={enrolledOnly ? 'Hledat v mých kurzech…' : 'Najdi kurz!'}
            aria-label="Hledat kurz"
            className={cn(FIELD, 'h-auto w-full py-2.5 pr-4 pl-10 focus:border-transparent')}
          />
        </div>

        <CatalogSelect
          value={selectedBlockId ?? 0}
          onValueChange={(next) => withPageReset(setSelectedBlockId)(next === 0 ? undefined : next)}
          options={blocks.map((b) => ({ value: b.blockId, label: b.name }))}
          emptyLabel="Kategorie"
          aria-label="Kategorie"
          className={SELECT_FIELD}
        />

        <CatalogSelect
          value={selectedSubjectId ?? 0}
          onValueChange={(next) => withPageReset(setSelectedSubjectId)(next === 0 ? undefined : next)}
          options={subjects.map((s) => ({ value: s.subjectId, label: s.name }))}
          emptyLabel="Téma"
          aria-label="Téma"
          className={SELECT_FIELD}
        />

        {enrolledOnly && (
          <CatalogSelect
            value={statusFilter}
            onValueChange={withPageReset(setStatusFilter)}
            options={statusOptions}
            emptyLabel={`Všechny stavy (${enrollments.length})`}
            aria-label="Stav kurzu"
            className={SELECT_FIELD}
          />
        )}

        <Button
          variant="plain"
          onClick={handleReset}
          className={cn(
            BTN_KEEP_BOX,
            FIELD,
            'px-5 py-2.5 font-medium whitespace-nowrap transition-colors hover:bg-muted',
            // Bez filtru „Stav" by tlačítko na mobilu zůstalo samo v půlce řádku.
            !enrolledOnly && 'col-span-2',
          )}
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
              {Array.from({ length: enrolledOnly ? 3 : pageSize }, (_, i) => (
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
              {Array.from({ length: enrolledOnly ? 3 : 5 }, (_, i) => (
                <li key={i}>
                  <CourseRowSkeleton />
                </li>
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
        ) : items.length === 0 ? (
          <motion.div
            key="empty"
            className="rounded-xl border border-border bg-card px-6 py-10 text-center shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="font-medium text-foreground">
              {enrolledOnly ? 'Žádný z tvých kurzů neodpovídá filtru' : 'Žádné kurzy neodpovídají vašemu hledání'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Zkuste upravit hledání nebo filtry.</p>
          </motion.div>
        ) : view === 'grid' ? (
          <motion.div
            key={`grid-page-${safePageIndex}-${items.length}`}
            className={GRID_CLASS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
            }}
          >
            {visibleItems.map((item) => (
              <motion.div
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.97 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <CourseCard {...item} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.ul
            key={`rows-page-${safePageIndex}-${items.length}`}
            className={ROWS_CLASS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
          >
            {visibleItems.map((item) => (
              <motion.li
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <CourseRow {...item} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Stránkovací ovládání — nahrazuje předchozí položky novými, takže
          na obrazovce zůstává vždy max PAGE_SIZE kurzů. Šipky se schovají,
          když není kam jít, vlastní AnimatePresence ošetří fade-in/out. */}
      <AnimatePresence>
        {!loading && !errorKind && totalPages > 1 && (
          <motion.div
            key="pagination"
            className="mt-8 flex items-center justify-center gap-3 sm:mt-10"
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
              className={PAGER_BUTTON}
            >
              <ChevronLeft size={18} />
            </motion.button>

            <span className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
              {paging ? <Loader2 size={14} className="animate-spin text-gradient-r" /> : null}
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
              className={PAGER_BUTTON}
            >
              <ChevronRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
