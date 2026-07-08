import { TICKET_STATUS_LABELS, TicketStatus } from "./types";

const STATUS_STYLES: Record<TicketStatus, { pill: string; dot: string }> = {
  open: { pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  resolved: { pill: "bg-purple-50 text-purple-700", dot: "bg-purple-500" },
};

/** Pilulka se stavem tiketu (Aktivní / Vyřešeno) podle mockupu. */
export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const styles = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden />
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}
