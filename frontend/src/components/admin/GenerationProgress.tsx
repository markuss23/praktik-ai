'use client';

import { Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui';
import type { CourseGenerationProgress } from '@/lib/api-client';
import type { TrackedGeneration } from './CourseGenerationProvider';

// Backend hlásí 5 kroků; plánování a číselníky sdílejí krok 4 (popis aktuálního
// kroku přijde z backendu, tady je jen pevný seznam pro odškrtávání).
const GENERATION_STEPS = [
  { n: 1, label: 'Načítání kurzu z databáze' },
  { n: 2, label: 'Načítání podkladů' },
  { n: 3, label: 'Zpracování podkladů (AI)' },
  { n: 4, label: 'Plánování modulů, číselníky a otázky (AI)' },
  { n: 5, label: 'Ukládání kurzu' },
];

/**
 * Průběh generování místo formuláře. Nic neblokuje: generování běží na serveru
 * a CourseGenerationProvider ho sleduje, i když uživatel odejde (dokončení
 * ohlásí toast). Šířku si karta bere celou do max-w-2xl, umístění řeší rodič.
 */
export function GenerationProgressCard({
  progress,
  onGoToCourses,
}: {
  progress: CourseGenerationProgress;
  onGoToCourses: () => void;
}) {
  const step = Math.min(progress.step, progress.total);
  return (
    <div
      className="w-full max-w-2xl bg-card rounded-lg shadow-sm p-4 sm:p-6 lg:p-8 view-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">AI generuje váš kurz</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Můžete stránku opustit, generování běží na serveru. Průběh uvidíte i v přehledu kurzů
          a po dokončení vás upozorníme.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground mb-1.5">
          <span className="flex items-center gap-1.5 font-medium min-w-0">
            <Loader2 size={12} className="animate-spin text-gradient-r shrink-0" />
            <span className="truncate">{progress.label}</span>
          </span>
          <span className="tabular-nums shrink-0">{step} / {progress.total}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gradient-r to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((step / progress.total) * 100)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        {GENERATION_STEPS.map(({ n, label }) => {
          const done = progress.step > n || progress.status === 'completed';
          const active = progress.step === n && progress.status === 'running';
          return (
            <li
              key={n}
              className={`flex items-center gap-2 ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
            >
              <span className="size-5 flex items-center justify-center shrink-0">
                {done ? (
                  <Check size={14} className="text-success" />
                ) : active ? (
                  <Loader2 size={14} className="animate-spin text-gradient-r" />
                ) : (
                  <span className="size-1.5 bg-muted rounded-full" />
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onGoToCourses}>
          Přejít na přehled kurzů
        </Button>
      </div>
    </div>
  );
}

/**
 * Proužek nad formulářem: generace jiných kurzů, které běží na pozadí
 * (po refreshi nebo spuštěné z přehledu). Na mobilu je tlačítko pod textem.
 */
export function BackgroundGenerationsBanner({
  generations,
  onGoToCourses,
}: {
  generations: TrackedGeneration[];
  onGoToCourses: () => void;
}) {
  if (generations.length === 0) return null;
  const names = generations
    .map((g) => (g.title ? `„${g.title}"` : `kurz #${g.courseId}`))
    .join(', ');
  return (
    <div className="mb-4 p-3 sm:p-4 bg-tip/10 border border-tip/30 rounded-md text-sm flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Loader2 className="size-4 animate-spin text-tip shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium text-foreground break-words">Na pozadí běží generování: {names}</p>
          <p className="text-muted-foreground">Můžete pokračovat v práci, průběh uvidíte v přehledu kurzů.</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onGoToCourses} className="shrink-0 self-start sm:self-auto">
        Přehled kurzů
      </Button>
    </div>
  );
}
