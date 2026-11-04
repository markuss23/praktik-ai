'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { listPracticeQuestions } from '@/lib/api-client';
import type { PracticeQuestion, PracticeQuestionWithAttempts } from '@/api';
import { Button } from '@/components/ui';
import { cn, czechPlural } from '@/lib/utils';

interface PracticeReviewProps {
  moduleId: number;
  practiceQuestions: PracticeQuestion[];
  onContinue: () => void;
}


export default function PracticeReview({ moduleId, practiceQuestions, onContinue }: PracticeReviewProps) {
  const [aiQuestions, setAiQuestions] = useState<PracticeQuestionWithAttempts[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    setAiError(false);
    listPracticeQuestions(moduleId)
      .then((data) => { if (!cancelled) setAiQuestions(data); })
      .catch((err) => {
        console.error('Failed to load AI practice questions:', err);
        if (!cancelled) setAiError(true);
      })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [moduleId]);

  const isEmpty = practiceQuestions.length === 0 && !aiLoading && !aiError && aiQuestions.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground">Procvičování</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Přehled otázek se správnými odpověďmi. Kurz je dokončený, odpovídat už nelze.
        </p>
      </div>

      {practiceQuestions.length > 0 && (
        <div className="flex flex-col gap-6">
          {practiceQuestions.map((q, idx) => (
            <div key={q.questionId} className="pb-6 border-b border-border last:border-b-0">
              <p className="font-semibold text-foreground mb-3">
                <span className="text-gradient-r mr-2">{idx + 1}.</span>
                {q.question}
              </p>

              {q.questionType === 'closed' ? (
                <ul className="flex flex-col gap-2 ml-6">
                  {(q.closedOptions ?? []).map((opt) => {
                    const isCorrect = !!q.correctAnswer && opt.text === q.correctAnswer;
                    return (
                      <li
                        key={opt.optionId}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border text-sm',
                          isCorrect ? 'border-success/30 bg-success/10 text-foreground' : 'border-border text-muted-foreground',
                        )}
                      >
                        {isCorrect ? <CheckCircle className="size-4 text-success shrink-0" /> : <span className="size-4 shrink-0" />}
                        <span className="min-w-0 break-words">{opt.text}</span>
                        {isCorrect && <span className="ml-auto shrink-0 text-xs font-medium text-success">Správná odpověď</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : q.exampleAnswer ? (
                <div className="ml-6 p-4 rounded-lg border border-success/30 bg-success/10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-success mb-1">Vzorová odpověď</p>
                  <p className="text-sm text-foreground whitespace-pre-line break-words">{q.exampleAnswer}</p>
                </div>
              ) : (
                <p className="ml-6 text-sm text-muted-foreground">Otevřená otázka — vzorová odpověď k ní není uložená.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {aiLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-gradient-r" />
        </div>
      ) : aiError ? (
        <p role="alert" className="mt-8 text-sm text-destructive">Vaše další otázky od AI se nepodařilo načíst.</p>
      ) : aiQuestions.length > 0 && (
        <section className={cn(practiceQuestions.length > 0 && 'mt-10 pt-8 border-t border-border')}>
          <h4 className="text-base font-semibold text-foreground">Vaše další otázky od AI</h4>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Otázky, které jste si během kurzu nechali vygenerovat, i s vaší poslední odpovědí.
          </p>
          <div className="flex flex-col gap-6">
            {aiQuestions.map((q, idx) => (
              <AiQuestionReview key={q.userQuestionId} question={q} index={idx} />
            ))}
          </div>
        </section>
      )}

      {isEmpty && (
        <p className="text-sm text-muted-foreground">K tomuto modulu nejsou žádné otázky k procvičování.</p>
      )}

      <div className="flex justify-end mt-8 pt-6 border-t border-border">
        <Button size="lg" onClick={onContinue}>
          Pokračovat na test
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function AiQuestionReview({ question: q, index }: { question: PracticeQuestionWithAttempts; index: number }) {
  const last = q.attempts.length > 0 ? q.attempts[q.attempts.length - 1] : null;
  const isCorrect = last?.isCorrect === true;

  return (
    <div className="pb-6 border-b border-border last:border-b-0">
      <p className="font-semibold text-foreground mb-3">
        <span className="text-gradient-r mr-2">{index + 1}.</span>
        {q.generatedQuestion}
      </p>

      {q.questionType === 'closed' && q.options && (
        <ul className="flex flex-col gap-2 ml-6">
          {q.options.map((opt, optIdx) => {
            const selected = last?.userInput === opt.text;
            return (
              <li
                key={optIdx}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border text-sm',
                  !selected && 'border-border text-muted-foreground',
                  selected && isCorrect && 'border-success/30 bg-success/10 text-foreground',
                  selected && !isCorrect && 'border-destructive/30 bg-destructive/10 text-foreground',
                )}
              >
                {selected
                  ? isCorrect
                    ? <CheckCircle className="size-4 text-success shrink-0" />
                    : <XCircle className="size-4 text-destructive shrink-0" />
                  : <span className="size-4 shrink-0" />}
                <span className="min-w-0 break-words">{opt.text}</span>
                {selected && <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground">Vaše odpověď</span>}
              </li>
            );
          })}
        </ul>
      )}

      {!last ? (
        <p className="ml-6 mt-3 text-sm text-muted-foreground">Na tuto otázku jste neodpověděli.</p>
      ) : (
        <div
          className={cn(
            'ml-6 mt-3 p-4 rounded-lg border',
            isCorrect ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30',
          )}
        >
          <div className="flex items-start gap-2">
            {isCorrect
              ? <CheckCircle className="size-5 text-success shrink-0 mt-0.5" />
              : <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', isCorrect ? 'text-success' : 'text-destructive')}>
                {isCorrect ? 'Správně' : 'Nesprávně'}
                {q.attempts.length > 1 && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({q.attempts.length} {czechPlural(q.attempts.length, 'pokus', 'pokusy', 'pokusů')})
                  </span>
                )}
              </p>
              {q.questionType === 'open' && (
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  Vaše odpověď: <span className="font-medium text-foreground">{last.userInput}</span>
                </p>
              )}
              {last.aiResponse && (
                <p className="text-sm text-muted-foreground mt-1 break-words">{last.aiResponse}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
