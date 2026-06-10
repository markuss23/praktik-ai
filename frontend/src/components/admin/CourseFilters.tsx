'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { CourseBlock, CourseTarget, CourseSubject, Difficulty, Status } from '@/api';
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from '@/lib/difficulty';

export interface CourseFilterState {
  onlyMine: boolean;
  difficulty: Difficulty | '';
  status: Status | '';
  published: 'all' | 'yes' | 'no';
  blockId: number;
  targetId: number;
  subjectId: number;
  search: string;
}

export const DEFAULT_COURSE_FILTERS: CourseFilterState = {
  onlyMine: false,
  difficulty: '',
  status: '',
  published: 'all',
  blockId: 0,
  targetId: 0,
  subjectId: 0,
  search: '',
};

// Popisky stavů sjednocené s Badge.tsx
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: Status.Draft, label: 'Draft' },
  { value: Status.Generated, label: 'Vygenerováno' },
  { value: Status.Edited, label: 'Rozpracováno' },
  { value: Status.InReview, label: 'Ke schválení' },
  { value: Status.Approved, label: 'Schváleno' },
  { value: Status.Archived, label: 'Archivováno' },
];

interface CourseFiltersProps {
  value: CourseFilterState;
  onChange: (next: CourseFilterState) => void;
  blocks: CourseBlock[];
  targets: CourseTarget[];
  subjects: CourseSubject[];
  totalCount: number;
  filteredCount: number;
}

const selectClass =
  'px-2.5 py-1.5 border border-gray-300 rounded-md text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

export function CourseFilters({
  value,
  onChange,
  blocks,
  targets,
  subjects,
  totalCount,
  filteredCount,
}: CourseFiltersProps) {
  const set = <K extends keyof CourseFilterState>(key: K, v: CourseFilterState[K]) =>
    onChange({ ...value, [key]: v });

  const isFiltered =
    value.onlyMine ||
    value.difficulty !== '' ||
    value.status !== '' ||
    value.published !== 'all' ||
    value.blockId !== 0 ||
    value.targetId !== 0 ||
    value.subjectId !== 0 ||
    value.search.trim() !== '';

  const reset = () => onChange({ ...DEFAULT_COURSE_FILTERS });

  return (
    <div className="px-3 sm:px-6 py-3 border-b bg-gray-50">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium mr-1">
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filtry</span>
        </div>

        {/* Hledání podle názvu */}
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={value.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Hledat podle názvu…"
            className="w-44 sm:w-56 pl-8 pr-2.5 py-1.5 border border-gray-300 rounded-md text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Pouze moje kurzy */}
        <label className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer select-none hover:bg-gray-50">
          <input
            type="checkbox"
            checked={value.onlyMine}
            onChange={(e) => set('onlyMine', e.target.checked)}
            className="accent-blue-600"
          />
          Pouze moje kurzy
        </label>

        {/* Obtížnost */}
        <select
          value={value.difficulty}
          onChange={(e) => set('difficulty', e.target.value as Difficulty | '')}
          className={selectClass}
          aria-label="Obtížnost"
        >
          <option value="">Obtížnost: vše</option>
          {DIFFICULTY_ORDER.map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
          ))}
        </select>

        {/* Stav */}
        <select
          value={value.status}
          onChange={(e) => set('status', e.target.value as Status | '')}
          className={selectClass}
          aria-label="Stav"
        >
          <option value="">Stav: vše</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Publikováno */}
        <select
          value={value.published}
          onChange={(e) => set('published', e.target.value as CourseFilterState['published'])}
          className={selectClass}
          aria-label="Publikováno"
        >
          <option value="all">Publikováno: vše</option>
          <option value="yes">Publikované</option>
          <option value="no">Nepublikované</option>
        </select>

        {/* Blok */}
        <select
          value={value.blockId}
          onChange={(e) => set('blockId', Number(e.target.value))}
          className={selectClass}
          aria-label="Tematický blok"
        >
          <option value={0}>Blok: vše</option>
          {blocks.map((b) => (
            <option key={b.blockId} value={b.blockId}>{b.name}</option>
          ))}
        </select>

        {/* Cílová skupina */}
        <select
          value={value.targetId}
          onChange={(e) => set('targetId', Number(e.target.value))}
          className={selectClass}
          aria-label="Cílová skupina"
        >
          <option value={0}>Cíl. skupina: vše</option>
          {targets.map((t) => (
            <option key={t.targetId} value={t.targetId}>{t.name}</option>
          ))}
        </select>

        {/* Předmět */}
        <select
          value={value.subjectId}
          onChange={(e) => set('subjectId', Number(e.target.value))}
          className={selectClass}
          aria-label="Předmět"
        >
          <option value={0}>Předmět: vše</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>{s.name}</option>
          ))}
        </select>

        {isFiltered && (
          <button
            onClick={reset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
          >
            <X size={14} /> Zrušit filtry
          </button>
        )}

        <span className="ml-auto text-xs text-gray-500 whitespace-nowrap">
          Zobrazeno {filteredCount} z {totalCount}
        </span>
      </div>
    </div>
  );
}

export default CourseFilters;
