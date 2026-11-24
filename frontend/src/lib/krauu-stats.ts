import type {
  CompetenceStatsItem, Course, Enrollment, KrauuCompetence, Module, MyCompetenceItem, MyEnrollment,
} from '@/api';
import type { KrauuArea } from './course-categories';

// Pod tímto počtem uživatelů je výsledek kompetence jen orientační
export const KRAUU_MIN_USERS = 5;
// Průměr výstupního testu pod touto hranicí = slabé místo
export const KRAUU_LOW_OUTCOME = 60;
// Párový posun (výstup - pretest) pod touto hranicí = obsah moc neposouvá
export const KRAUU_SMALL_GAIN = 5;

// Odstraní prefix "Oblast N - " z názvu oblasti
export function krauuAreaShortName(name: string): string {
  return name.replace(/^Oblast\s+\d+\s*[–—-]\s*/, '');
}

// Číslo oblasti z kódu "3.0" -> "3"
export function krauuAreaNumber(code: string): string {
  return code.split('.')[0];
}

// krauuId kompetence -> krauuId její oblasti
export function krauuAreaIndex(catalog: KrauuCompetence[]): Map<number, number> {
  const index = new Map<number, number>();
  for (const item of catalog) {
    if (item.parentId != null) index.set(item.krauuId, item.parentId);
  }
  return index;
}

// ---------- Admin: pokrytí a zapojení (jen z kurzů, modulů a zápisů) ----------

export interface KrauuCoverage {
  modules: number;
  courses: number;
}

export interface KrauuAreaEngagement {
  enrolled: number;
  completed: number;
}

// Kompetence modulu; bez vlastních převezme kompetence kurzu (stejně jako backend /competences)
export function moduleKrauuIds(module: Module, course: Course): number[] {
  const own = module.krauuCompetences ?? [];
  return (own.length > 0 ? own : course.krauuCompetences ?? []).map((k) => k.krauuId);
}

// Kompetence kurzu = jeho vlastní + kompetence jeho modulů
export function courseKrauuIds(course: Course, modules: Module[]): Set<number> {
  const ids = new Set<number>();
  for (const k of course.krauuCompetences ?? []) ids.add(k.krauuId);
  for (const m of modules) for (const k of m.krauuCompetences ?? []) ids.add(k.krauuId);
  return ids;
}

// Kolik aktivních modulů a kurzů rozvíjí každou kompetenci
export function computeKrauuCoverage(
  courses: Course[],
  modulesByCourse: Map<number, Module[]>,
): Map<number, KrauuCoverage> {
  const result = new Map<number, KrauuCoverage>();
  const entry = (id: number) => {
    let e = result.get(id);
    if (!e) {
      e = { modules: 0, courses: 0 };
      result.set(id, e);
    }
    return e;
  };
  for (const course of courses) {
    const modules = (modulesByCourse.get(course.courseId) ?? []).filter((m) => m.isActive);
    for (const m of modules) {
      for (const id of moduleKrauuIds(m, course)) entry(id).modules++;
    }
    for (const id of courseKrauuIds(course, modules)) entry(id).courses++;
  }
  return result;
}

// Unikátní zapsaní a dokončivší uživatelé po oblastech KRAUU.
// Kurz patří do všech oblastí, kam spadá některá jeho kompetence.
export function computeKrauuEngagement(
  items: { course: Course; enrollments: Enrollment[] }[],
  modulesByCourse: Map<number, Module[]>,
  areaIndex: Map<number, number>,
): Map<number, KrauuAreaEngagement> {
  const enrolled = new Map<number, Set<number>>();
  const completed = new Map<number, Set<number>>();
  const add = (map: Map<number, Set<number>>, areaId: number, userId: number) => {
    let set = map.get(areaId);
    if (!set) {
      set = new Set();
      map.set(areaId, set);
    }
    set.add(userId);
  };

  for (const { course, enrollments } of items) {
    const areas = new Set<number>();
    for (const id of courseKrauuIds(course, modulesByCourse.get(course.courseId) ?? [])) {
      const areaId = areaIndex.get(id);
      if (areaId != null) areas.add(areaId);
    }
    for (const areaId of areas) {
      for (const e of enrollments) {
        add(enrolled, areaId, e.userId);
        if (e.completedAt) add(completed, areaId, e.userId);
      }
    }
  }

  const result = new Map<number, KrauuAreaEngagement>();
  for (const [areaId, users] of enrolled) {
    result.set(areaId, { enrolled: users.size, completed: completed.get(areaId)?.size ?? 0 });
  }
  return result;
}

// ---------- Admin: výsledky z /competences/stats ----------

export interface KrauuResultFlags {
  lowData: boolean;
  lowOutcome: boolean;
  smallGain: boolean;
}

// Počet uživatelů s testem; `users` z backendu zahrnuje i ty, kdo mají jen procvičování
export function krauuTestedUsers(item: CompetenceStatsItem): number {
  return Math.max(item.pretestUsers, item.outcomeUsers);
}

export function krauuResultFlags(item: CompetenceStatsItem): KrauuResultFlags {
  const lowData = krauuTestedUsers(item) < KRAUU_MIN_USERS;
  return {
    lowData,
    // Nízký výstup jen při dost lidech s výstupem, ne podle jednoho výsledku
    lowOutcome:
      !lowData &&
      item.outcomeUsers >= KRAUU_MIN_USERS &&
      item.outcomeAvg != null &&
      item.outcomeAvg < KRAUU_LOW_OUTCOME,
    smallGain:
      !lowData &&
      item.pairedDelta != null &&
      item.pairedUsers >= KRAUU_MIN_USERS &&
      item.pairedDelta < KRAUU_SMALL_GAIN,
  };
}

// Hodnota pro řazení: výstup, pokud ho má dost lidí, jinak pretest se stejnou podmínkou
function weaknessValue(i: CompetenceStatsItem): number | null {
  if (i.outcomeAvg != null && i.outcomeUsers >= KRAUU_MIN_USERS) return i.outcomeAvg;
  if (i.pretestAvg != null && i.pretestUsers >= KRAUU_MIN_USERS) return i.pretestAvg;
  return null;
}

// Od nejslabšího; kompetence bez dostatku dat až na konec
export function sortKrauuByWeakest(items: CompetenceStatsItem[]): CompetenceStatsItem[] {
  const value = (i: CompetenceStatsItem) => weaknessValue(i) ?? Number.POSITIVE_INFINITY;
  return [...items].sort((a, b) => {
    const lowA = weaknessValue(a) == null ? 1 : 0;
    const lowB = weaknessValue(b) == null ? 1 : 0;
    if (lowA !== lowB) return lowA - lowB;
    const va = value(a);
    const vb = value(b);
    return va === vb ? 0 : va - vb;
  });
}

// ---------- Student: profil z /competences/my ----------

// Aktuální úroveň kompetence: výstup, a dokud není, vstup
export function competenceLevel(item: MyCompetenceItem): number | null {
  return item.outcomeScore ?? item.pretestScore ?? null;
}

export interface AreaProfile {
  area: KrauuCompetence;
  pretest: number | null;
  outcome: number | null;
  // Kolik kompetencí oblasti má nějaký výsledek / kolik jich oblast má
  tested: number;
  total: number;
}

function mean(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

// Hodnota oblasti = průměr jejích kompetencí. Vstup a výstup se počítají ze stejných kompetencí
// (těch, které mají obojí), jinak by rozdíl mezi nimi nebyl růst; bez takové kompetence
// se ukáže, co oblast má.
export function computeAreaProfile(areas: KrauuArea[], items: MyCompetenceItem[]): AreaProfile[] {
  return areas.map(({ area, competences }) => {
    const ids = new Set(competences.map((c) => c.krauuId));
    const mine = items.filter((i) => ids.has(i.krauuId));
    const paired = mine.filter((i) => i.pretestScore != null && i.outcomeScore != null);
    const base = paired.length > 0 ? paired : mine;
    return {
      area,
      pretest: mean(base.flatMap((i) => (i.pretestScore != null ? [i.pretestScore] : []))),
      outcome: mean(base.flatMap((i) => (i.outcomeScore != null ? [i.outcomeScore] : []))),
      tested: mine.filter((i) => competenceLevel(i) != null).length,
      total: competences.length,
    };
  });
}

// Nejsilnější a nejslabší kompetence podle aktuální úrovně; při malém počtu se nepřekrývají
export function competenceHighlights(items: MyCompetenceItem[]): {
  strengths: MyCompetenceItem[];
  weaknesses: MyCompetenceItem[];
} {
  const ranked = items
    .filter((i) => competenceLevel(i) != null)
    .sort((a, b) => (competenceLevel(b) ?? 0) - (competenceLevel(a) ?? 0));
  const k = Math.min(3, Math.floor(ranked.length / 2));
  return {
    strengths: ranked.slice(0, k),
    weaknesses: k > 0 ? ranked.slice(-k).reverse() : [],
  };
}

export interface CourseRecommendation {
  course: Course;
  // Slabé kompetence, které kurz rozvíjí
  targets: MyCompetenceItem[];
  enrolled: boolean;
}

// Publikované kurzy, které rozvíjejí nejslabší kompetence a uživatel je ještě nedokončil
export function recommendCourses(
  weaknesses: MyCompetenceItem[],
  courses: Course[],
  enrollments: MyEnrollment[],
  limit = 3,
): CourseRecommendation[] {
  if (weaknesses.length === 0) return [];
  const completed = new Set(enrollments.filter((e) => e.completedAt).map((e) => e.courseId));
  const enrolled = new Set(enrollments.map((e) => e.courseId));
  return courses
    .filter((c) => c.isActive && !completed.has(c.courseId))
    .map((course) => {
      const ids = new Set((course.krauuCompetences ?? []).map((k) => k.krauuId));
      return {
        course,
        targets: weaknesses.filter((w) => ids.has(w.krauuId)),
        enrolled: enrolled.has(course.courseId),
      };
    })
    .filter((r) => r.targets.length > 0)
    // Víc zasažených slabin první, pak rozpracované kurzy
    .sort((a, b) => b.targets.length - a.targets.length || Number(b.enrolled) - Number(a.enrolled))
    .slice(0, limit);
}
