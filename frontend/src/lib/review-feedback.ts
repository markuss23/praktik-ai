import type { FeedbackItem } from "@/api";

/**
 * Komentář garanta k souhrnu kurzu (popis, zařazení, obrázek) při schvalování.
 * Backend vyžaduje u komentáře modul, proto se ukládá k prvnímu modulu kurzu
 * a od komentářů k obsahu modulu se odliší tímto `contentType`.
 */
export const COURSE_SUMMARY_FEEDBACK = "course_summary";

export const COURSE_SUMMARY_FEEDBACK_LABEL = "Souhrn kurzu";

export function isCourseSummaryFeedback(fb: Pick<FeedbackItem, "contentType">): boolean {
  return fb.contentType === COURSE_SUMMARY_FEEDBACK;
}

/**
 * Kontext komentáře nad jeho textem („Příručka – str. 2", „Souhrn kurzu"…).
 * `withModule` přidá název modulu — pro výpisy přes víc modulů najednou.
 */
export function reviewFeedbackLabel(
  fb: Pick<FeedbackItem, "contentType" | "contentRef" | "module">,
  { withModule = false }: { withModule?: boolean } = {},
): string | null {
  if (isCourseSummaryFeedback(fb)) return COURSE_SUMMARY_FEEDBACK_LABEL;
  const parts: string[] = [];
  if (withModule && fb.module) parts.push(fb.module.title);
  if (fb.contentType === "learn_block" && fb.contentRef) {
    parts.push(`Příručka – str. ${fb.contentRef}`);
  } else if (fb.contentType === "practice" && fb.contentRef) {
    parts.push(`Procvičování – ot. ${fb.contentRef}`);
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}
