import type { AssessmentContext, AssessmentProgressItem } from '@/api';

/**
 * Názvy formátů z katalogu (assessment_type.name). Katalog `/assessment-types`
 * smí číst jen lektor, student názvy potřebuje taky — proto jsou i tady.
 */
const FORMAT_NAMES: Record<string, string> = {
  pretest: 'Pretest',
  closed_questions: 'Uzavřené otázky',
  closed_questions_ai: 'Uzavřené otázky generované AI',
  open_question_ai: 'Otevřené otázky generované AI',
  socratic_dialog_ai: 'Sokratovský dialog AI',
};

export function formatName(code: string): string {
  return FORMAT_NAMES[code] ?? code;
}

// Formaty, ve kterých student odpověd píše, v ostatních vybírá z možností
const TYPED_FORMATS = new Set(['open_question_ai', 'socratic_dialog_ai']);

export function isTypedFormat(code: string): boolean {
  return TYPED_FORMATS.has(code);
}

export const CONTEXT_LABELS: Record<AssessmentContext, string> = {
  pretest: 'Pretest',
  practice: 'Procvičování',
  assessment: 'Test modulu',
  course_final: 'Závěrečný test kurzu',
};

/** Splněné všechny povinné testy; bez povinných je splněno — stejně jako na backendu. */
export function requiredPassed(items: AssessmentProgressItem[]): boolean {
  return items.every((item) => !item.isRequired || item.passed);
}
