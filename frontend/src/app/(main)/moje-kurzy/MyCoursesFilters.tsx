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
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Hledat v mých kurzech…"
            className="w-full h-10 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Vymazat hledání"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Seřadit:</label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="h-10 px-3 text-sm text-foreground bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30"
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
                  ? 'bg-gradient-r text-primary-foreground border border-gradient-r'
                  : 'bg-muted/50 text-foreground border border-border hover:bg-muted'
              }`}
            >
              {opt.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                  active ? 'bg-card/25 text-primary-foreground' : 'bg-card text-muted-foreground'
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
