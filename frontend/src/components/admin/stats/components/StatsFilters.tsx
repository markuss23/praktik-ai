'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, ChevronDown, CheckCircle2, X, Globe } from 'lucide-react';
import type { Course } from '@/api';
import { RANGE_LABELS, STATUS_LABELS, STATUS_COLORS, type TimeRange, type PublishState } from './constants';

export function TimeRangeToggle({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  const id = useId();
  const layoutId = `time-range-bg-${id}`;
  return (
    <div className="inline-flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
      {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === r ? 'text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {value === r && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-purple-600 rounded-md"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative z-10">{RANGE_LABELS[r]}</span>
        </button>
      ))}
    </div>
  );
}

export function CourseFilterDropdown({
  courses, selected, onChange,
}: {
  courses: Course[];
  selected: Set<number>;
  onChange: (s: Set<number>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => c.title.toLowerCase().includes(q));
  }, [courses, query]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  const label = selected.size === 0
    ? 'Všechny kurzy'
    : selected.size === 1
      ? courses.find(c => c.courseId === [...selected][0])?.title ?? '1 kurz'
      : `${selected.size} kurzů vybráno`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-purple-300 transition-colors text-sm text-gray-700 min-w-[200px]"
      >
        <Filter size={14} className="text-purple-500" />
        <span className="flex-1 text-left truncate">{label}</span>
        {selected.size > 0 && (
          <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 rounded-full px-1.5">
            {selected.size}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 w-80 max-h-96 bg-white border border-gray-200 rounded-xl shadow-lg z-30 flex flex-col overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Hledat kurz…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 text-black"
              />
            </div>
            <div className="overflow-y-auto py-1 flex-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-400 text-center">Žádné kurzy</p>
              ) : filtered.map(c => {
                const checked = selected.has(c.courseId);
                return (
                  <button
                    key={c.courseId}
                    onClick={() => toggle(c.courseId)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-purple-50 transition-colors text-left"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-purple-600 border-purple-600' : 'border-gray-300 bg-white'}`}>
                      {checked && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-sm text-gray-800 flex-1 truncate">{c.title}</span>
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: STATUS_COLORS[c.status as string] ?? '#9ca3af' }}
                    />
                  </button>
                );
              })}
            </div>
            {selected.size > 0 && (
              <div className="p-2 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => onChange(new Set())}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-purple-700 py-1 transition-colors"
                >
                  <X size={12} /> Zrušit výběr
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StatusFilterChips({
  available, selected, onChange,
}: {
  available: string[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  if (available.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {available.map(status => {
        const checked = selected.has(status);
        const color = STATUS_COLORS[status] ?? '#9ca3af';
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            key={status}
            onClick={() => {
              const next = new Set(selected);
              if (next.has(status)) next.delete(status); else next.add(status);
              onChange(next);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
              checked
                ? 'border-transparent text-white shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
            style={checked ? { background: color } : undefined}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: checked ? '#fff' : color }}
            />
            {STATUS_LABELS[status] ?? status}
          </motion.button>
        );
      })}
    </div>
  );
}

export function PublishFilterChips({
  selected, onChange,
}: {
  selected: Set<PublishState>;
  onChange: (s: Set<PublishState>) => void;
}) {
  const options: { key: PublishState; label: string; color: string }[] = [
    { key: 'published', label: 'Publikované', color: '#10b981' },
    { key: 'unpublished', label: 'Nepublikované', color: '#6b7280' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map(({ key, label, color }) => {
        const checked = selected.has(key);
        return (
          <motion.button
            whileTap={{ scale: 0.95 }}
            key={key}
            onClick={() => {
              const next = new Set(selected);
              if (next.has(key)) next.delete(key); else next.add(key);
              onChange(next);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
              checked
                ? 'border-transparent text-white shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
            }`}
            style={checked ? { background: color } : undefined}
          >
            <Globe size={11} className={checked ? 'opacity-90' : 'opacity-60'} />
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
