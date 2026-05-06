import type { Course, Enrollment, Module } from '@/api';

export interface CourseStats {
  course: Course;
  enrollments: Enrollment[];
  modules: Module[];
  completionRate: number;
}

export type TimeRange = '7d' | '30d' | '90d' | 'all';
export type PublishState = 'published' | 'unpublished';

export const RANGE_DAYS: Record<TimeRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  'all': null,
};

export const RANGE_LABELS: Record<TimeRange, string> = {
  '7d': '7 dní',
  '30d': '30 dní',
  '90d': '90 dní',
  'all': 'Vše',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Koncept',
  generated: 'Vygenerováno',
  edited: 'Upravuje se',
  in_review: 'Ke schválení',
  approved: 'Schváleno',
  archived: 'Archivováno',
  failed: 'Chyba',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  generated: '#3b82f6',
  edited: '#f59e0b',
  in_review: '#6366f1',
  approved: '#10b981',
  archived: '#f97316',
  failed: '#ef4444',
};

export const COURSE_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#8b5cf6', '#22c55e',
  '#3b82f6', '#f97316',
];

export const TILES_PER_PAGE = 8;
