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
      className={`text-left bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all w-full ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{stats.course.title}</h4>
          {showOwner && stats.course.ownerDisplayName && (
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{stats.course.ownerDisplayName}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: `${STATUS_COLORS[status] ?? '#9ca3af'}1a`, color: STATUS_COLORS[status] ?? '#6b7280' }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: STATUS_COLORS[status] ?? '#9ca3af' }} />
              {STATUS_LABELS[status] ?? status}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isPub ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
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
          <span className="text-gray-500">Úspěšnost</span>
          <span className="font-semibold text-gray-900 tabular-nums">{stats.completionRate}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
