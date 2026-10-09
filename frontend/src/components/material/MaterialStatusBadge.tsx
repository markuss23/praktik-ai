import { Badge, type BadgeVariant } from "@/components/ui";
import type { MaterialApprovalStatus } from "./types";

/** Stav schvalování materiálu → varianta kitového `Badge`. */
const STATUS_STYLES: Record<MaterialApprovalStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Koncept", variant: "closed" },
  approved: { label: "Schváleno", variant: "resolved" },
  in_review: { label: "Čeká na schválení", variant: "new" },
  rejected: { label: "Neschváleno", variant: "waiting" },
};

export function MaterialStatusBadge({ status }: { status: MaterialApprovalStatus }) {
  const { label, variant } = STATUS_STYLES[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function MaterialCategoryBadge({ label }: { label: string }) {
  return <Badge variant="open">{label}</Badge>;
}
