import { Difficulty, Status, type Course } from "@/api";

/**
 * Ukázkové kurzy jen pro vývoj. Když lokálně neběží backend, katalog na
 * úvodní stránce se jimi vyplní, aby šlo ladit karty i řádky. V produkčním
 * buildu se nepoužijí — `CourseSection` na ně sahá jen mimo `production`.
 */

const base = { courseBlockId: 1, courseTargetId: 1, ownerId: 1, isActive: true, isPublished: true, status: Status.Approved };

export const MOCK_COURSES: Course[] = [
  {
    ...base,
    courseId: 9001,
    title: "Úvod do generativní AI ve výuce",
    description: "Co generativní AI umí, kde selhává a jak ji bezpečně zapojit do běžné vyučovací hodiny.",
    durationMinutes: 90,
    difficulty: Difficulty.Beginner,
    modulesCount: 6,
  },
  {
    ...base,
    courseId: 9002,
    title: "Prompt engineering pro učitele",
    description: "Jak psát zadání, aby AI vracela použitelné podklady — od přípravy hodiny po zpětnou vazbu žákům.",
    durationMinutes: 75,
    difficulty: Difficulty.SlightlyAdvanced,
    modulesCount: 5,
  },
  {
    ...base,
    courseId: 9003,
    title: "AI a hodnocení žáků",
    description: "Formativní hodnocení s pomocí AI: rubriky, komentáře k úlohám a hlídání férovosti.",
    durationMinutes: 60,
    difficulty: Difficulty.Intermediate,
    modulesCount: 4,
  },
  {
    ...base,
    courseId: 9004,
    title: "Tvorba výukových materiálů s AI",
    description: "Pracovní listy, kvízy a diferencované úlohy během pár minut — a jak je po AI zkontrolovat.",
    durationMinutes: 120,
    difficulty: Difficulty.Beginner,
    modulesCount: 7,
  },
  {
    ...base,
    courseId: 9005,
    title: "Etika a bezpečnost AI ve škole",
    description: "Ochrana osobních údajů, autorství a akademická integrita v době jazykových modelů.",
    durationMinutes: 45,
    difficulty: Difficulty.CompleteBeginner,
    modulesCount: 3,
  },
  {
    ...base,
    courseId: 9006,
    title: "Personalizace výuky pomocí AI",
    description: "Přizpůsobte tempo a náročnost úloh každému žákovi, aniž byste psali šest verzí testu.",
    durationMinutes: 100,
    difficulty: Difficulty.Intermediate,
    modulesCount: 6,
  },
  {
    ...base,
    courseId: 9007,
    title: "Data a analytika v pedagogické praxi",
    description: "Čtení studijních dat, reporty o pokroku třídy a rozhodování podložené čísly.",
    durationMinutes: 80,
    difficulty: Difficulty.Advanced,
    modulesCount: 5,
  },
  {
    ...base,
    courseId: 9008,
    title: "AI tutor: jak ho zapojit do hodiny",
    description: "Scénáře hodin s AI tutorem, role učitele a jak poznat, že tutor žákovi opravdu pomáhá.",
    durationMinutes: 50,
    difficulty: Difficulty.Beginner,
    modulesCount: 4,
  },
  {
    ...base,
    courseId: 9009,
    title: "Kritické myšlení v době AI",
    description: "Ověřování zdrojů, halucinace modelů a úlohy, které učí žáky AI nevěřit naslepo.",
    durationMinutes: 70,
    difficulty: Difficulty.SlightlyAdvanced,
    modulesCount: 5,
  },
];

/** Průběh u vybraných ukázek, ať jsou vidět všechny stavy karty i řádku. */
export const MOCK_PROGRESS: Record<number, { completedModules: number; completed?: boolean }> = {
  9001: { completedModules: 2 },
  9003: { completedModules: 4, completed: true },
  9006: { completedModules: 1 },
};

/** Fulltext nad ukázkami — ať v nich funguje i vyhledávání ve filtru. */
export function filterMockCourses(textSearch?: string): Course[] {
  const q = textSearch?.trim().toLocaleLowerCase("cs");
  if (!q) return MOCK_COURSES;
  return MOCK_COURSES.filter((c) =>
    `${c.title} ${c.description ?? ""}`.toLocaleLowerCase("cs").includes(q),
  );
}
