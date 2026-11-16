import type { FeedbackItem } from "@/api";
import { czechPlural } from "@/lib/utils";

/**
 * Komentář garanta k souhrnu kurzu (popis, zařazení, obrázek) při schvalování.
 * Backend vyžaduje u komentáře modul, proto se ukládá k prvnímu modulu kurzu
 * a od komentářů k obsahu modulu se odliší tímto `contentType`.
 */
export const COURSE_SUMMARY_FEEDBACK = "course_summary";

export const COURSE_SUMMARY_FEEDBACK_LABEL = "Souhrn kurzu";

// Stejná konvence jako souhrn: uloženo u prvního modulu, rozlišeno contentType
export const COURSE_FINAL_FEEDBACK = "course_final";
export const COURSE_GENERAL_FEEDBACK = "course_general";

const COURSE_LEVEL_LABELS: Record<string, string> = {
  [COURSE_SUMMARY_FEEDBACK]: COURSE_SUMMARY_FEEDBACK_LABEL,
  [COURSE_FINAL_FEEDBACK]: "Závěrečný test kurzu",
  [COURSE_GENERAL_FEEDBACK]: "Celý kurz",
};

export function isCourseSummaryFeedback(fb: Pick<FeedbackItem, "contentType">): boolean {
  return fb.contentType === COURSE_SUMMARY_FEEDBACK;
}

export function isCourseFinalFeedback(fb: Pick<FeedbackItem, "contentType">): boolean {
  return fb.contentType === COURSE_FINAL_FEEDBACK;
}

// Komentář ke kurzu jako celku, ne k obsahu modulu (souhrn, závěrečný test, celý kurz)
export function isCourseLevelFeedback(fb: Pick<FeedbackItem, "contentType">): boolean {
  return !!fb.contentType && fb.contentType in COURSE_LEVEL_LABELS;
}

// Komentáře, které autor řeší v kroku Souhrn (souhrn + celý kurz)
export function isSummaryStepFeedback(fb: Pick<FeedbackItem, "contentType">): boolean {
  return fb.contentType === COURSE_SUMMARY_FEEDBACK || fb.contentType === COURSE_GENERAL_FEEDBACK;
}

// Nápověda u kroku v kartě Tvorba kurzu, např. "2 komentáře k opravě"
export function commentsToFixHint(count: number): string {
  return `${count} ${czechPlural(count, "komentář", "komentáře", "komentářů")} k opravě`;
}

// Kontext komentáře nad jeho textem

export function reviewFeedbackLabel(
  fb: Pick<FeedbackItem, "contentType" | "contentRef" | "module">,
  { withModule = false }: { withModule?: boolean } = {},
): string | null {
  if (fb.contentType && fb.contentType in COURSE_LEVEL_LABELS) return COURSE_LEVEL_LABELS[fb.contentType];
  const parts: string[] = [];
  if (withModule && fb.module) parts.push(fb.module.title);
  if (fb.contentType === "learn_block" && fb.contentRef) {
    parts.push(`Příručka – str. ${fb.contentRef}`);
  } else if (fb.contentType === "practice") {
    parts.push(fb.contentRef ? `Procvičování – ot. ${fb.contentRef}` : "Procvičování");
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}
