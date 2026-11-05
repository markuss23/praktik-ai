import type { AssessmentContext, AssessmentProgressItem } from '@/api';
import type { AssessmentFormatSettings } from '@/lib/api-client';
import { czechPlural } from '@/lib/utils';

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

// Formáty, jejichž otázky vygeneruje AI až při spuštění session
const AI_FORMATS = new Set(['closed_questions_ai', 'open_question_ai', 'socratic_dialog_ai']);

export function isAiFormat(code: string): boolean {
  return AI_FORMATS.has(code);
}

/**
 * Co student v AI formátu dostane. Otázky předem neexistují, náhled
 * a schvalování proto ukazují jen tenhle popis. Výchozí hodnoty = backend.
 */
export function aiFormatDescription(code: string, settings: AssessmentFormatSettings | null, scope: 'module' | 'course'): string {
  const source = scope === 'course' ? 'z obsahu celého kurzu' : 'z obsahu modulu';
  const attempts = settings?.maxAttempts ?? 3;
  const attemptsText = `${attempts} ${czechPlural(attempts, 'pokus', 'pokusy', 'pokusů')}`;
  const threshold = Math.round((settings?.passThreshold ?? 0.75) * 100);

  switch (code) {
    case 'closed_questions_ai': {
      const count = settings?.questionCount ?? 5;
      return `Tady student dostane ${count} ${czechPlural(count, 'otázku', 'otázky', 'otázek')} s výběrem odpovědi. `
        + `Vygeneruje je AI ${source}, až student formát spustí. `
        + `Na každou má ${attemptsText}, ke splnění potřebuje ${threshold} % správných odpovědí.`;
    }
    case 'open_question_ai':
      return 'Tady student dostane otevřenou otázku a odpověď napíše vlastními slovy. '
        + `Otázku vygeneruje AI ${source}, až student formát spustí, a odpověď pak vyhodnotí. `
        + `Student má ${attemptsText}, ke splnění potřebuje hodnocení aspoň ${threshold} %.`;
    case 'socratic_dialog_ai': {
      const min = settings?.minTurns ?? 2;
      const max = settings?.maxTurns ?? 4;
      const turns = min === max ? `${max}` : `${min}–${max}`;
      return `Tady student vede s AI rozhovor nad obsahem ${scope === 'course' ? 'celého kurzu' : 'modulu'}: `
        + `${turns} ${czechPlural(max, 'kolo', 'kola', 'kol')} otázek a odpovědí. `
        + 'Otázky AI klade podle předchozích odpovědí a průběžně hodnotí, jak student látce rozumí.';
    }
    default:
      return 'Tady student dostane otázky, které vygeneruje AI, až formát spustí.';
  }
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
