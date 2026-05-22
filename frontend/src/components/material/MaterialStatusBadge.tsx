import type { MaterialApprovalStatus } from "./types";

const STATUS_STYLES: Record<MaterialApprovalStatus, { label: string; className: string }> = {
  approved: {
    label: "Schváleno",
    className: "bg-green-100 text-green-700",
  },
  in_review: {
    label: "Čeká na schválení",
    className: "bg-orange-100 text-orange-700",
  },
  rejected: {
    label: "Neschváleno",
    className: "bg-red-100 text-red-700",
  },
};

export function MaterialStatusBadge({ status }: { status: MaterialApprovalStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function MaterialCategoryBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-cyan-100 text-cyan-700">
      {label}
    </span>
  );
}
