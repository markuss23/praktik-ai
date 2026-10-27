import type { Course } from '@/api';

/**
 * Řazení seznamu kurzů v administraci. Backend vrací kurzy podle počtu zápisů
 * (kvůli veřejnému katalogu), administrace si je přeřadí na klientovi.
 */
export type CourseSortOrder = 'newest' | 'oldest' | 'updated' | 'title' | 'status';

export const COURSE_SORT_OPTIONS: { value: CourseSortOrder; label: string }[] = [
  { value: 'newest', label: 'Nejnovější první' },
  { value: 'oldest', label: 'Nejstarší první' },
  { value: 'updated', label: 'Naposledy upravené' },
  { value: 'title', label: 'Podle názvu (A–Z)' },
  { value: 'status', label: 'Podle stavu' },
];

export const DEFAULT_COURSE_SORT: CourseSortOrder = 'newest';

export function isCourseSortOrder(value: unknown): value is CourseSortOrder {
  return COURSE_SORT_OPTIONS.some((o) => o.value === value);
}

// Pořadí stavů = životní cyklus kurzu (stejné pořadí jako ve filtru stavů).
const STATUS_RANK: Record<string, number> = {
  draft: 0,
  generated: 1,
  edited: 2,
  in_review: 3,
  approved: 4,
  archived: 5,
  failed: 6,
};

// České řazení bez ohledu na velikost písmen; `numeric` řadí „Kurz 2" před „Kurz 10".
const collator = new Intl.Collator('cs', { sensitivity: 'base', numeric: true });

const time = (d: Date | undefined) => (d instanceof Date ? d.getTime() : 0);

/**
 * Komparátor pro `Array.prototype.sort`. Sekundárně je vždy novější kurz dřív,
 * aby bylo pořadí stabilní i u shodných názvů/stavů.
 */
export function compareCourses(a: Course, b: Course, order: CourseSortOrder): number {
  const newerFirst = time(b.createdAt) - time(a.createdAt) || b.courseId - a.courseId;
  switch (order) {
    case 'oldest':
      return -newerFirst;
    case 'updated':
      return time(b.updatedAt) - time(a.updatedAt) || newerFirst;
    case 'title':
      return collator.compare(a.title, b.title) || newerFirst;
    case 'status':
      return (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99) || newerFirst;
    case 'newest':
    default:
      return newerFirst;
  }
}
