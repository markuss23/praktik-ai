'use client';

import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAssessmentSession, type SessionResult, type SessionTarget } from '@/hooks/useAssessmentSession';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { SocraticDialog } from './SocraticDialog';
import { TypedAnswerTextarea } from './TypedAnswerTextarea';

export type { SessionResult };

interface AssessmentRunnerProps {
  target: SessionTarget;
  /** Založit session hned po otevření (pretest — bez AI generování); jinak tlačítko. */
  autoStart?: boolean;
  startLabel?: string;
  onFinished: (result: SessionResult | null) => void;
}

/** Průchod jedné session testu: otázky chodí po jedné a hodnotí je server. */
export function AssessmentRunner({ target, autoStart = false, startLabel = 'Spustit', onFinished }: AssessmentRunnerProps) {
  // Sokratovský dialog je rozhovor, ne série otázek: vlastní chat UI
  const isDialog = target.assessmentTypeCode === 'socratic_dialog_ai';
  const session = useAssessmentSession(target, { autoStart, rememberAnswers: isDialog, onFinished });
  const {
    isPretest, phase, current, selected, setSelected, answer, setAnswer, answered,
    retrying, attemptsRanOut, result, starting, submitting, errorMsg, isClosed, canSubmit,
  } = session;
  const handleStart = session.start;
  const handleSubmit = session.submit;

  if (isDialog) {
    return (
      <SocraticDialog
        session={session}
        startLabel={startLabel}
        courseLevel={target.context === 'course_final'}
      />
    );
  }

  if (phase === 'loading' || (starting && phase !== 'running')) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-gradient-r" />
          <p className="text-sm text-muted-foreground">
            {starting ? 'Připravuji otázky… u AI formátů to může chvíli trvat.' : 'Načítám test…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Odpovědi z tohoto průchodu */}
      {answered.length > 0 && (
        <div className="space-y-3 mb-6">
          {answered.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${item.isCorrect ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}
            >
              <div className="flex items-start gap-2">
                {item.isCorrect
                  ? <CheckCircle className="size-5 text-success shrink-0 mt-0.5" />
                  : <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    Vaše odpověď: <span className="font-medium">{item.answer}</span>
                  </p>
                  {item.feedback && <p className="text-sm text-muted-foreground mt-1">{item.feedback}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex justify-end"
          >
            <Button
              variant="plain"
              onClick={handleStart}
              disabled={starting}
              className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 disabled:opacity-50")}
              style={{ backgroundColor: 'var(--gradient-r)' }}
            >
              {startLabel}
            </Button>
          </motion.div>
        )}

        {phase === 'running' && current && (
          <motion.div
            key={`question-${current.question}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {attemptsRanOut && (
              <p role="status" className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {isPretest
                  ? 'Na jednu z otázek vám došly pokusy, takže tento pretest už nesplníte. Dokončete ho a pak to zkuste znovu.'
                  : 'Na předchozí otázku vám došly pokusy — počítá se jako nesprávná.'}
              </p>
            )}
            {retrying && (
              <p role="status" className="mb-3 text-sm font-medium text-destructive">
                Nesprávně — zkuste to znovu.
              </p>
            )}
            <p className="font-semibold text-foreground mb-4 leading-relaxed">{current.question}</p>

            {isClosed ? (
              <div className="space-y-2">
                {(current.options ?? []).map((option, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selected === idx
                        ? 'border-gradient-r/30 bg-gradient-r/10'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`session-${current.sessionId}`}
                      checked={selected === idx}
                      onChange={() => setSelected(idx)}
                      disabled={submitting}
                      className="size-4 text-gradient-r focus:ring-gradient-r/30"
                    />
                    <span className="text-sm text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <TypedAnswerTextarea value={answer} onChange={setAnswer} disabled={submitting} />
            )}

            <div className="flex items-center justify-end mt-4">
              <Button
                variant="plain"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed")}
                style={{ backgroundColor: 'var(--gradient-r)' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Vyhodnocuji...
                  </>
                ) : (
                  'Odevzdat'
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === 'finished' && result && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-lg border ${result.isPassed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {result.isPassed
                ? <CheckCircle className="size-6 text-success shrink-0" />
                : <XCircle className="size-6 text-destructive shrink-0" />}
              <div className="grow">
                <p className={`font-semibold ${result.isPassed ? 'text-success' : 'text-destructive'}`}>
                  {result.isPassed ? 'Splněno' : 'Nesplněno'}
                  {result.score !== null && ` — ${Math.round(result.score)} %`}
                </p>
                {!result.isPassed && (
                  <p className="text-sm text-muted-foreground mt-0.5">Projděte si látku a zkuste to znovu.</p>
                )}
              </div>
              {!result.isPassed && (
                <Button
                  variant="plain"
                  onClick={handleStart}
                  disabled={starting}
                  className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 text-primary-foreground font-semibold py-2 px-5 rounded-md text-sm transition-all hover:opacity-90 disabled:opacity-50")}
                  style={{ backgroundColor: 'var(--gradient-r)' }}
                >
                  Zkusit znovu
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
