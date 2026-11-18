'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  RotateCcw,
  RotateCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { Course, CourseBlock, CourseSubject, CourseTarget } from '@/api';
import {
  Button,
  CourseCard,
  CourseCardSkeleton,
  CourseRow,
  CourseRowSkeleton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui-kit/segmented-control';
import { LynxMascotUnplugged } from '@/components/layout/LynxMascotUnplugged';
import { useAuth } from '@/hooks/useAuth';
import {
  getCourseBlocks,
  getCourses,
  getCourseSubjects,
  getCourseTargets,
  getMyEnrollments,
  type MyEnrollmentExtended,
} from '@/lib/api-client';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import { MOCK_COURSES, MOCK_PROGRESS } from './courseMocks';
import {
  buildFacets,
  facetCounts,
  FACET_KEYS,
  matchesFilters,
  PAGE_PARAM,
  readPage,
  readSelection,
  readSort,
  sanitizeSelection,
  SEARCH_PARAM,
  searchTokens,
  sortEntries,
  SORT_OPTIONS,
  SORT_PARAM,
  DEFAULT_SORT,
  toCatalogEntries,
  type Facet,
  type FacetKey,
  type SortKey,
} from './courseFilters';

/**
 * Samostatná stránka kurzů (`/kurzy`). Vychází z katalogu na úvodní stránce
 * (`CourseCatalog`) — stejná hlavička, přepínač Karty / Řádky, karty i řádky —
 * ale filtruje víc: kategorie, téma, cílová skupina, obtížnost, délka a stav
 * (přihlášený), k tomu řazení. Filtry jsou vícevýběrové a u každé volby je
 * vidět, kolik kurzů by po ní zbylo.
 *
 * Všechny filtry, řazení i stránka žijí v URL, takže filtrovaný výpis jde
 * poslat odkazem a návrat z detailu kurzu ho obnoví. Logika filtrů je
 * v `courseFilters.ts`.
 */

/** Karty: 4 řádky × 3 (na `md` 6 × 2). Číslo dělitelné dvěma i třemi, ať poslední řádek nezůstane poloprázdný. */
const PAGE_SIZE = 12;

type ViewMode = 'grid' | 'rows';

/** Stejný klíč jako `CourseCatalog` — volba zobrazení platí pro všechny výpisy kurzů. */
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

function classifyError(err: unknown): ErrorKind {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response: Response }).response?.status;
    if (status === 401 || status === 403) return 'unauthorized';
    return 'server-error';
  }
  return 'backend-down';
}

// Stejné plochy jako filtry v `CourseCatalog` — bílá výplň na šedé stránce.
const FIELD =
  'bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30';
const SELECT_FIELD = cn(FIELD, 'w-full min-w-0 px-4 py-2.5 data-[size=default]:h-auto md:w-auto md:min-w-[150px]');
/** Filtr s vybranou hodnotou — jemný tón, ať je na první pohled vidět, co omezuje výpis. */
const SELECT_ACTIVE = 'border-gradient-r/40 bg-gradient-r/10';

const GRID_CLASS = 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3';
const ROWS_CLASS = 'divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm';

const PAGER_BUTTON = cn(
  BTN_KEEP_BOX,
  'inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground shadow-sm transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40',
);

const countLabel = (n: number) => `${n} ${czechPlural(n, 'kurz', 'kurzy', 'kurzů')}`;

type ParamPatch = Record<string, string | string[] | null>;

export function CourseExplorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([]);
  const [catalogs, setCatalogs] = useState<{
    blocks: CourseBlock[];
    subjects: CourseSubject[];
    targets: CourseTarget[];
  }>({ blocks: [], subjects: [], targets: [] });
  const [enrollments, setEnrollments] = useState<MyEnrollmentExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [usingMocks, setUsingMocks] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorKind(null);
    getCourses({ isPublished: true })
      .then((data) => {
        if (cancelled) return;
        setCourses(data);
        setUsingMocks(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Bez backendu se ve vývoji výpis vyplní ukázkami (courseMocks.ts),
        // stejně jako katalog na úvodní stránce. V produkci zůstává chyba.
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Courses API unavailable, showing mock courses:', err);
          setCourses(MOCK_COURSES);
          setUsingMocks(true);
          return;
        }
        console.error('Failed to fetch courses:', err);
        setErrorKind(classifyError(err));
        setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Číselníky jen dodávají pořadí a popisky filtrů — bez nich se použijí
  // názvy vnořené v kurzech, takže výpadek není chyba.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getCourseBlocks(), getCourseSubjects(), getCourseTargets()]).then(
      ([blocks, subjects, targets]) => {
        if (cancelled) return;
        setCatalogs({
          blocks: blocks.status === 'fulfilled' ? blocks.value : [],
          subjects: subjects.status === 'fulfilled' ? subjects.value : [],
          targets: targets.status === 'fulfilled' ? targets.value : [],
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setEnrollments([]);
      return;
    }
    let cancelled = false;
    getMyEnrollments()
      .then((data) => {
        if (!cancelled) setEnrollments(data);
      })
      .catch(() => {
        if (!cancelled) setEnrollments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ── Zobrazení (Karty / Řádky) ─────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>('grid');

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
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // Volba se jen nezapamatuje.
    }
  };

  // ── Stav v URL ────────────────────────────────────────────────────────────
  // `history.replaceState` Next.js propojuje s `useSearchParams`, takže
  // změna filtru nepřidává záznam do historie ani nejde na server.
  const updateParams = useCallback(
    (patch: ParamPatch, { keepPage = false }: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        next.delete(key);
        if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
        else if (value) next.set(key, value);
      }
      if (!keepPage) next.delete(PAGE_PARAM);
      const qs = next.toString();
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, pathname],
  );

  const urlQuery = searchParams.get(SEARCH_PARAM) ?? '';
  const sort = readSort(searchParams);
  const pageParam = readPage(searchParams);
  const rawSelection = useMemo(() => readSelection(searchParams), [searchParams]);

  // Pole hledání píše do URL se zpožděním. Když se `q` v URL změní zvenku
  // (Resetovat, odkaz „Kurzy" v hlavičce), převezme pole jeho hodnotu.
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    if (urlQuery !== searchInput.trim()) setSearchInput(urlQuery);
  }

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === urlQuery) return;
    const timeout = setTimeout(() => updateParams({ [SEARCH_PARAM]: trimmed || null }), 300);
    return () => clearTimeout(timeout);
  }, [searchInput, urlQuery, updateParams]);

  // ── Filtrování ────────────────────────────────────────────────────────────
  const entries = useMemo(
    () =>
      toCatalogEntries(courses, usingMocks ? { mockProgress: MOCK_PROGRESS } : { enrollments }),
    [courses, enrollments, usingMocks],
  );

  const facets = useMemo(
    () => buildFacets(entries, catalogs, { withStatus: isAuthenticated || usingMocks }),
    [entries, catalogs, isAuthenticated, usingMocks],
  );

  const selection = useMemo(() => sanitizeSelection(rawSelection, facets), [rawSelection, facets]);
  const tokens = useMemo(() => searchTokens(urlQuery), [urlQuery]);

  const results = useMemo(
    () => sortEntries(entries.filter((e) => matchesFilters(e, facets, selection, tokens)), sort),
    [entries, facets, selection, tokens, sort],
  );

  const counts = useMemo(
    () => facetCounts(entries, facets, selection, tokens),
    [entries, facets, selection, tokens],
  );

  const activeFacetCount = Object.values(selection).reduce((sum, values) => sum + (values?.length ?? 0), 0);
  const hasActiveFilters = activeFacetCount > 0 || urlQuery !== '';

  const setFacet = (key: FacetKey, values: string[]) => updateParams({ [key]: values });

  const resetFilters = () => {
    setSearchInput('');
    updateParams({
      [SEARCH_PARAM]: null,
      ...Object.fromEntries(FACET_KEYS.map((key) => [key, null])),
    });
  };

  // ── Stránkování ───────────────────────────────────────────────────────────
  const resultsRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  // Clamp — starý odkaz nebo užší filtr může mířit za poslední stránku.
  const page = Math.min(pageParam, totalPages);
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (next: number) => {
    updateParams({ [PAGE_PARAM]: next > 1 ? String(next) : null }, { keepPage: true });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Mobil: filtry se rozbalují tlačítkem, ať výpis nezačíná až pod nimi ──
  const [filtersOpen, setFiltersOpen] = useState(false);

  /** Mění se s každou změnou výpisu → karty se znovu animují (ne jen přeskládají). */
  const resultsKey = `${view}-${searchParams.toString()}`;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Kurzy</h1>
          <p className="mt-1 min-h-5 text-sm text-muted-foreground" aria-live="polite">
            {!loading && !errorKind && (
              <>
                {results.length === entries.length
                  ? countLabel(entries.length)
                  : `${results.length} z ${countLabel(entries.length)}`}
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

      {/* Hledání + řazení; na mobilu mezi nimi tlačítko, které rozbalí filtry. */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <div className="relative col-span-2 sm:min-w-0 sm:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Najdi kurz!"
            aria-label="Hledat kurz"
            className={cn(FIELD, 'h-auto w-full py-2.5 pr-4 pl-10 focus:border-transparent')}
          />
        </div>

        <Button
          variant="plain"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="course-filters"
          className={cn(
            BTN_KEEP_BOX,
            FIELD,
            'inline-flex items-center justify-center gap-2 px-4 py-2.5 font-medium whitespace-nowrap hover:bg-muted md:hidden',
            activeFacetCount > 0 && SELECT_ACTIVE,
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtry
          {activeFacetCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gradient-r px-1.5 text-xs font-semibold text-primary-foreground">
              {activeFacetCount}
            </span>
          )}
        </Button>

        <SortSelect
          value={sort}
          onChange={(next) => updateParams({ [SORT_PARAM]: next === DEFAULT_SORT ? null : next })}
        />
      </div>

      {/* Filtry — mobil: dva sloupce pod tlačítkem „Filtry"; od `md` vždy
          vidět, v jedné zalamovací řadě s „Resetovat" na konci. */}
      <div
        id="course-filters"
        className={cn(
          'mt-3 grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center',
          !filtersOpen && 'hidden',
        )}
      >
        {facets.map((facet) => (
          <FacetSelect
            key={facet.key}
            facet={facet}
            values={selection[facet.key] ?? []}
            counts={counts[facet.key]}
            onChange={(values) => setFacet(facet.key, values)}
          />
        ))}

        <Button
          variant="plain"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className={cn(
            BTN_KEEP_BOX,
            FIELD,
            'inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium whitespace-nowrap transition-colors hover:bg-muted disabled:opacity-50 md:ml-auto',
            facets.length % 2 === 0 && 'col-span-2',
          )}
        >
          <RotateCcw className="size-4" aria-hidden />
          Resetovat
        </Button>
      </div>

      <ActiveFilterChips
        query={urlQuery}
        facets={facets}
        selection={selection}
        onClearQuery={() => {
          setSearchInput('');
          updateParams({ [SEARCH_PARAM]: null });
        }}
        onRemove={(key, value) => setFacet(key, (selection[key] ?? []).filter((v) => v !== value))}
      />

      <div ref={resultsRef} className="mt-6 scroll-mt-28">
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
                {Array.from({ length: 6 }, (_, i) => (
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
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{ERROR_COPY[errorKind].title}</h2>
                <p className="mt-2 max-w-[52ch] text-muted-foreground">{ERROR_COPY[errorKind].text}</p>
                <Button size="lg" onClick={() => setReloadKey((k) => k + 1)} className="mt-5 px-4 font-semibold">
                  <RotateCw data-icon="inline-start" />
                  Zkusit znovu
                </Button>
              </div>
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="empty"
              className="rounded-xl border border-border bg-card px-6 py-10 text-center shadow-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="font-medium text-foreground">
                {entries.length === 0 ? 'Zatím tu nejsou žádné kurzy' : 'Žádný kurz neodpovídá zvoleným filtrům'}
              </p>
              {hasActiveFilters && (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">Zkuste uvolnit některý filtr nebo upravit hledání.</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    <RotateCcw data-icon="inline-start" />
                    Zrušit všechny filtry
                  </Button>
                </>
              )}
            </motion.div>
          ) : view === 'grid' ? (
            <motion.div
              key={resultsKey}
              className={GRID_CLASS}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
              }}
            >
              {visible.map(({ item }) => (
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
              key={resultsKey}
              className={ROWS_CLASS}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
              }}
            >
              {visible.map(({ item }) => (
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
      </div>

      {!loading && !errorKind && <Pager page={page} totalPages={totalPages} onChange={goToPage} />}
    </section>
  );
}

// ── Části ────────────────────────────────────────────────────────────────────

/**
 * Vícevýběrový filtr. U každé volby je počet kurzů, které by po jejím
 * zaškrtnutí zbyly; volba, po které by nezbylo nic, je zašedlá.
 */
function FacetSelect({
  facet,
  values,
  counts,
  onChange,
}: {
  facet: Facet;
  values: string[];
  counts?: Map<string, number>;
  onChange: (values: string[]) => void;
}) {
  const label = (selected: string[]) => {
    if (selected.length === 0) return facet.title;
    if (selected.length === 1) return facet.options.find((o) => o.value === selected[0])?.label ?? facet.title;
    return `${facet.title} (${selected.length})`;
  };

  return (
    <Select
      multiple
      items={facet.options}
      value={values}
      onValueChange={(next) => onChange((next as string[] | null) ?? [])}
    >
      <SelectTrigger aria-label={facet.title} className={cn(SELECT_FIELD, values.length > 0 && SELECT_ACTIVE)}>
        <SelectValue>{(selected) => label((selected as string[] | null) ?? [])}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false} className="w-auto min-w-(--anchor-width)">
        {facet.options.map((option) => {
          const count = counts?.get(option.value) ?? 0;
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={count === 0 && !values.includes(option.value)}
              className="py-1.5"
            >
              <span>{option.label}</span>
              <span className="ml-auto pl-4 text-xs text-muted-foreground tabular-nums">{count}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (next: SortKey) => void }) {
  return (
    <Select
      items={SORT_OPTIONS}
      value={value}
      onValueChange={(next) => onChange((next as SortKey | null) ?? DEFAULT_SORT)}
    >
      <SelectTrigger aria-label="Seřadit kurzy" className={cn(SELECT_FIELD, 'sm:w-auto sm:min-w-[190px]')}>
        <ArrowDownUp className="size-4 text-muted-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false} className="w-auto min-w-(--anchor-width)">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="py-1.5">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Co právě omezuje výpis — u vícevýběru by to jinak schoval popisek „Obtížnost (2)". */
function ActiveFilterChips({
  query,
  facets,
  selection,
  onClearQuery,
  onRemove,
}: {
  query: string;
  facets: Facet[];
  selection: Partial<Record<FacetKey, string[]>>;
  onClearQuery: () => void;
  onRemove: (key: FacetKey, value: string) => void;
}) {
  const chips = [
    ...(query ? [{ id: 'q', title: 'Hledání', label: `„${query}“`, onRemove: onClearQuery }] : []),
    ...facets.flatMap((facet) =>
      (selection[facet.key] ?? []).map((value) => ({
        id: `${facet.key}:${value}`,
        title: facet.title,
        label: facet.options.find((o) => o.value === value)?.label ?? value,
        onRemove: () => onRemove(facet.key, value),
      })),
    ),
  ];

  if (chips.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Aktivní filtry">
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gradient-r/30 bg-gradient-r/10 py-1 pr-1 pl-3 text-sm text-foreground"
        >
          <span className="min-w-0 truncate">
            <span className="text-muted-foreground">{chip.title}:</span> {chip.label}
          </span>
          <Button
            variant="plain"
            onClick={chip.onRemove}
            aria-label={`Zrušit filtr ${chip.title}: ${chip.label}`}
            className={cn(BTN_KEEP_BOX, 'shrink-0 rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground')}
          >
            <X className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** První, poslední a okolí aktuální stránky; mezery jako „…". */
function pageWindow(page: number, total: number): (number | 'gap')[] {
  const pages = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ['gap' as const, p] : [p]));
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Stránkování kurzů" className="mt-8 flex items-center justify-center gap-2 sm:mt-10">
      <Button
        variant="plain"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Předchozí stránka"
        className={PAGER_BUTTON}
      >
        <ChevronLeft className="size-[18px]" />
      </Button>

      {pageWindow(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Button
            variant="plain"
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Strana ${p}`}
            className={cn(PAGER_BUTTON, p === page && 'border-gradient-r/30 bg-gradient-r/15 text-gradient-r')}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="plain"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Další stránka"
        className={PAGER_BUTTON}
      >
        <ChevronRight className="size-[18px]" />
      </Button>
    </nav>
  );
}

/** Kostra pro `<Suspense>` na stránce — než se na klientu přečtou parametry z URL. */
export function CourseExplorerFallback() {
  return (
    <section aria-busy>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Kurzy</h1>
        <p className="mt-1 min-h-5" />
      </div>
      <div className="h-[46px] rounded-md border border-border bg-card" />
      <div className={cn(GRID_CLASS, 'mt-6')}>
        {Array.from({ length: 6 }, (_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
