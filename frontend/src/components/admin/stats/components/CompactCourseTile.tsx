'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import { type CourseStats, STATUS_COLORS, STATUS_LABELS } from './constants';
import { MiniStat } from './StatsPrimitives';

interface CompactCourseTileProps {
  stats: CourseStats;
  color: string;
  /** Receives the course id so a single stable handler can be shared across all tiles. */
  onSelect: (courseId: number) => void;
  isSelected: boolean;
  idx: number;
  showOwner?: boolean;
}

function CompactCourseTileImpl({
  stats, color, onSelect, isSelected, idx, showOwner = false,
}: CompactCourseTileProps) {
  const courseId = stats.course.courseId;
  const completedCount = stats.enrollments.filter(e => e.completedAt !== null).length;
  // If modules array is non-empty use it (lector view), otherwise fall back to course.modulesCount (superadmin lazy view)
  const moduleCount = stats.modules.length > 0
    ? stats.modules.filter(m => m.isActive).length
    : (stats.course.modulesCount ?? 0);
  const status = stats.course.status as string;
  const isPub = !!stats.course.isPublished;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(courseId)}
      className={`text-left bg-card rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all w-full ${
        isSelected ? 'border-gradient-r/30 ring-2 ring-gradient-r/30' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{stats.course.title}</h4>
          {showOwner && stats.course.ownerDisplayName && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{stats.course.ownerDisplayName}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${STATUS_COLORS[status] ?? 'var(--muted-foreground)'}1a`, color: STATUS_COLORS[status] ?? 'var(--muted-foreground)' }}
            >
              <span className="size-1 rounded-full" style={{ background: STATUS_COLORS[status] ?? 'var(--muted-foreground)' }} />
              {STATUS_LABELS[status] ?? status}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isPub ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isPub ? '● Publikováno' : '○ Nepublikováno'}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <MiniStat label="Zápisy" value={stats.enrollments.length} />
        <MiniStat label="Hotovo" value={completedCount} />
        <MiniStat label="Moduly" value={moduleCount} />
      </div>
      <div>
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Úspěšnost</span>
          <span className="font-semibold text-foreground tabular-nums">{stats.completionRate}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionRate}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.04 + 0.2 }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>
    </motion.button>
  );
}

export const CompactCourseTile = memo(CompactCourseTileImpl);
