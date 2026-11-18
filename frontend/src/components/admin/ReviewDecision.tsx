'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  Loader2,
  MessageSquare,
  ShieldCheck,
  ThumbsUp,
  TriangleAlert,
  Undo2,
} from 'lucide-react';

import type { Course, Module } from '@/api';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  ConfirmModal,
  Label,
  Modal,
  Progress,
} from '@/components/ui';
import { courseInfoRows, EMPTY } from '@/components/admin/ReviewCourseSummary';
import type { CourseAssessmentConfig } from '@/lib/api-client';
import { formatName } from '@/lib/assessment-labels';
import { cn, czechPlural } from '@/lib/utils';

export interface ReviewPart {
  key: string;
  label: string;
  visited: boolean;
}

export interface ReviewWarning {
  text: string;
  // Klíč části kurzu, kde se nedostatek dá zkontrolovat ('summary', 'module:<id>', 'final')
  target: string;
}

const commentsCount = (n: number) => `${n} ${czechPlural(n, 'komentář', 'komentáře', 'komentářů')}`;

// Upozornění z dat kurzu; schválení neblokují. configs = null -> testy se nekontrolují (nenačetly se)
export function collectReviewWarnings(
  course: Course,
  modules: Module[],
  configs: CourseAssessmentConfig[] | null,
): ReviewWarning[] {
  const warnings: ReviewWarning[] = [];
  const add = (text: string, target: string) => warnings.push({ text, target });

  if (!course.description?.trim()) add('Kurz nemá popis.', 'summary');
  if (!course.imageUrl) add('Kurz nemá vlastní náhledový obrázek, zobrazí se výchozí.', 'summary');

  const missingCategories = [
    !course.krauuCompetences?.length && 'KRAUU kompetence',
    !course.bloomLevels?.length && 'Bloomova taxonomie',
    !course.crossSubjects?.length && 'průřezové obory',
  ].filter(Boolean);
  if (missingCategories.length > 0) add(`Chybí pedagogické zařazení: ${missingCategories.join(', ')}.`, 'summary');

  const emptyInfo = courseInfoRows(course, modules.length)
    .filter((row) => row.value === EMPTY)
    .map((row) => row.label);
  if (emptyInfo.length > 0) add(`Nevyplněné údaje kurzu: ${emptyInfo.join(', ')}.`, 'summary');

  const noQuestions = (c: CourseAssessmentConfig) =>
    c.assessmentTypeCode === 'closed_questions' && (c.settings?.questions?.length ?? 0) === 0;

  for (const mod of modules) {
    const name = `Modul „${mod.title}“`;
    const target = `module:${mod.moduleId}`;
    if (!mod.learnBlocks?.length) add(`${name} nemá obsah příručky.`, target);
    if (!configs) continue;
    const own = configs.filter((c) => c.moduleId === mod.moduleId);
    if (!own.some((c) => c.assessmentTypeCode === 'pretest')) add(`${name} nemá pretest.`, target);
    if (!own.some((c) => c.assessmentTypeCode !== 'pretest')) add(`${name} nemá procvičování ani test modulu.`, target);
    for (const c of own.filter(noQuestions)) {
      add(`${name}: formát „${formatName(c.assessmentTypeCode)}“ nemá žádné otázky.`, target);
    }
  }

  if (configs) {
    const final = configs.filter((c) => c.context === 'course_final');
    if (final.length === 0) add('Kurz nemá závěrečný test.', 'final');
    for (const c of final.filter(noQuestions)) {
      add(`Závěrečný test: formát „${formatName(c.assessmentTypeCode)}“ nemá žádné otázky.`, 'final');
    }
  }

  return warnings;
}

// Barevný je jen štítek s ikonou, plochy zůstávají neutrální
type Tone = 'success' | 'attention' | 'neutral';
const TONE_CHIP: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  attention: 'bg-brand-accent/10 text-brand-accent',
  neutral: 'bg-muted text-muted-foreground',
};

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 @md:gap-3 @md:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TONE_CHIP[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Panel({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {meta && <span className="hidden text-xs text-muted-foreground @md:inline">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

interface ReviewDecisionOverviewProps {
  parts: ReviewPart[];
  onOpenPart: (key: string) => void;
  warnings: ReviewWarning[];
  // false = testy se nepodařilo načíst, kontrola je jen částečná
  testsChecked: boolean;
  unresolvedCount: number;
  resolvedCount: number;
  onOpenComments: () => void;
  // Stav místo rozhodování (schválený kurz, vlastní kurz apod.)
  notice?: ReactNode;
}

// Obsah kroku Rozhodnutí: souhrnné ukazatele, automatická kontrola a části kurzu
export function ReviewDecisionOverview({
  parts,
  onOpenPart,
  warnings,
  testsChecked,
  unresolvedCount,
  resolvedCount,
  onOpenComments,
  notice,
}: ReviewDecisionOverviewProps) {
  const visitedCount = parts.filter((p) => p.visited).length;
  const allVisited = visitedCount === parts.length;
  const nextUnvisited = parts.find((p) => !p.visited);
  const partLabel = (key: string) => {
    const label = parts.find((p) => p.key === key)?.label ?? '';
    // "Modul 2: Název" -> "Modul 2", u ostatních celý název
    return label.startsWith('Modul ') ? label.split(':')[0] : label;
  };

  // Rozložení podle šířky obsahu, ne okna: vedle může být otevřený panel komentářů.
  // Seznam částí tu není, ten je v osnově vlevo.
  return (
    <div className="@container flex flex-col gap-6">
      {notice}

      <div className="grid gap-3 @md:grid-cols-3">
        <StatTile
          icon={Eye}
          tone={allVisited ? 'success' : 'neutral'}
          label="Prohlédnuto"
          value={
            <>
              {visitedCount}
              <span className="text-base font-normal text-muted-foreground"> z {parts.length}</span>
            </>
          }
        >
          <Progress value={(visitedCount / Math.max(1, parts.length)) * 100} aria-label="Prohlédnuté části kurzu" />
          {nextUnvisited && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onOpenPart(nextUnvisited.key)}
              className="h-auto max-w-full self-start px-0"
            >
              <span className="truncate">Otevřít: {partLabel(nextUnvisited.key)}</span>
            </Button>
          )}
        </StatTile>
        <StatTile
          icon={warnings.length > 0 ? TriangleAlert : ShieldCheck}
          tone={warnings.length > 0 ? 'attention' : 'success'}
          label="Upozornění"
          value={warnings.length}
          hint={warnings.length > 0 ? 'neblokují schválení' : 'nic nechybí'}
        />
        <StatTile
          icon={MessageSquare}
          tone={unresolvedCount > 0 ? 'attention' : 'neutral'}
          label="Komentáře"
          value={unresolvedCount}
          hint={resolvedCount > 0 ? `k opravě, ${resolvedCount} vyřešené autorem` : 'k opravě'}
        >
          <Button variant="link" size="sm" onClick={onOpenComments} className="h-auto self-start px-0">
            Zobrazit komentáře
          </Button>
        </StatTile>
      </div>

      <Panel
        title="Automatická kontrola"
        meta={testsChecked ? 'upozornění' : 'testy se nenačetly, nejsou zahrnuté'}
      >
        {warnings.length > 0 ? (
          <ul className="divide-y divide-border">
            {warnings.map((w) => (
              // Na úzké šířce se odkaz na část kurzu zalomí pod text
              <li key={w.text} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-accent" aria-hidden />
                <span className="min-w-0 flex-1 basis-48 text-sm text-foreground">{w.text}</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => onOpenPart(w.target)}
                  aria-label={`Zobrazit: ${partLabel(w.target)}`}
                  className="ml-auto text-muted-foreground"
                >
                  {partLabel(w.target)}
                  <ChevronRight data-icon="inline-end" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="size-5 shrink-0 text-success" />
            Kontrola nenašla chybějící údaje ani prázdné testy.
          </div>
        )}
      </Panel>
    </div>
  );
}

interface ReviewDecisionActionsProps {
  // Popisky částí, které garant v tomto kole neotevřel
  unvisited: string[];
  unresolvedCount: number;
  // Vrácení bez komentáře nedává smysl -> místo potvrzení otevře panel komentářů s výzvou
  returnNeedsComment: boolean;
  onWriteComment: () => void;
  onApprove: () => Promise<boolean>;
  onReturn: () => Promise<boolean>;
}

// Tlačítka Vrátit k úpravám / Schválit kurz s potvrzovacími dialogy
export function ReviewDecisionActions({
  unvisited,
  unresolvedCount,
  returnNeedsComment,
  onWriteComment,
  onApprove,
  onReturn,
}: ReviewDecisionActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<boolean>, close: () => void) => {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (ok) close();
  };

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={() => (returnNeedsComment ? onWriteComment() : setReturnOpen(true))}
        >
          <Undo2 data-icon="inline-start" />
          Vrátit k úpravám
        </Button>
        <Button
          size="lg"
          onClick={() => {
            setConfirmed(false);
            setApproveOpen(true);
          }}
        >
          <ThumbsUp data-icon="inline-start" />
          Schválit kurz
        </Button>
      </div>

      <Modal
        isOpen={approveOpen}
        onClose={() => {
          if (!busy) setApproveOpen(false);
        }}
        title="Schválit kurz?"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => setApproveOpen(false)}>
              Zrušit
            </Button>
            <Button size="lg" disabled={!confirmed || busy} onClick={() => run(onApprove, () => setApproveOpen(false))}>
              {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <ThumbsUp data-icon="inline-start" />}
              Schválit kurz
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {unvisited.length > 0 && (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>
                {unvisited.length === 1 ? 'Jedna část kurzu nebyla otevřena' : 'Některé části kurzu nebyly otevřeny'}
              </AlertTitle>
              <AlertDescription>
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {unvisited.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {unresolvedCount > 0 && (
            <Alert variant="warning">
              <MessageSquare />
              <AlertDescription>
                Kurz má {commentsCount(unresolvedCount)} k opravě. Po schválení je autor opravovat nemusí.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Schválený kurz může autor zveřejnit studentům. Vrátit ho zpět do úprav může jen superadmin.
          </p>
          <Label className="items-start gap-3 rounded-lg border border-border p-3 font-normal leading-normal">
            <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked)} className="mt-0.5" />
            Potvrzuji, že obsah kurzu odpovídá požadavkům na zveřejnění a za jeho schválení odpovídám.
          </Label>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={returnOpen}
        variant="warning"
        title="Vrátit kurz k úpravám?"
        message={
          unresolvedCount > 0
            ? `Autor uvidí ${commentsCount(unresolvedCount)} k opravě. Po úpravách kurz znovu odešle ke schválení.`
            : 'Autor kurz upraví a znovu ho odešle ke schválení.'
        }
        confirmLabel="Vrátit k úpravám"
        loading={busy}
        onConfirm={() => run(onReturn, () => setReturnOpen(false))}
        onCancel={() => setReturnOpen(false)}
      />
    </>
  );
}
