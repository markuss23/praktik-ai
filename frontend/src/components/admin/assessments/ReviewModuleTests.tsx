'use client';

import { useEffect, useState } from 'react';
import { Check, Dumbbell, Loader2 } from 'lucide-react';
import type { ClosedQuestionItem, PretestSettings } from '@/api';
import { getPretestContent, listCourseAssessments, type CourseAssessmentConfig } from '@/lib/api-client';
import { readApiErrorStatus } from '@/lib/api-error';
import { CONTEXT_LABELS, formatName } from '@/lib/assessment-labels';

interface ReviewModuleTestsProps {
  courseId: number;
  moduleId: number;
}

function ClosedQuestionReview({ index, question }: { index: number; question: ClosedQuestionItem }) {
  return (
    <div className="pb-5 border-b border-border last:border-b-0">
      <p className="font-semibold text-foreground text-sm mb-3">
        <span className="text-gradient-r mr-1">{index}.</span>
        {question.question}
      </p>
      <div className="space-y-2 ml-4">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-2.5 rounded-lg border ${isCorrect ? 'border-success/30 bg-success/10' : 'border-border bg-card'}`}
            >
              <div className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isCorrect ? 'border-success/30 bg-primary' : 'border-border'}`}>
                {isCorrect && <Check size={10} className="text-primary-foreground" />}
              </div>
              <span className={`text-sm ${isCorrect ? 'text-success font-medium' : 'text-foreground'}`}>{option}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Testy modulu pro kontrolu garantem — pretest se správnými odpověďmi a
 * připojené formáty. Číst je backend zatím dovoluje jen vlastníkovi kurzu a
 * superadminovi; garant dostane 403 a uvidí vysvětlení.
 */
export function ReviewModuleTests({ courseId, moduleId }: ReviewModuleTestsProps) {
  const [configs, setConfigs] = useState<CourseAssessmentConfig[] | null>(null);
  const [pretest, setPretest] = useState<PretestSettings | null>(null);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setConfigs(null);
    setPretest(null);
    setDenied(false);
    setFailed(false);
    (async () => {
      try {
        const list = (await listCourseAssessments(courseId)).filter((c) => c.moduleId === moduleId);
        const pretestConfig = list.find((c) => c.assessmentTypeCode === 'pretest');
        // Pretest bez otázek (422) se ukáže jako nevyplněný
        const content = pretestConfig ? await getPretestContent(pretestConfig.courseAssessmentId).catch(() => null) : null;
        if (cancelled) return;
        setConfigs(list);
        setPretest(content);
      } catch (err) {
        if (cancelled) return;
        if (readApiErrorStatus(err) === 403) setDenied(true);
        else setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId, moduleId]);

  if (denied) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dumbbell size={40} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Testy modulu zatím nejde zobrazit</p>
        <p className="text-sm mt-1">Obsah testů může zatím číst jen autor kurzu a superadmin.</p>
      </div>
    );
  }
  if (failed) return <p role="alert" className="text-sm text-destructive">Testy modulu se nepodařilo načíst.</p>;
  if (!configs) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formats = configs.filter((c) => c.assessmentTypeCode !== 'pretest');

  if (!pretest && formats.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dumbbell size={40} className="mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Modul nemá žádné testy</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pretest && (
        <section className="space-y-5">
          <h3 className="font-semibold text-foreground">Pretest</h3>
          {pretest.closed.map((q, i) => <ClosedQuestionReview key={i} index={i + 1} question={q} />)}
          <div>
            <p className="font-semibold text-foreground text-sm mb-3">
              <span className="text-gradient-r mr-1">{pretest.closed.length + 1}.</span>
              {pretest.open.question}
            </p>
            <div className="ml-4 space-y-2">
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-xs text-success font-medium mb-1">Vzorová odpověď:</p>
                <p className="text-sm text-success">{pretest.open.exampleAnswer}</p>
              </div>
              {pretest.open.keywords.length > 0 && (
                <div className="p-3 bg-tip/10 border border-tip/30 rounded-lg">
                  <p className="text-xs text-tip font-medium mb-1">Klíčové body:</p>
                  <div className="flex flex-wrap gap-1">
                    {pretest.open.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 bg-tip/20 text-tip rounded text-xs">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {formats.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-semibold text-foreground">Procvičování a test modulu</h3>
          {formats.map((config) => (
            <div key={config.courseAssessmentId} className="rounded-lg border border-border p-4 space-y-4">
              <p className="text-sm">
                <span className="font-semibold text-foreground">{formatName(config.assessmentTypeCode)}</span>
                <span className="text-muted-foreground">
                  {' · '}{CONTEXT_LABELS[config.context]}
                  {config.isRequired ? ' · povinné' : ' · nepovinné'}
                  {!config.isEnabled && ' · vypnuté'}
                </span>
              </p>
              {(config.settings?.questions ?? []).map((q, i) => (
                <ClosedQuestionReview key={i} index={i + 1} question={q} />
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
