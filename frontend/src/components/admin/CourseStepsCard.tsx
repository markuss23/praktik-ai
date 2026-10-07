'use client';

import { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import { useAdminChrome } from './AdminChromeProvider';
import { SideTooltip } from './SideTooltip';

export type CourseStep = 'description' | 'content' | 'tests' | 'summary';

export const COURSE_STEPS: { key: CourseStep; label: string; hint: string }[] = [
  { key: 'description', label: 'Popis kurzu', hint: 'Název, zaměření, podklady' },
  { key: 'content', label: 'Podklady', hint: 'Moduly a jejich obsah' },
  { key: 'tests', label: 'Testy', hint: 'Otázky k modulům' },
  { key: 'summary', label: 'Souhrn', hint: 'Kontrola a dokončení' },
];

/** Krok 3 ze 4 */
export function courseStepLabel(step: CourseStep): string {
  const index = COURSE_STEPS.findIndex((s) => s.key === step);
  return `Krok ${index + 1} ze ${COURSE_STEPS.length}`;
}

export function moduleCountHint(count: number): string {
  return `${count} ${czechPlural(count, 'modul', 'moduly', 'modulů')}`;
}

export function questionCountHint(count: number): string {
  return `${count} ${czechPlural(count, 'otázka', 'otázky', 'otázek')} v modulu`;
}

/** Přechod na krok tvorby kurzu (bez ukládání — to si řeší pohled před voláním). */
export function useCourseStepNavigation(courseId: number) {
  const { goToCourseEdit, goToCourseContent, goToCourseTests, goToCourseSummary } = useAdminNavigation();
  return useCallback(
    (step: CourseStep, moduleId?: number) => {
      if (step === 'description') goToCourseEdit(courseId);
      else if (step === 'content') goToCourseContent(courseId, moduleId);
      else if (step === 'tests') goToCourseTests(courseId, moduleId);
      else goToCourseSummary(courseId);
    },
    [courseId, goToCourseEdit, goToCourseContent, goToCourseTests, goToCourseSummary],
  );
}

type StepState = 'done' | 'current' | 'upcoming';

function StepCircle({ number, state, pending }: { number: number; state: StepState; pending?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
        state === 'current' && 'bg-gradient-r text-primary-foreground',
        state === 'done' && 'bg-primary text-primary-foreground',
        state === 'upcoming' && 'border border-border bg-card text-muted-foreground',
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : number}
    </span>
  );
}

interface CourseStepsCardProps {
  current: CourseStep;
  /** Přechod na jiný krok (uloží a přesměruje). Bez něj kroky nejsou klikací. */
  onNavigate?: (step: CourseStep) => void | Promise<void>;
  /** Kroky, na které zatím nejde přejít (např. nový kurz bez uloženého ID). */
  disabledSteps?: CourseStep[];
  /** Podtitulky kroků podle dat pohledu („3 moduly", „2 otázky v modulu"…). */
  hints?: Partial<Record<CourseStep, string>>;
  /** Obsah pod aktivním krokem — typicky seznam modulů (StepModuleList). */
  children?: React.ReactNode;
  /** Varianta v mobilním Draweru: vždy rozbalená, místo sbalení zavírací křížek. */
  onClose?: () => void;
  className?: string;
}

/**
 * Karta „Tvorba kurzu" — svislý krokový průvodce (Popis kurzu → Podklady →
 * Testy → Souhrn). Nahrazuje dřívější lištu „Fáze tvorby" i kartu Osnova
 * kurzu: přepínání modulů žije pod aktivním krokem. Sbalit ji jde na úzký
 * pruh s čísly kroků (zelená = hotovo, fialová = aktuální, šedá = další).
 */
export function CourseStepsCard({
  current,
  onNavigate,
  disabledSteps = [],
  hints,
  children,
  onClose,
  className,
}: CourseStepsCardProps) {
  const { stepsCardCollapsed, toggleStepsCard } = useAdminChrome();
  const [pending, setPending] = useState<CourseStep | null>(null);
  const inDrawer = onClose !== undefined;
  const collapsed = !inDrawer && stepsCardCollapsed;
  const currentIndex = COURSE_STEPS.findIndex((s) => s.key === current);

  const stateOf = (index: number): StepState =>
    index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';

  const canGo = (step: CourseStep) =>
    !!onNavigate && step !== current && !disabledSteps.includes(step) && pending === null;

  const go = async (step: CourseStep) => {
    if (!canGo(step) || !onNavigate) return;
    setPending(step);
    try {
      // onNavigate ukládá a teprve pak přesměruje; když uložení selže, zůstaneme
      await onNavigate(step);
    } finally {
      setPending(null);
    }
  };

  if (collapsed) {
    return (
      <nav
        aria-label="Tvorba kurzu"
        className={cn(
          'hidden lg:flex w-14 shrink-0 self-start flex-col items-center gap-3 rounded-xl border border-border bg-card py-3 shadow-sm',
          className,
        )}
      >
        <SideTooltip label="Rozbalit kroky tvorby" enabled>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleStepsCard}
            aria-label="Rozbalit kroky tvorby"
            aria-expanded={false}
            className="text-muted-foreground"
          >
            <ChevronRight />
          </Button>
        </SideTooltip>
        {COURSE_STEPS.map((step, index) => {
          const state = stateOf(index);
          const unreachable = state !== 'current' && (disabledSteps.includes(step.key) || !onNavigate);
          return (
            <SideTooltip key={step.key} label={`${index + 1}. ${step.label}`} enabled>
              <Button
                variant="plain"
                type="button"
                onClick={() => go(step.key)}
                disabled={!canGo(step.key) && state !== 'current'}
                aria-label={`${index + 1}. ${step.label}`}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  BTN_KEEP_BOX,
                  'rounded-full p-0',
                  // Kit tlumí disabled na 50 % — tady jen kroky, kam opravdu nejde přejít
                  unreachable ? 'disabled:opacity-50' : 'disabled:opacity-100',
                  state === 'current' && 'cursor-default',
                )}
              >
                <StepCircle number={index + 1} state={state} pending={pending === step.key} />
              </Button>
            </SideTooltip>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Tvorba kurzu"
      className={cn(
        inDrawer
          ? 'flex w-full flex-1 flex-col overflow-hidden bg-card'
          : 'hidden lg:flex w-64 shrink-0 self-start lg:max-h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2 border-b border-border px-4 pt-4 pb-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">Tvorba kurzu</h2>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Průběh tvorby kurzu"
            aria-valuemin={1}
            aria-valuemax={COURSE_STEPS.length}
            aria-valuenow={currentIndex + 1}
          >
            <div
              className="h-full rounded-full bg-gradient-r transition-[width] duration-300"
              style={{ width: `${((currentIndex + 1) / COURSE_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        {inDrawer ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Zavřít kroky tvorby" className="text-muted-foreground">
            <X />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleStepsCard}
            aria-label="Sbalit kroky tvorby"
            aria-expanded
            title="Sbalit"
            className="text-muted-foreground"
          >
            <ChevronLeft />
          </Button>
        )}
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto py-1">
        {COURSE_STEPS.map((step, index) => {
          const state = stateOf(index);
          const clickable = canGo(step.key);
          const unreachable = !clickable && state !== 'current' && (disabledSteps.includes(step.key) || !onNavigate);
          return (
            <li key={step.key}>
              <Button
                variant="plain"
                type="button"
                onClick={() => go(step.key)}
                disabled={!clickable}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  BTN_KEEP_BOX,
                  'h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left whitespace-normal',
                  state === 'current' ? 'bg-gradient-r/10 cursor-default' : clickable && 'hover:bg-muted/60',
                  // Kit tlumí disabled na 50 % — tady jen kroky, kam opravdu nejde přejít
                  unreachable ? 'disabled:opacity-50' : 'disabled:opacity-100',
                )}
              >
                <StepCircle number={index + 1} state={state} pending={pending === step.key} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{step.label}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {hints?.[step.key] ?? step.hint}
                  </span>
                </span>
              </Button>
              {state === 'current' && children}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface StepModuleItem {
  id: number;
  title: string;
  selected: boolean;
  /** Počet komentářů z kontroly k modulu. */
  badge?: number;
  /** Nově přidaný, zatím neuložený modul — jde odebrat. */
  isNew?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  /** Doplňkový obsah pod vybraným modulem (např. odkazy na otázky). */
  extra?: React.ReactNode;
}

interface StepModuleListProps {
  items: StepModuleItem[];
  onAdd?: () => void;
}

/** Seznam modulů pod aktivním krokem karty „Tvorba kurzu" (dřív Osnova kurzu). */
export function StepModuleList({ items, onAdd }: StepModuleListProps) {
  return (
    <div className="pt-1 pb-2 pr-3 pl-12">
      {items.length === 0 && (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">Žádné moduly</p>
      )}
      <ul className="space-y-0.5">
        {items.map((item, index) => (
          <li key={item.id}>
            <div
              className={cn(
                'group flex items-center gap-1.5 rounded-md transition-colors',
                item.selected ? 'bg-gradient-r/15' : 'hover:bg-muted',
                item.isNew && !item.selected && 'bg-warning/10',
              )}
            >
              <Button
                variant="plain"
                type="button"
                onClick={item.onSelect}
                aria-current={item.selected ? 'true' : undefined}
                className={cn(
                  BTN_KEEP_BOX,
                  'h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 text-left text-sm font-normal',
                  item.selected ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  {item.title || 'Bez názvu'}
                  {item.isNew && <span className="ml-1.5 text-xs text-warning">(nový)</span>}
                </span>
              </Button>
              {(item.badge ?? 0) > 0 && (
                <span
                  className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-primary-foreground"
                  title="Komentáře z kontroly"
                >
                  {item.badge}
                </span>
              )}
              {item.isNew && item.onDelete && (
                <Button
                  variant="ghost-destructive"
                  size="icon-xs"
                  onClick={item.onDelete}
                  aria-label={`Odstranit modul ${item.title}`}
                  title="Odstranit modul"
                  className="mr-1 shrink-0"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            {item.selected && item.extra}
          </li>
        ))}
      </ul>
      {onAdd && (
        <Button
          variant="dashed"
          size="sm"
          onClick={onAdd}
          className="mt-1.5 w-full justify-start"
        >
          <Plus data-icon="inline-start" />
          Přidat modul
        </Button>
      )}
    </div>
  );
}
