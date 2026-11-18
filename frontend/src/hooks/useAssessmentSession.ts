'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SessionStartResponse } from '@/api';
import {
  getCurrentAssessmentSession,
  startAssessmentSession,
  submitAssessmentAnswer,
  type AssessmentTarget,
} from '@/lib/api-client';
import { readApiErrorDetail, readApiErrorStatus } from '@/lib/api-error';

export interface SessionResult {
  // 0-100
  score: number | null;
  isPassed: boolean;
}

export interface AnsweredQuestion {
  question: string;
  answer: string;
  isCorrect: boolean;
  feedback: string | null;
}

export type SessionPhase = 'loading' | 'idle' | 'running' | 'finished';

export type SessionTarget = AssessmentTarget & { assessmentTypeCode: string };

interface UseAssessmentSessionOptions {
  // Založit session hned po otevření (pretest, bez AI generování); jinak až start()
  autoStart?: boolean;
  // Odeslané odpovědi drží sessionStorage podle sessionId; server vrací jen aktuální otázku
  rememberAnswers?: boolean;
  onFinished: (result: SessionResult | null) => void;
}

const targetKey = (t: AssessmentTarget) =>
  `${t.courseId}:${t.context}:${t.moduleId ?? ''}:${t.assessmentTypeCode ?? ''}`;

// AI formáty generují otázky i desítky sekund. Když student mezitím odejde
// na jinou záložku a vrátí se, komponenta se namontuje znovu: navážeme na
// rozběhnutý request, místo abychom založili druhou session.
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

const answersKey = (sessionId: number) => `assessment-answers:${sessionId}`;

function readAnswers(sessionId: number): AnsweredQuestion[] | null {
  try {
    const raw = sessionStorage.getItem(answersKey(sessionId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as AnsweredQuestion[]) : null;
  } catch {
    return null;
  }
}

function writeAnswers(sessionId: number, answers: AnsweredQuestion[]) {
  try {
    sessionStorage.setItem(answersKey(sessionId), JSON.stringify(answers));
  } catch {
    // sessionStorage nedostupný (privátní režim apod.), rozhovor jen nepřežije reload
  }
}

function forgetAnswers(sessionId: number) {
  try {
    sessionStorage.removeItem(answersKey(sessionId));
  } catch {
    // viz writeAnswers
  }
}

// Průchod jedné session testu: otázky chodí po jedné a hodnotí je server.
export function useAssessmentSession(
  target: SessionTarget,
  { autoStart = false, rememberAnswers = false, onFinished }: UseAssessmentSessionOptions,
) {
  const isPretest = target.assessmentTypeCode === 'pretest';
  const [phase, setPhase] = useState<SessionPhase>('loading');
  const [current, setCurrent] = useState<SessionStartResponse | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState('');
  // Odpovědi odeslané v tomhle zobrazení, u dialogu drží souvislost rozhovoru
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  // Rozběhnutá session bez uložených odpovědí (jiné okno, jiné zařízení)
  const [missingHistory, setMissingHistory] = useState(false);
  // Špatná odpověď a zbývá pokus: server vrátí stejnou otázku znovu
  const [retrying, setRetrying] = useState(false);
  const [attemptsRanOut, setAttemptsRanOut] = useState(false);
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
    if (!isPretest) setAttemptsRanOut(false);
    setPhase('running');
  };

  const restoreAnswers = (sessionId: number, resumed: boolean) => {
    if (!rememberAnswers) return;
    const saved = readAnswers(sessionId);
    setAnswered(saved ?? []);
    setMissingHistory(resumed && !saved);
    if (!saved) writeAnswers(sessionId, []);
  };

  const handleStart = useCallback(async () => {
    setStarting(true);
    setErrorMsg(null);
    setAnswered([]);
    setMissingHistory(false);
    setAttemptsRanOut(false);
    setResult(null);
    try {
      const session = await startSession(target);
      restoreAnswers(session.sessionId, false);
      showQuestion(session);
    } catch (err) {
      // 403 = nesplněné povinné testy nižší úrovně nebo vypnutý test
      setErrorMsg((await readApiErrorDetail(err)) ?? 'Test se nepodařilo spustit. Zkuste to znovu.');
      setPhase('idle');
    } finally {
      setStarting(false);
    }
    // targetKey stačí, objekt target se mění s každým renderem rodiče
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey(target)]);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setErrorMsg(null);
    setAnswered([]);
    setMissingHistory(false);
    setAttemptsRanOut(false);
    setResult(null);
    getCurrentAssessmentSession(target)
      .then((session) => {
        if (cancelled) return;
        if (session) {
          restoreAnswers(session.sessionId, true);
          showQuestion(session);
        } else if (autoStart) handleStart();
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
      ? (isPretest ? String(selected) : options[selected!])
      : answer;

    setSubmitting(true);
    setErrorMsg(null);
    setLastSubmittedAnswer(answerText);
    try {
      const resp = await submitAssessmentAnswer(current.sessionId, payload);
      const nextAnswered = [...answered, {
        question: current.question,
        answer: answerText,
        isCorrect: resp.isCorrect,
        feedback: resp.feedback ?? null,
      }];
      setAnswered(nextAnswered);

      if (resp.finished) {
        if (rememberAnswers) forgetAnswers(current.sessionId);
        const finished = { score: resp.score ?? null, isPassed: !!resp.isPassed };
        setResult(finished);
        setPhase('finished');
        onFinished(finished);
        return;
      }
      if (rememberAnswers) writeAnswers(current.sessionId, nextAnswered);

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
        if (!isPretest) setAttemptsRanOut(false);
      } else {
        showQuestion(next);
        if (!resp.isCorrect) setAttemptsRanOut(true);
      }
    } catch (err) {
      // Pokus se nezapočítal, stejnou odpověď jde odeslat znovu
      setLastSubmittedAnswer('');
      // 409 = session mezitím skončila (jiná záložka). Hláška serveru je technická
      // a k nové session nepatří: načteme aktuální stav a průběh obnoví rodič.
      if (readApiErrorStatus(err) === 409) {
        if (rememberAnswers) forgetAnswers(current.sessionId);
        setAnswered([]);
        setAttemptsRanOut(false);
        onFinished(null);
        const session = await getCurrentAssessmentSession(target).catch(() => null);
        if (session) {
          restoreAnswers(session.sessionId, true);
          showQuestion(session);
        } else {
          setErrorMsg('Tento pokus mezitím skončil v jiném okně.');
          setPhase('idle');
        }
        return;
      }
      setErrorMsg((await readApiErrorDetail(err)) ?? 'Nepodařilo se vyhodnotit odpověď. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    isPretest,
    phase,
    current,
    selected,
    setSelected,
    answer,
    setAnswer,
    // Odpověď, kterou právě vyhodnocuje server (dialog ji ukáže hned jako zprávu)
    pendingAnswer: submitting ? lastSubmittedAnswer : null,
    answered,
    missingHistory,
    retrying,
    attemptsRanOut,
    result,
    starting,
    submitting,
    errorMsg,
    isClosed,
    canSubmit,
    start: handleStart,
    submit: handleSubmit,
  };
}

export type AssessmentSession = ReturnType<typeof useAssessmentSession>;
