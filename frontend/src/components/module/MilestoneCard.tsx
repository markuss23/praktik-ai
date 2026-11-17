'use client';

import { useId } from 'react';
import { CheckCircle, Flag, Lock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MilestoneStatus = 'active' | 'done' | 'locked';

interface MilestoneCardProps {
  // start = pretest (brana do modulu), finish = zaverecny test modulu nebo kurzu
  kind: 'start' | 'finish';
  status: MilestoneStatus;
  // Stitek nad nadpisem u aktivniho milniku; hotovy a zamceny maji vlastni
  label: string;
  title: string;
  note?: React.ReactNode;
  headingLevel?: 2 | 3 | 4;
  // Runner nebo seznam formatu; u zamceneho milniku se nevykresli
  children?: React.ReactNode;
  className?: string;
}

const STATUS_LABEL: Record<Exclude<MilestoneStatus, 'active'>, string> = {
  done: 'Splněno',
  locked: 'Zamčeno',
};

// Milnik v pruchodu kurzem (pretest, zaverecny test). Silnejsi ramecek a plna ikona
// ho oddeli od ostatnich casti, barvy jako aktivni zalozka a tlacitka testu.
export function MilestoneCard({
  kind,
  status,
  label,
  title,
  note,
  headingLevel = 4,
  children,
  className,
}: MilestoneCardProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;
  const Icon = status === 'done' ? CheckCircle : status === 'locked' ? Lock : kind === 'start' ? Flag : Trophy;

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'overflow-hidden rounded-lg border-2 bg-card',
        status === 'active' && 'border-gradient-r/40',
        status === 'done' && 'border-success/40',
        status === 'locked' && 'border-border',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-4 px-5 py-4 sm:px-6',
          status === 'active' && 'bg-gradient-r/10',
          status === 'done' && 'bg-success/10',
          status === 'locked' && 'bg-muted/50',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            status === 'active' && 'bg-gradient-r text-primary-foreground',
            status === 'done' && 'bg-success text-primary-foreground',
            status === 'locked' && 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              'text-xs font-medium uppercase tracking-wider',
              status === 'active' && 'text-gradient-r',
              status === 'done' && 'text-success',
              status === 'locked' && 'text-muted-foreground',
            )}
          >
            {status === 'active' ? label : STATUS_LABEL[status]}
          </p>
          <Heading id={titleId} className="text-lg font-bold text-foreground">
            {title}
          </Heading>
          {note && <p className="mt-0.5 text-sm text-muted-foreground">{note}</p>}
        </div>
      </div>
      {children && status !== 'locked' && (
        <div className="border-t border-border px-5 py-5 sm:px-6">{children}</div>
      )}
    </section>
  );
}

// Cast modulu zamcena za pretestem; vypada jako neaktivni radek seznamu formatu
export function LockedAfterPretest({ title, className }: { title: string; className?: string }) {
  return (
    <section className={cn('flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-3', className)}>
      <Lock aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">Odemkne se po splnění pretestu.</p>
      </div>
    </section>
  );
}
