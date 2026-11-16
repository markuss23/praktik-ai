import { Badge, type BadgeVariant } from "@/components/ui";
import { TICKET_STATUS_LABELS, TicketStatus } from "./types";

// Stav tiketu -> varianta kitového `Badge` (pět stavových pilulek z Figmy).
const STATUS_VARIANTS: Record<TicketStatus, BadgeVariant> = {
  open: "new",
  in_progress: "open",
  pending: "waiting",
  resolved: "resolved",
  closed: "closed",
};

// Pilulka se stavem tiketu podle mockupu.
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="gap-1.5 rounded-full">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
