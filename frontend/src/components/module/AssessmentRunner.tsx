'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { SessionStartResponse } from '@/api';
import {
  getCurrentAssessmentSession,
  startAssessmentSession,
  submitAssessmentAnswer,
  type AssessmentTarget,
} from '@/lib/api-client';
import { readApiErrorDetail, readApiErrorStatus } from '@/lib/api-error';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { TypedAnswerTextarea } from './TypedAnswerTextarea';

export interface SessionResult {
  /** 0–100 */
  score: number | null;
  isPassed: boolean;
}

interface AnsweredQuestion {
  question: string;
  answer: string;
  isCorrect: boolean;
  feedback: string | null;
}

interface AssessmentRunnerProps {
  target: AssessmentTarget & { assessmentTypeCode: string };
  /** Založit session hned po otevření (pretest — bez AI generování); jinak tlačítko. */
  autoStart?: boolean;
  startLabel?: string;
  onFinished: (result: SessionResult) => void;
}

type Phase = 'loading' | 'idle' | 'running' | 'finished';

const targetKey = (t: AssessmentTarget) =>
  `${t.courseId}:${t.context}:${t.moduleId ?? ''}:${t.assessmentTypeCode ?? ''}`;

// AI formáty generují otázky i desítky sekund. Když student mezitím odejde
// na jinou záložku a vrátí se, komponenta se namontuje znovu — navážeme na
// rozběhnutý požadavek, místo abychom založili druhou session.
const pendingStarts = new Map<string, Promise<SessionStartResponse>>();

function startSession(target: AssessmentTarget): Promise<SessionStartResponse> {
  const key = targetKey(target);
  let pending = pendingStarts.get(key);
  if (!pending) {
    pending = startAssessmentSession(target).finally(() => pendingStarts.delete(key));
    pendingStarts.set(key, pending);
  }
  return pending;
}

/** Průchod jedné session testu: otázky chodí po jedné a hodnotí je server. */
export function AssessmentRunner({ target, autoStart = false, startLabel = 'Spustit', onFinished }: AssessmentRunnerProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [current, setCurrent] = useState<SessionStartResponse | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState('');
  // Odpovědi odeslané v tomhle zobrazení — u dialogu drží souvislost rozhovoru
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  // Špatná odpověď a zbývá pokus — server vrátí stejnou otázku znovu
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showQuestion = (session: SessionStartResponse) => {
    setCurrent(session);
    setSelected(null);
    setAnswer('');
    setLastSubmittedAnswer('');
    setRetrying(false);
    setPhase('running');
  };

  const handleStart = useCallback(async () => {
    setStarting(true);
    setErrorMsg(null);
    setAnswered([]);
    setResult(null);
    try {
      showQuestion(await startSession(target));
    } catch (err) {
      // 403 = nesplněné povinné testy nižší úrovně nebo vypnutý test
      setErrorMsg((await readApiErrorDetail(err)) ?? 'Test se nepodařilo spustit. Zkuste to znovu.');
      setPhase('idle');
    } finally {
      setStarting(false);
    }
    // targetKey stačí — objekt target se mění s každým renderem rodiče
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey(target)]);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setErrorMsg(null);
    setAnswered([]);
    setResult(null);
    getCurrentAssessmentSession(target)
      .then((session) => {
        if (cancelled) return;
        if (session) showQuestion(session);
        else if (autoStart) handleStart();
        else setPhase('idle');
      })
      .catch(async (err) => {
        if (cancelled) return;
        setErrorMsg((await readApiErrorDetail(err)) ?? 'Test se nepodařilo načíst. Zkuste to znovu.');
        setPhase('idle');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey(target)]);

  const isClosed = !!current?.options?.length;
  const canSubmit = isClosed
    ? selected !== null
    : !!answer.trim() && answer.trim() !== lastSubmittedAnswer;

  const handleSubmit = async () => {
    if (!current || !canSubmit || submitting) return;
    const options = current.options ?? [];
    const answerText = isClosed ? options[selected!] : answer.trim();
    // Uzavřená otázka pretestu = index možnosti, ostatní formáty porovnávají text
    const payload = isClosed
      ? (target.assessmentTypeCode === 'pretest' ? String(selected) : options[selected!])
      : answer;

    setSubmitting(true);
    setErrorMsg(null);
    setLastSubmittedAnswer(answerText);
    try {
      const resp = await submitAssessmentAnswer(current.sessionId, payload);
      setAnswered((prev) => [...prev, {
        question: current.question,
        answer: answerText,
        isCorrect: resp.isCorrect,
        feedback: resp.feedback ?? null,
      }]);

      if (resp.finished) {
        const finished = { score: resp.score ?? null, isPassed: !!resp.isPassed };
        setResult(finished);
        setPhase('finished');
        onFinished(finished);
        return;
      }

      const next: SessionStartResponse = {
        sessionId: resp.sessionId,
        question: resp.question ?? '',
        options: resp.options ?? null,
      };
      const sameQuestion = !resp.isCorrect && next.question === current.question;
      if (sameQuestion) {
        // Psanou odpověď student při dalším pokusu jen upravuje (kontrola rychlosti psaní na serveru)
        setCurrent(next);
        setSelected(null);
        setRetrying(true);
      } else {
        showQuestion(next);
      }
    } catch (err) {
      // Pokus se nezapočítal — stejnou odpověď jde odeslat znovu
      setLastSubmittedAnswer('');
      const status = readApiErrorStatus(err);
      setErrorMsg((await readApiErrorDetail(err)) ?? 'Nepodařilo se vyhodnotit odpověď. Zkuste to znovu.');
      // 409 = session mezitím skončila (jiná záložka) — načteme aktuální stav
      if (status === 409) {
        const session = await getCurrentAssessmentSession(target).catch(() => null);
        if (session) showQuestion(session);
        else setPhase('idle');
      }
    } finally {
      setSubmitting(false);
    }
  };

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
