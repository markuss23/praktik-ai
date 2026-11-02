import type { ClosedQuestionItem, PretestSettings } from '@/api';
import type { AssessmentFormatSettings } from './api-client';

// Meze odpovídají schématům na backendu (assessments/*/schemas.py)
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export function emptyClosedQuestion(optionCount = 3): ClosedQuestionItem {
  return { question: '', options: Array.from({ length: optionCount }, () => ''), correctIndex: 0 };
}

/** Pevná struktura pretestu: 2 uzavřené otázky + 1 otevřená. */
export function emptyPretest(): PretestSettings {
  return {
    closed: [emptyClosedQuestion(), emptyClosedQuestion()],
    open: { question: '', exampleAnswer: '', keywords: [] },
  };
}

function closedQuestionErrors(q: ClosedQuestionItem, label: string): string[] {
  const errors: string[] = [];
  if (!q.question.trim()) errors.push(`${label}: chybí zadání`);
  if (q.options.length < MIN_OPTIONS || q.options.length > MAX_OPTIONS) {
    errors.push(`${label}: potřebuje ${MIN_OPTIONS}–${MAX_OPTIONS} možnosti`);
  }
  if (q.options.some((o) => !o.trim())) {
    errors.push(`${label}: vyplňte všechny možnosti`);
  } else if (new Set(q.options.map((o) => o.trim())).size !== q.options.length) {
    // Student odpovídá textem možnosti — stejné texty by nešly rozlišit
    errors.push(`${label}: možnosti se opakují`);
  }
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    errors.push(`${label}: označte správnou odpověď`);
  }
  return errors;
}

/** Chyby, kvůli kterým backend obsah pretestu odmítne (prázdné = jde uložit). */
export function pretestErrors(p: PretestSettings): string[] {
  const errors = p.closed.flatMap((q, i) => closedQuestionErrors(q, `Uzavřená otázka ${i + 1}`));
  if (!p.open.question.trim()) errors.push('Otevřená otázka: chybí zadání');
  if (!p.open.exampleAnswer.trim()) errors.push('Otevřená otázka: chybí vzorová odpověď');
  const keywords = p.open.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) errors.push('Otevřená otázka: přidejte aspoň jeden klíčový bod');
  else if (new Set(keywords).size !== keywords.length) errors.push('Otevřená otázka: klíčové body se opakují');
  return errors;
}

const isWholeInRange = (v: number | undefined, min: number, max = Infinity): v is number =>
  v !== undefined && Number.isInteger(v) && v >= min && v <= max;

/**
 * Kolik kol dialogu student nejméně potřebuje, aby se z počátečního elo dostal
 * na hranici splnění. 
 * Lektor elo nenastavuje
 */
export function socraticTurnsToPass(s: AssessmentFormatSettings): number {
  const startElo = s.startElo ?? 1000;
  const passElo = s.passElo ?? 1200;
  const maxStep = s.maxStep ?? 50;
  return Math.max(0, Math.ceil((passElo - startElo) / maxStep));
}

/**
 * Chyby nastavení formátu, kvůli kterým ho backend odmítne. Prázdné pole je taky cyhba
 */
export function formatSettingsErrors(code: string, s: AssessmentFormatSettings): string[] {
  const errors: string[] = [];
  if (code === 'closed_questions') {
    (s.questions ?? []).forEach((q, i) => errors.push(...closedQuestionErrors(q, `Otázka ${i + 1}`)));
  }
  if (code === 'closed_questions_ai' && !isWholeInRange(s.questionCount, 1, 20)) {
    errors.push('Počet otázek musí být 1–20');
  }
  if (code === 'socratic_dialog_ai') {
    const min = s.minTurns;
    const max = s.maxTurns;
    const turnsToPass = socraticTurnsToPass(s);
    if (!isWholeInRange(min, 1, 10)) errors.push('Nejmenší počet kol musí být 1–10');
    if (!isWholeInRange(max, 2, 10)) errors.push('Největší počet kol musí být 2–10');
    else if (max < turnsToPass) errors.push(`Největší počet kol musí být aspoň ${turnsToPass}, jinak dialog nejde splnit`);
    if (min !== undefined && max !== undefined && min > max) errors.push('Nejmenší počet kol nesmí být větší než největší');
  } else {
    if (!isWholeInRange(s.maxAttempts, 1)) errors.push('Počet pokusů musí být aspoň 1');
    if (!(s.passThreshold !== undefined && s.passThreshold >= 0 && s.passThreshold <= 1)) {
      errors.push('Potřebné skóre musí být 0–100 %');
    }
  }
  return errors;
}

/** Chyby, se kterými nejde krok Testy dokončit — navíc proti uložení. */
export function formatFinishErrors(code: string, s: AssessmentFormatSettings): string[] {
  const errors = formatSettingsErrors(code, s);
  if (code === 'closed_questions' && (s.questions ?? []).length === 0) {
    errors.push('Přidejte aspoň jednu otázku');
  }
  return errors;
}

const trimClosed = (q: ClosedQuestionItem): ClosedQuestionItem => ({
  ...q,
  question: q.question.trim(),
  options: q.options.map((o) => o.trim()),
});

/** Ořízne texty před odesláním — backend porovnává možnosti doslova. */
export function normalizePretest(p: PretestSettings): PretestSettings {
  return {
    closed: p.closed.map(trimClosed),
    open: {
      question: p.open.question.trim(),
      exampleAnswer: p.open.exampleAnswer.trim(),
      keywords: p.open.keywords.map((k) => k.trim()).filter(Boolean),
    },
  };
}

export function normalizeFormatSettings(s: AssessmentFormatSettings): AssessmentFormatSettings {
  return s.questions ? { ...s, questions: s.questions.map(trimClosed) } : s;
}
