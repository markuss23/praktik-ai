import type {
  Course,
  CourseBlock,
  CourseUpdate,
  KrauuCompetence,
  Module,
  ModuleUpdate,
  NeuroPrinciple,
} from '@/api';

// Stejné kódy jako backend (catalogs/controllers.py):
// Blok A/B průřezový obor vyžaduje, jinak je volitelný (nejvýše 3); obor jen u Bloku C.
const BLOCK_WITH_SUBJECT = 'blok.c';
const BLOCKS_REQUIRING_CROSS_SUBJECTS = ['blok.a', 'blok.b'];
const MAX_CROSS_SUBJECTS = 3;

/** Výchozí neurovědní princip — stejný, jaký backend dosazuje modulům bez principu. */
export const DEFAULT_NEURO_PRINCIPLE_CODE = 'NP-01';

export type CrossSubjectsRule = 'required' | 'optional';

export function crossSubjectsRule(
  blocks: CourseBlock[],
  blockId: number | null | undefined,
): CrossSubjectsRule {
  const code = blocks.find((b) => b.blockId === blockId)?.code;
  if (code && BLOCKS_REQUIRING_CROSS_SUBJECTS.includes(code)) return 'required';
  return 'optional';
}

/** Obor (školní předmět) se volí pouze u Bloku C. */
export function subjectAllowed(blocks: CourseBlock[], blockId: number | null | undefined): boolean {
  return blocks.find((b) => b.blockId === blockId)?.code === BLOCK_WITH_SUBJECT;
}

/** Popisek položky číselníku ve formuláři: „kód – název". */
export function catalogLabel(item: { code: string; name: string }): string {
  return `${item.code} – ${item.name}`;
}

export interface KrauuArea {
  area: KrauuCompetence;
  competences: KrauuCompetence[];
}

/** KRAUU je dvouúrovňový: oblasti (bez rodiče) se nevybírají, jen jejich kompetence. */
export function groupKrauuCompetences(list: KrauuCompetence[]): KrauuArea[] {
  return list
    .filter((item) => item.parentId == null)
    .map((area) => ({
      area,
      competences: list.filter((item) => item.parentId === area.krauuId),
    }))
    .filter((group) => group.competences.length > 0);
}

export interface CourseCategoryValues {
  krauuCompetenceIds: number[];
  bloomLevelIds: number[];
  crossSubjectIds: number[];
}

export function courseCategoryValues(course: Course): CourseCategoryValues {
  return {
    krauuCompetenceIds: (course.krauuCompetences ?? []).map((k) => k.krauuId),
    bloomLevelIds: (course.bloomLevels ?? []).map((b) => b.bloomId),
    crossSubjectIds: (course.crossSubjects ?? []).map((c) => c.crossId),
  };
}

/** Kontrola na klientu se stejnými pravidly jako backend; vrací první chybu. */
export function validateCourseCategories(
  values: CourseCategoryValues,
  rule: CrossSubjectsRule,
): string | null {
  if (values.krauuCompetenceIds.length === 0) return 'Vyberte alespoň jednu KRAUU kompetenci.';
  if (values.bloomLevelIds.length === 0) return 'Vyberte alespoň jednu úroveň Bloomovy taxonomie.';
  if (rule === 'required' && values.crossSubjectIds.length === 0) {
    return 'Pro kurzy Bloků A a B vyberte alespoň jeden průřezový obor.';
  }
  if (values.crossSubjectIds.length > MAX_CROSS_SUBJECTS) {
    return `Vyberte nejvýše ${MAX_CROSS_SUBJECTS} průřezové obory.`;
  }
  return null;
}

/**
 * Kompletní payload pro PUT /courses/{id} z načteného kurzu.
 *
 * Backend při každé úpravě synchronizuje M2M vazby (KRAUU, Bloom, průřezové
 * obory), takže je musí dostat vždy — i když se mění jen název.
 */
export function courseToUpdate(course: Course, overrides: Partial<CourseUpdate> = {}): CourseUpdate {
  return {
    title: course.title,
    description: course.description,
    courseBlockId: course.courseBlockId ?? null,
    courseTargetId: course.courseTargetId ?? null,
    courseSubjectId: course.courseSubjectId ?? null,
    courseRequirementId: course.courseRequirementId ?? null,
    courseEqfLevelId: course.courseEqfLevelId,
    courseTypeId: course.courseTypeId,
    modulesCountAiGenerated: course.modulesCountAiGenerated,
    minModulesToOpenFinalExam: course.minModulesToOpenFinalExam,
    durationMinutes: course.durationMinutes,
    difficulty: course.difficulty,
    ...courseCategoryValues(course),
    ...overrides,
  };
}

export interface ModuleCategoryValues {
  neuroPrincipleIds: number[];
  krauuCompetenceIds: number[];
  bloomLevelIds: number[];
}

/**
 * Kategorie modulu pro uložení. Modul, kterému chybí KRAUU nebo Bloom (AI je
 * nemusí napojit), je zdědí z kurzu; chybějící princip nahradí NP-01.
 */
export function moduleCategoryValues(
  module: Pick<Module, 'neuroPrincipleIds' | 'krauuCompetences' | 'bloomLevels'> | null,
  course: Course | null,
  neuroPrinciples: NeuroPrinciple[],
): ModuleCategoryValues {
  const courseValues = course ? courseCategoryValues(course) : null;
  const neuroPrincipleIds = module?.neuroPrincipleIds ?? [];
  const krauuCompetenceIds = (module?.krauuCompetences ?? []).map((k) => k.krauuId);
  const bloomLevelIds = (module?.bloomLevels ?? []).map((b) => b.bloomId);
  const defaultPrinciple = neuroPrinciples.find((p) => p.code === DEFAULT_NEURO_PRINCIPLE_CODE);

  return {
    neuroPrincipleIds: neuroPrincipleIds.length > 0
      ? neuroPrincipleIds
      : defaultPrinciple ? [defaultPrinciple.principleId] : [],
    krauuCompetenceIds: krauuCompetenceIds.length > 0 ? krauuCompetenceIds : courseValues?.krauuCompetenceIds ?? [],
    bloomLevelIds: bloomLevelIds.length > 0 ? bloomLevelIds : courseValues?.bloomLevelIds ?? [],
  };
}

export function validateModuleCategories(values: ModuleCategoryValues): string | null {
  if (values.neuroPrincipleIds.length === 0) return 'Vyberte alespoň jeden neurovědní princip.';
  if (values.krauuCompetenceIds.length === 0) return 'Vyberte alespoň jednu KRAUU kompetenci.';
  if (values.bloomLevelIds.length === 0) return 'Vyberte alespoň jednu úroveň Bloomovy taxonomie.';
  return null;
}

/** Kompletní payload pro PUT /modules/{id} — stejně jako u kurzu backend chce vždy všechny vazby. */
export function moduleToUpdate(
  module: Pick<Module, 'title' | 'perex' | 'maxTaskAttempts'>,
  categories: ModuleCategoryValues,
  overrides: Partial<ModuleUpdate> = {},
): ModuleUpdate {
  return {
    title: module.title,
    perex: module.perex ?? '',
    maxTaskAttempts: module.maxTaskAttempts,
    ...categories,
    ...overrides,
  };
}
