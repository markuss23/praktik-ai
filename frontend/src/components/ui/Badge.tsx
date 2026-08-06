import { Status } from '@/api';

import { Badge, type BadgeVariant } from '../ui-kit/badge';

// ─── Status Badge ────────────────────────────────────────────────────────────
//
// Projektové stavy kurzů/modulů namapované na varianty kitového `Badge`
// (`ui-kit/badge.tsx`), aby se barvy držely Figma palety a ne raw Tailwindu.

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  [Status.Draft]: 'closed',
  [Status.Generated]: 'open',
  [Status.Edited]: 'new',
  in_review: 'waiting',
  [Status.Approved]: 'resolved',
  [Status.Archived]: 'closed',
};

const STATUS_LABELS: Record<string, string> = {
  [Status.Draft]: 'Draft',
  [Status.Generated]: 'Vygenerováno',
  [Status.Edited]: 'Rozpracováno',
  in_review: 'Ke schválení',
  [Status.Approved]: 'Schváleno',
  [Status.Archived]: 'Archivováno',
};

export function StatusBadge({ status }: { status?: Status | string }) {
  const key = status ?? '';
  return <Badge variant={STATUS_VARIANTS[key] ?? 'closed'}>{STATUS_LABELS[key] ?? status}</Badge>;
}

// ─── Publish Badge ───────────────────────────────────────────────────────────

export function PublishBadge({ status, isPublished }: { status?: Status | string; isPublished?: boolean }) {
  if (status !== Status.Approved && status !== Status.Archived) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return <Badge variant={isPublished ? 'resolved' : 'waiting'}>{isPublished ? 'ANO' : 'NE'}</Badge>;
}

// ─── Module Active Badge ─────────────────────────────────────────────────────

export function ModuleActiveBadge({ isActive, size = 'md' }: { isActive?: boolean; size?: 'sm' | 'md' }) {
  return (
    <Badge variant={isActive ? 'resolved' : 'closed'} className={size === 'sm' ? 'mt-1 px-2' : undefined}>
      {isActive ? 'Aktivní' : 'Neaktivní'}
    </Badge>
  );
}
