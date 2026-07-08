'use client';

import { Search, X } from 'lucide-react';

export type StatusFilter = 'all' | 'in-progress' | 'not-started' | 'completed';
export type SortKey = 'recent' | 'progress-desc' | 'progress-asc' | 'title';

interface MyCoursesFiltersProps {
  query: string;
  onQueryChange: (q: string) => void;
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  counts: { all: number; inProgress: number; notStarted: number; completed: number };
}

const STATUS_OPTIONS: { value: StatusFilter; label: string; countKey: keyof MyCoursesFiltersProps['counts'] }[] = [
  { value: 'all', label: 'Vše', countKey: 'all' },
  { value: 'in-progress', label: 'Probíhající', countKey: 'inProgress' },
  { value: 'not-started', label: 'Nezačaté', countKey: 'notStarted' },
  { value: 'completed', label: 'Dokončené', countKey: 'completed' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Nejnovější zápis' },
  { value: 'progress-desc', label: 'Nejvíce rozpracované' },
  { value: 'progress-asc', label: 'Nejméně rozpracované' },
  { value: 'title', label: 'Abecedně' },
];

export function MyCoursesFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  counts,
}: MyCoursesFiltersProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Hledat v mých kurzech…"
            className="w-full h-10 pl-10 pr-9 text-sm text-black placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 text-gray-500"
              aria-label="Vymazat hledání"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Seřadit:</label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="h-10 px-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt.value;
          const count = counts[opt.countKey];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-purple-600 text-white border border-purple-600'
                  : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {opt.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                  active ? 'bg-white/25 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
