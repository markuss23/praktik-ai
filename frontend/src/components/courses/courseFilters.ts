import { Difficulty, type Course, type CourseBlock, type CourseSubject, type CourseTarget } from "@/api";
import { courseCategoryLabel, type CourseItemProps, type CourseStatus } from "@/components/ui";
import type { MyEnrollmentExtended } from "@/lib/api-client";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";

/**
 * Filtrování a řazení stránky `/kurzy` — čistá logika bez Reactu.
 *
 * Katalog se stáhne celý (publikovaných kurzů jsou desítky) a filtruje se na
 * klientu. Každá volba filtru tak může ukázat, kolik kurzů by po ní zbylo,
 * a změna filtru nečeká na server. Fulltext backendu je jen ILIKE nad názvem
 * a popisem, takže lokální hledání nic neztrácí — navíc ignoruje diakritiku
 * („umela" najde „umělá").
 *
 * Uvnitř jednoho filtru se volby sčítají (NEBO), filtry mezi sebou se
 * průnikují (A ZÁROVEŇ).
 */

// ── Položka katalogu ─────────────────────────────────────────────────────────

interface CatalogRef {
  id: number;
  name?: string;
}

/** Jeden kurz se vším, podle čeho se filtruje a řadí, plus data pro kartu / řádek. */
export interface CatalogEntry {
  courseId: number;
  item: CourseItemProps;
  status: CourseStatus;
  difficulty: Difficulty;
  duration: number;
  enrollmentsCount: number;
  block: CatalogRef | null;
  subject: CatalogRef | null;
  target: CatalogRef | null;
  /** Název + popis bez diakritiky a malými písmeny — pro fulltext. */
  haystack: string;
}

type MockProgress = Record<number, { completedModules: number; completed?: boolean }>;

/** Rozpracovaný modul (kde uživatel skončil), jinak další na řadě, jinak detail kurzu. */
function resumeHref(e: MyEnrollmentExtended): string {
  const moduleId = e.lastVisitedModuleId ?? e.nextModule?.moduleId ?? null;
  return moduleId ? `/modules/${moduleId}` : `/courses/${e.courseId}`;
}

function ref(id: number | null | undefined, name?: string): CatalogRef | null {
  return id == null ? null : { id, name };
}

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("cs");
}

/** Hledaný text → slova; kurz musí obsahovat všechna (v libovolném pořadí). */
export function searchTokens(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

export function toCatalogEntries(
  courses: Course[],
  { enrollments = [], mockProgress }: { enrollments?: MyEnrollmentExtended[]; mockProgress?: MockProgress },
): CatalogEntry[] {
  const enrollmentById = new Map(enrollments.map((e) => [e.courseId, e]));

  return courses.map((course) => {
    const mock = mockProgress?.[course.courseId];
    const enrollment = mockProgress ? undefined : enrollmentById.get(course.courseId);
    const totalModules = course.modulesCount || 0;
    // Stejný odhad délky jako v `CourseCatalog`, ať karta ukazuje totéž, podle čeho se filtruje.
    const duration = course.durationMinutes ?? (totalModules ? totalModules * 20 : 60);
    const isEnrolled = !!(mock || enrollment);
    const isCompleted = !!(mock?.completed || enrollment?.completedAt);

    return {
      courseId: course.courseId,
      item: {
        id: String(course.courseId),
        title: course.title,
        description: course.description || "",
        duration,
        difficulty: course.difficulty,
        category: courseCategoryLabel(course),
        completedModules: mock?.completedModules ?? enrollment?.completedModules ?? 0,
        totalModules,
        isEnrolled,
        isCompleted,
        href: enrollment ? resumeHref(enrollment) : undefined,
      },
      status: isCompleted ? "done" : isEnrolled ? "active" : "idle",
      // Karta bez obtížnosti ukazuje „Začátečník" — filtr ji řadí tamtéž.
      difficulty: course.difficulty ?? Difficulty.Beginner,
      duration,
      enrollmentsCount: course.enrollmentsCount ?? 0,
      block: ref(course.courseBlockId, course.courseBlock?.name),
      subject: ref(course.courseSubjectId, course.courseSubject?.name),
      target: ref(course.courseTargetId, course.courseTarget?.name),
      haystack: normalizeText(`${course.title} ${course.description ?? ""}`),
    };
  });
}

// ── Filtry ───────────────────────────────────────────────────────────────────

/** Klíče filtrů jsou zároveň názvy parametrů v URL (`/kurzy?obtiznost=beginner`). */
export type FacetKey = "kategorie" | "tema" | "skupina" | "obtiznost" | "delka" | "stav";

export const FACET_KEYS: readonly FacetKey[] = ["kategorie", "tema", "skupina", "obtiznost", "delka", "stav"];

export interface FacetOption {
  value: string;
  label: string;
}

export interface Facet {
  key: FacetKey;
  title: string;
  options: FacetOption[];
  valueOf: (entry: CatalogEntry) => string | null;
}

/** Vybrané hodnoty po filtrech; chybějící / prázdný klíč = bez omezení. */
export type FacetSelection = Partial<Record<FacetKey, string[]>>;

const DURATION_BUCKETS = [
  { value: "do-1h", label: "Do 1 hodiny", max: 60 },
  { value: "1-2h", label: "1–2 hodiny", max: 120 },
  { value: "nad-2h", label: "Přes 2 hodiny", max: Infinity },
] as const;

function durationBucket(minutes: number): string {
  return DURATION_BUCKETS.find((b) => minutes <= b.max)!.value;
}

const STATUS_VALUE: Record<CourseStatus, string> = {
  idle: "nezapsane",
  active: "rozpracovane",
  done: "dokoncene",
};

const STATUS_OPTIONS: FacetOption[] = [
  { value: STATUS_VALUE.idle, label: "Nezapsané" },
  { value: STATUS_VALUE.active, label: "Rozpracované" },
  { value: STATUS_VALUE.done, label: "Dokončené" },
];

/**
 * Filtr nad číselníkem (blok / téma / cílová skupina). Nabízí jen položky,
 * které má aspoň jeden kurz — 30 oborů, z nichž kurz mají dva, by jen
 * zahltilo seznam. Pořadí drží číselník, popisky jdou z něj; když se
 * nenačte, poslouží název vnořený v kurzu.
 */
function catalogFacet(
  key: FacetKey,
  title: string,
  entries: CatalogEntry[],
  pick: (entry: CatalogEntry) => CatalogRef | null,
  catalog: { id: number; name: string }[],
): Facet {
  const names = new Map(catalog.map((c) => [c.id, c.name]));
  const order = new Map(catalog.map((c, i) => [c.id, i]));
  const present = new Map<number, string>();
  for (const entry of entries) {
    const r = pick(entry);
    if (r && !present.has(r.id)) present.set(r.id, names.get(r.id) ?? r.name ?? `#${r.id}`);
  }

  const options = [...present]
    .sort(
      ([a, labelA], [b, labelB]) =>
        (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) || labelA.localeCompare(labelB, "cs"),
    )
    .map(([id, label]) => ({ value: String(id), label }));

  return {
    key,
    title,
    options,
    valueOf: (entry) => {
      const r = pick(entry);
      return r ? String(r.id) : null;
    },
  };
}

/** Pevný výčet zúžený na hodnoty, které se v katalogu opravdu vyskytují. */
function presentOnly(options: FacetOption[], entries: CatalogEntry[], valueOf: Facet["valueOf"]): FacetOption[] {
  const present = new Set(entries.map(valueOf));
  return options.filter((o) => present.has(o.value));
}

export function buildFacets(
  entries: CatalogEntry[],
  catalogs: { blocks: CourseBlock[]; subjects: CourseSubject[]; targets: CourseTarget[] },
  { withStatus }: { withStatus: boolean },
): Facet[] {
  const difficultyOf = (e: CatalogEntry) => e.difficulty;
  const durationOf = (e: CatalogEntry) => durationBucket(e.duration);

  const facets: Facet[] = [
    catalogFacet("kategorie", "Kategorie", entries, (e) => e.block, catalogs.blocks.map((b) => ({ id: b.blockId, name: b.name }))),
    catalogFacet("tema", "Téma", entries, (e) => e.subject, catalogs.subjects.map((s) => ({ id: s.subjectId, name: s.name }))),
    catalogFacet("skupina", "Cílová skupina", entries, (e) => e.target, catalogs.targets.map((t) => ({ id: t.targetId, name: t.name }))),
    {
      key: "obtiznost",
      title: "Obtížnost",
      options: presentOnly(
        DIFFICULTY_ORDER.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] })),
        entries,
        difficultyOf,
      ),
      valueOf: difficultyOf,
    },
    {
      key: "delka",
      title: "Délka",
      options: presentOnly(
        DURATION_BUCKETS.map(({ value, label }) => ({ value, label })),
        entries,
        durationOf,
      ),
      valueOf: durationOf,
    },
  ];

  // Stav dává smysl jen přihlášenému — nepřihlášený má všechno „nezapsané".
  // Všechny tři volby zůstávají i s nulou, ať je vidět, co filtr umí.
  if (withStatus) {
    facets.push({ key: "stav", title: "Stav", options: STATUS_OPTIONS, valueOf: (e) => STATUS_VALUE[e.status] });
  }

  // Filtr s jedinou volbou nic nefiltruje.
  return facets.filter((f) => f.options.length >= 2);
}

/** Zahodí z výběru hodnoty, které katalog nezná (starý odkaz, skrytý filtr). */
export function sanitizeSelection(raw: FacetSelection, facets: Facet[]): FacetSelection {
  const out: FacetSelection = {};
  for (const facet of facets) {
    const valid = new Set(facet.options.map((o) => o.value));
    const values = (raw[facet.key] ?? []).filter((v) => valid.has(v));
    if (values.length > 0) out[facet.key] = values;
  }
  return out;
}

/** Projde kurz hledáním a všemi filtry — kromě `except` (pro počty u jeho voleb). */
export function matchesFilters(
  entry: CatalogEntry,
  facets: Facet[],
  selection: FacetSelection,
  tokens: string[],
  except?: FacetKey,
): boolean {
  if (!tokens.every((t) => entry.haystack.includes(t))) return false;
  for (const facet of facets) {
    if (facet.key === except) continue;
    const selected = selection[facet.key];
    if (!selected?.length) continue;
    const value = facet.valueOf(entry);
    if (value === null || !selected.includes(value)) return false;
  }
  return true;
}

/**
 * Kolik kurzů by zbylo po zaškrtnutí dané volby — při ostatních filtrech
 * beze změny. Vlastní filtr se při počítání vynechá, jinak by už zvolená
 * volba vynulovala všechny sousední.
 */
export function facetCounts(
  entries: CatalogEntry[],
  facets: Facet[],
  selection: FacetSelection,
  tokens: string[],
): Partial<Record<FacetKey, Map<string, number>>> {
  const out: Partial<Record<FacetKey, Map<string, number>>> = {};
  for (const facet of facets) {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (!matchesFilters(entry, facets, selection, tokens, facet.key)) continue;
      const value = facet.valueOf(entry);
      if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    out[facet.key] = counts;
  }
  return out;
}

// ── Řazení ───────────────────────────────────────────────────────────────────

export const SORT_OPTIONS = [
  { value: "oblibene", label: "Nejoblíbenější" },
  { value: "nejnovejsi", label: "Nejnovější" },
  { value: "nazev", label: "Název A–Z" },
  { value: "nejkratsi", label: "Nejkratší" },
  { value: "nejlehci", label: "Od nejlehčích" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const DEFAULT_SORT: SortKey = "oblibene";

const DIFFICULTY_RANK = new Map(DIFFICULTY_ORDER.map((d, i) => [d, i]));

const COMPARATORS: Record<SortKey, (a: CatalogEntry, b: CatalogEntry) => number> = {
  oblibene: (a, b) => b.enrollmentsCount - a.enrollmentsCount,
  // Kurz nemá datum vytvoření; id roste s časem, takže poslouží jako náhrada.
  nejnovejsi: (a, b) => b.courseId - a.courseId,
  nazev: (a, b) => a.item.title.localeCompare(b.item.title, "cs"),
  nejkratsi: (a, b) => a.duration - b.duration,
  nejlehci: (a, b) => (DIFFICULTY_RANK.get(a.difficulty) ?? 0) - (DIFFICULTY_RANK.get(b.difficulty) ?? 0),
};

/** Řazení je stabilní — shody zůstávají v pořadí ze serveru (dle počtu zápisů). */
export function sortEntries(entries: CatalogEntry[], sort: SortKey): CatalogEntry[] {
  return [...entries].sort(COMPARATORS[sort]);
}

// ── URL ──────────────────────────────────────────────────────────────────────

export const SEARCH_PARAM = "q";
export const SORT_PARAM = "razeni";
export const PAGE_PARAM = "strana";

/** Víc hodnot jednoho filtru = opakovaný parametr (`?obtiznost=beginner&obtiznost=expert`). */
export function readSelection(params: URLSearchParams): FacetSelection {
  const out: FacetSelection = {};
  for (const key of FACET_KEYS) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length > 0) out[key] = values;
  }
  return out;
}

export function readSort(params: URLSearchParams): SortKey {
  const raw = params.get(SORT_PARAM);
  return SORT_OPTIONS.find((o) => o.value === raw)?.value ?? DEFAULT_SORT;
}

/** Stránka v URL je od 1 — tak ji vidí uživatel. */
export function readPage(params: URLSearchParams): number {
  const n = Number(params.get(PAGE_PARAM));
  return Number.isInteger(n) && n > 1 ? n : 1;
}
