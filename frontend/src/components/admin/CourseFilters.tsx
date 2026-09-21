'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { CourseBlock, CourseTarget, CourseSubject, Difficulty, Status } from '@/api';
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from '@/lib/difficulty';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

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

// Pevná šířka a výška: výběr hodnoty nesmí změnit rozměry filtru,
// jinak se přeskládá celý řádek a seznam pod ním poskočí.
// Mobil: dva filtry vedle sebe (gap-2 = 0.5rem), od sm: fixních 160px.
// `data-[size=default]:h-9` musí být uvedené explicitně — kitový trigger si
// výšku drží přes data-atribut, který by pouhé `h-9` nepřebilo.
const selectClass =
  'h-9 data-[size=default]:h-9 w-[calc(50%-0.25rem)] sm:w-40 px-2.5 border border-border rounded-md text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-tip/30';

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

  // Base UI Select potřebuje `items`, aby trigger uměl zobrazit popisek hodnoty.
  const difficultyItems = [
    { label: 'Obtížnost: vše', value: '' as Difficulty | '' },
    ...DIFFICULTY_ORDER.map((d) => ({ label: DIFFICULTY_LABELS[d], value: d as Difficulty | '' })),
  ];
  const statusItems = [
    { label: 'Stav: vše', value: '' as Status | '' },
    ...STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value as Status | '' })),
  ];
  const publishedItems: { label: string; value: CourseFilterState['published'] }[] = [
    { label: 'Publikováno: vše', value: 'all' },
    { label: 'Publikované', value: 'yes' },
    { label: 'Nepublikované', value: 'no' },
  ];
  const blockItems = [
    { label: 'Blok: vše', value: 0 },
    ...blocks.map((b) => ({ label: b.name, value: b.blockId })),
  ];
  const targetItems = [
    { label: 'Cíl. skupina: vše', value: 0 },
    ...targets.map((t) => ({ label: t.name, value: t.targetId })),
  ];
  const subjectItems = [
    { label: 'Předmět: vše', value: 0 },
    ...subjects.map((o) => ({ label: o.name, value: o.subjectId })),
  ];

  return (
    <div className="px-3 sm:px-6 py-3 border-b bg-muted/50">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="h-9 flex items-center gap-1.5 text-muted-foreground text-sm font-medium mr-1">
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filtry</span>
        </div>

        {/* Hledání podle názvu */}
        <div className="relative w-full sm:w-56">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={value.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Hledat podle názvu…"
            className={cn("h-auto", "w-full h-9 pl-8 pr-2.5 border border-border rounded-md text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-tip/30")}
          />
        </div>

        {/* Pouze moje kurzy */}
        <label className="h-9 flex items-center gap-2 px-2.5 bg-card border border-border rounded-md text-sm text-foreground cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap">
          <input
            type="checkbox"
            checked={value.onlyMine}
            onChange={(e) => set('onlyMine', e.target.checked)}
            className="accent-blue-600"
          />
          Pouze moje kurzy
        </label>

        {/* Obtížnost */}
        <Select
          items={difficultyItems}
          value={value.difficulty}
          onValueChange={(v) => set('difficulty', v as Difficulty | '')}
        >
          <SelectTrigger className={selectClass} aria-label="Obtížnost">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {difficultyItems.map((o) => (
              <SelectItem key={String(o.value)} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stav */}
        <Select
          items={statusItems}
          value={value.status}
          onValueChange={(v) => set('status', v as Status | '')}
        >
          <SelectTrigger className={selectClass} aria-label="Stav">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((o) => (
              <SelectItem key={String(o.value)} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Publikováno */}
        <Select
          items={publishedItems}
          value={value.published}
          onValueChange={(v) => set('published', v as CourseFilterState['published'])}
        >
          <SelectTrigger className={selectClass} aria-label="Publikováno">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {publishedItems.map((o) => (
              <SelectItem key={String(o.value)} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Blok */}
        <Select
          items={blockItems}
          value={value.blockId}
          onValueChange={(v) => set('blockId', Number(v))}
        >
          <SelectTrigger className={selectClass} aria-label="Tematický blok">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {blockItems.map((o) => (
              <SelectItem key={String(o.value)} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Cílová skupina */}
        <Select
          items={targetItems}
          value={value.targetId}
          onValueChange={(v) => set('targetId', Number(v))}
        >
          <SelectTrigger className={selectClass} aria-label="Cílová skupina">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targetItems.map((o) => (
              <SelectItem key={String(o.value)} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Předmět */}
        <Select
          items={subjectItems}
          value={value.subjectId}
          onValueChange={(v) => set('subjectId', Number(v))}
        >
          <SelectTrigger className={selectClass} aria-label="Předmět">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {subjectItems.map((o) => (
              <SelectItem key={String(o.value)} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tlačítko je vykreslené vždy, aby jeho objevení nerozhýbalo řádek —
            bez aktivních filtrů je jen neviditelné (místo zůstává rezervované). */}
        <Button
          variant="plain"
          onClick={reset}
          tabIndex={isFiltered ? 0 : -1}
          aria-hidden={!isFiltered}
          className={cn(BTN_KEEP_BOX, `h-9 flex items-center gap-1 px-2.5 text-sm rounded-md transition-colors whitespace-nowrap ${
            isFiltered
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
              : 'invisible pointer-events-none'
          }`)}
        >
          <X size={14} /> Zrušit filtry
        </Button>

        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap tabular-nums">
          Zobrazeno {filteredCount} z {totalCount}
        </span>
      </div>
    </div>
  );
}

export default CourseFilters;
