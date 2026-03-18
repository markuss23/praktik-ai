'use client';

import { Status } from '@/api';

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  [Status.Draft]: 'bg-gray-100 text-gray-800',
  [Status.Generated]: 'bg-blue-100 text-blue-800',
  [Status.Edited]: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-orange-100 text-orange-800',
  [Status.Approved]: 'bg-purple-100 text-purple-800',
  [Status.Archived]: 'bg-orange-100 text-orange-800',
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
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[key] ?? 'bg-gray-100 text-gray-800'}`}>
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}

// ─── Publish Badge ───────────────────────────────────────────────────────────

export function PublishBadge({ status, isPublished }: { status?: Status | string; isPublished?: boolean }) {
  if (status !== Status.Approved && status !== Status.Archived) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return (
    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
      isPublished ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {isPublished ? 'ANO' : 'NE'}
    </span>
  );
}

// ─── Module Active Badge ─────────────────────────────────────────────────────

export function ModuleActiveBadge({ isActive, size = 'md' }: { isActive?: boolean; size?: 'sm' | 'md' }) {
  const padding = size === 'sm' ? 'px-2 py-0.5 mt-1' : 'px-3 py-1';
  return (
    <span className={`inline-flex ${padding} text-xs font-medium rounded-full ${
      isActive ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
    }`}>
      {isActive ? 'Aktivní' : 'Neaktivní'}
    </span>
  );
}
