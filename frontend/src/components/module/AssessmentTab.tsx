'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {
  generateAssessment,
  evaluateAssessment,
  getModuleAssessment,
  completeModule,
  getCourseProgress,
} from '@/lib/api-client';
import type { ModuleAssessmentQuestion } from '@/api';
import { ModuleCompletedCard } from './ModuleCompletedCard';
import { Button, Textarea } from '@/components/ui';
import { readApiErrorDetail, readApiErrorStatus } from '@/lib/api-error';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

const PASSING_SCORE = 75;

interface LoadedAssessment {
  sessionId: number;
  question: string;
  status: string;
  attempts: AttemptResult[];
  attemptsUsed: number;
  maxAttempts: number | null; 
}

const fromExisting = (existing: ModuleAssessmentQuestion): LoadedAssessment => ({
  sessionId: existing.sessionId,
  question: existing.generatedTask,
  status: existing.status,
  attempts: (existing.attempts ?? []).map((a) => ({
    attemptId: a.attemptId,
    aiScore: a.aiScore,
    isPassed: a.isPassed,
    aiFeedback: a.aiFeedback ?? '',
  })),
  attemptsUsed: existing.attemptsUsed ?? 0,
  maxAttempts: existing.maxAttempts ?? null,
});

// Jen 404 znamená „test ještě nemá“. Síťová chyba nebo 5xx se nesmí brát jako
// chybějící test — generování by pak skončilo na 409 (aktivní test existuje).
async function fetchExistingAssessment(moduleId: number): Promise<ModuleAssessmentQuestion | null> {
  try {
    return await getModuleAssessment(moduleId);
  } catch (err) {
    if (readApiErrorStatus(err) === 404) return null;
    throw err;
  }
}

async function fetchOrGenerateAssessment(moduleId: number): Promise<LoadedAssessment> {
  const existing = await fetchExistingAssessment(moduleId);
  // Neúspěšný (failed) test se nahrazuje novým.
  if (existing && existing.status !== 'failed') return fromExisting(existing);

  try {
    const resp = await generateAssessment(moduleId);
    return {
      sessionId: resp.sessionId,
      question: resp.generatedQuestion,
      status: 'in_progress',
      attempts: [],
      attemptsUsed: 0,
      maxAttempts: null,
    };
  } catch (err) {
    // 409 = aktivní nebo splněný test mezitím vznikl jinde (jiná záložka prohlížeče).
    if (readApiErrorStatus(err) === 409) {
      const created = await fetchExistingAssessment(moduleId);
      if (created && created.status !== 'failed') return fromExisting(created);
    }
    throw err;
  }
}

// Generování otázky trvá i desítky sekund a backend session uloží až s hotovou
// otázkou. Když student mezitím odejde na jinou záložku modulu a vrátí se,
// komponenta se namontuje znovu — navážeme na rozběhnutý požadavek, místo
// abychom spustili druhé generování.
const pendingAssessments = new Map<number, Promise<LoadedAssessment>>();

function loadAssessment(moduleId: number): Promise<LoadedAssessment> {
  let pending = pendingAssessments.get(moduleId);
  if (!pending) {
    pending = fetchOrGenerateAssessment(moduleId).finally(() => pendingAssessments.delete(moduleId));
    pendingAssessments.set(moduleId, pending);
  }
  return pending;
}

// Odpověď v testu se jen píše. Víc znaků najednou než slovo z našeptávače
// nebo opravy překlepu = vložený text (schránka mobilní klávesnice,
// rozšíření prohlížeče, automatické vyplnění). Serverová kontrola rychlosti
// psaní (typing_guard.py) je pojistka pro obejití v prohlížeči.
const MAX_INSERT_CHARS = 30;
const BLOCKED_INPUT_TYPES = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
]);

interface AssessmentTabProps {
  moduleId: number;
  courseId: number;
  maxAttempts: number;
  /** 1-based pořadí modulu v kurzu — pro nadpis „Modul N dokončen!". */
  moduleNumber: number;
  /** Název aktuálního modulu — zobrazuje se v textu o dokončení. */
  moduleTitle: string;
  nextModule: { moduleId: number; title: string } | null;
  onModuleComplete: () => void;
  onRestartModule: () => void;
}

interface AttemptResult {
  attemptId: number;
  aiScore: number;
  isPassed: boolean;
  aiFeedback: string;
}

export default function AssessmentTab({
  moduleId,
  courseId,
  maxAttempts,
  moduleNumber,
  moduleTitle,
  nextModule,
  onModuleComplete,
  onRestartModule,
}: AssessmentTabProps) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState('');
  // Pokus o kopírování/vložení — ukáže se vysvětlení, proč se nic nestalo.
  const [clipboardBlocked, setClipboardBlocked] = useState(false);
  const blockClipboard = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setClipboardBlocked(true);
  };
  // Undo/redo smí vrátit i delší, dřív napsaný úsek — onChange ho pak nebere jako vložení.
  const allowLongChangeRef = useRef(false);
  // Nativní `beforeinput` zná typ vstupu (vložení, přetažení…) a dá se zrušit
  // dřív, než se text vůbec objeví. Callback ref vrací úklid (React 19), pole
  // se totiž montuje až po načtení otázky.
  const guardAnswerInput = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType.startsWith('history')) {
        allowLongChangeRef.current = true;
        return;
      }
      const inserted = e.data ?? e.dataTransfer?.getData('text/plain') ?? '';
      if (BLOCKED_INPUT_TYPES.has(e.inputType) || inserted.length > MAX_INSERT_CHARS) {
        e.preventDefault();
        setClipboardBlocked(true);
      }
    };
    el.addEventListener('beforeinput', onBeforeInput);
    return () => el.removeEventListener('beforeinput', onBeforeInput);
  }, []);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [passed, setPassed] = useState(false);
  const [failed, setFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState('');

  const [moduleCompleted, setModuleCompleted] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const attemptsUsed = attempts.length;
  const attemptsRemaining = maxAttempts - attemptsUsed;

  // Load existing session or generate a new one
  const initAssessment = useCallback(async (isCancelled: () => boolean = () => false) => {
    setLoading(true);
    setErrorMsg(null);
    setSessionId(null);
    setQuestion('');
    setUserAnswer('');
    setLastSubmittedAnswer('');
    setAttempts([]);
    setPassed(false);
    setFailed(false);

    try {
      const loaded = await loadAssessment(moduleId);
      if (isCancelled()) return;

      setSessionId(loaded.sessionId);
      setQuestion(loaded.question);
      setAttempts(loaded.attempts);

      if (loaded.status === 'passed') {
        // Module already passed — go straight to completion
        setPassed(true);
        setModuleCompleted(true);
      } else if (loaded.attemptsUsed >= (loaded.maxAttempts ?? maxAttempts)) {
        setFailed(true);
      }
    } catch (err) {
      if (isCancelled()) return;
      console.error('Failed to init assessment:', err);
      setErrorMsg((await readApiErrorDetail(err)) ?? 'Nepodařilo se načíst test. Zkuste to znovu.');
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, [moduleId, maxAttempts]);

  useEffect(() => {
    let cancelled = false;
    initAssessment(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [initAssessment]);

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!sessionId || !userAnswer.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    setLastSubmittedAnswer(userAnswer.trim());
    try {
      const resp = await evaluateAssessment(sessionId, userAnswer);
      const attempt: AttemptResult = {
        attemptId: resp.attemptId,
        aiScore: resp.aiScore,
        isPassed: resp.isPassed,
        aiFeedback: resp.aiFeedback,
      };
      const newAttempts = [...attempts, attempt];
      setAttempts(newAttempts);

      if (resp.isPassed || resp.aiScore >= PASSING_SCORE) {
        setPassed(true);
        // Auto-complete the module immediately
        try {
          const bestScore = Math.max(...newAttempts.map((a) => a.aiScore));
          const completionResult = await completeModule(moduleId, bestScore);
          setModuleCompleted(true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('praktik:enrollments-changed'));
          }
          if (completionResult.courseCompleted) {
            setCourseCompleted(true);
          } else {
            try {
              const progress = await getCourseProgress(courseId);
              setCourseCompleted(progress.every((p) => p.passed));
            } catch {
              // Ignore progress check error
            }
          }
        } catch (err) {
          console.error('Failed to complete module:', err);
          setModuleCompleted(true);
        }
      } else if (newAttempts.length >= maxAttempts) {
        setFailed(true);
      }
    } catch (err) {
      console.error('Failed to evaluate assessment:', err);
      // Pokus se nezapočítal — stejnou odpověď jde odeslat znovu. Hláška ze
      // serveru (např. kontrola rychlosti psaní) má přednost před obecnou.
      setLastSubmittedAnswer('');
      setErrorMsg((await readApiErrorDetail(err)) ?? 'Nepodařilo se vyhodnotit odpověď. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Last attempt feedback
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-gradient-r" />
          <p className="text-sm text-muted-foreground">Připravuji test...</p>
        </div>
      </div>
    );
  }

  // Test se nepodařilo načíst ani vygenerovat — bez otázky nemá smysl ukazovat pole pro odpověď.
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <XCircle className="size-8 text-destructive" />
          <p role="alert" className="text-sm text-muted-foreground">
            {errorMsg ?? 'Nepodařilo se načíst test. Zkuste to znovu.'}
          </p>
          <Button
            variant="plain"
            onClick={() => initAssessment()}
            className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90")}
            style={{ backgroundColor: 'var(--gradient-r)' }}
          >
            Zkusit znovu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-foreground">Test</h3>
          {!moduleCompleted && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{
              backgroundColor: attemptsRemaining <= 1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 91, 168, 0.1)',
              color: attemptsRemaining <= 1 ? 'var(--destructive)' : 'var(--gradient-r)',
            }}>
              Zbývá pokusů: {attemptsRemaining} z {maxAttempts}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: moduleCompleted ? '100%' : `${(attemptsUsed / maxAttempts) * 100}%`,
              backgroundColor: passed ? 'var(--primary)' : 'var(--gradient-r)',
            }}
          />
        </div>
      </div>

      {/* Question text — always visible */}
      <div className="mb-6">
        <p className="text-foreground font-medium leading-relaxed">{question}</p>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Module completed inline ── */}
        {moduleCompleted && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Drobné skóre feedback nad celebration kartou */}
            {lastAttempt && (
              <div className="p-4 rounded-lg border bg-success/10 border-success/30 mb-6">
                <div className="flex items-start gap-2">
                  <CheckCircle className="size-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-success">
                        Skóre: {lastAttempt.aiScore}/100
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                        Splněno
                      </span>
                    </div>
                    {lastAttempt.aiFeedback && (
                      <p className="text-sm text-muted-foreground">{lastAttempt.aiFeedback}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <ModuleCompletedCard
              moduleNumber={moduleNumber}
              moduleTitle={moduleTitle}
              ctaLabel={
                courseCompleted
                  ? 'Zpět na kurz'
                  : nextModule
                    ? 'Pokračovat na další modul'
                    : 'Dokončit kurz'
              }
              onContinue={onModuleComplete}
            />
          </motion.div>
        )}

        {/* ── Question view (not passed, not failed) ── */}
        {!passed && !failed && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* Answer textarea — větší výchozí velikost; uživatel si může
                ručně rozšířit (vertikálně) přes resize handle v rohu. */}
            {/* Odpověď se v testu jen píše — vkládání (klávesnice, kontextové
                menu i mobil spouští `paste`), kopírování, vyjmutí a přetažení
                textu dovnitř i ven jsou zablokované. */}
            <Textarea
              ref={guardAnswerInput}
              value={userAnswer}
              onChange={(e) => {
                const next = e.target.value;
                const allowLong = allowLongChangeRef.current;
                allowLongChangeRef.current = false;
                // Poslední pojistka: změna, kterou nevyvolal uživatel (skript,
                // rozšíření), nebo skok o víc znaků, než se dá napsat jedním
                // úhozem (vložení, které beforeinput zrušit nejde — IME,
                // mobilní klávesnice). Řízené pole pak React vrátí na původní text.
                if (!e.nativeEvent.isTrusted || (!allowLong && next.length - userAnswer.length > MAX_INSERT_CHARS)) {
                  setClipboardBlocked(true);
                  return;
                }
                setUserAnswer(next);
                setClipboardBlocked(false);
              }}
              onPaste={blockClipboard}
              onCopy={blockClipboard}
              onCut={blockClipboard}
              onDrop={blockClipboard}
              onDragStart={blockClipboard}
              aria-describedby={clipboardBlocked ? 'assessment-clipboard-note' : undefined}
              placeholder="Napište svou odpověď..."
              rows={8}
              disabled={submitting}
              style={{ minHeight: 200, resize: 'vertical' }}
              className={cn("field-sizing-fixed min-h-0", "w-full border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30 mb-3")}
            />
            {clipboardBlocked && (
              <p id="assessment-clipboard-note" role="status" className="-mt-1 mb-3 text-xs text-muted-foreground">
                Kopírování a vkládání je v testu vypnuté — odpověď napište vlastními slovy.
              </p>
            )}

            {/* Last attempt feedback */}
            {lastAttempt && (
              <motion.div
                key={`feedback-${lastAttempt.attemptId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`p-4 rounded-lg border mb-4 ${
                  lastAttempt.aiScore >= PASSING_SCORE ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-destructive">
                      Skóre: {lastAttempt.aiScore}/100
                    </span>
                    {lastAttempt.aiFeedback && (
                      <p className="text-sm text-muted-foreground mt-1">{lastAttempt.aiFeedback}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end mt-4">
              <Button
                variant="plain"
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || submitting || userAnswer.trim() === lastSubmittedAnswer}
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

        {/* ── Failed view ── */}
        {failed && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Last feedback */}
            {lastAttempt && (
              <div className="p-4 rounded-lg border bg-destructive/10 border-destructive/30 mb-6">
                <div className="flex items-start gap-2">
                  <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-destructive">
                      Skóre: {lastAttempt.aiScore}/100
                    </span>
                    {lastAttempt.aiFeedback && (
                      <p className="text-sm text-muted-foreground mt-1">{lastAttempt.aiFeedback}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center py-6">
              <XCircle className="size-16 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-1">Vyčerpali jste všechny pokusy</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Pro pokračování musíte opakovat celý modul znovu.
              </p>
              <Button
                variant="plain"
                onClick={onRestartModule}
                className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90")}
                style={{ backgroundColor: 'var(--gradient-r)' }}
              >
                Opakovat modul
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
