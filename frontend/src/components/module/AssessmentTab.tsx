'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Loader2, ChevronRight, Trophy, RefreshCw } from 'lucide-react';
import {
  generateAssessment,
  evaluateAssessment,
  getModuleAssessment,
  completeModule,
  getCourseProgress,
} from '@/lib/api-client';

const PASSING_SCORE = 75;

interface AssessmentTabProps {
  moduleId: number;
  courseId: number;
  maxAttempts: number;
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
  nextModule,
  onModuleComplete,
  onRestartModule,
}: AssessmentTabProps) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [passed, setPassed] = useState(false);
  const [failed, setFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [moduleCompleted, setModuleCompleted] = useState(false);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const attemptsUsed = attempts.length;
  const attemptsRemaining = maxAttempts - attemptsUsed;

  // Load existing session or generate a new one
  const initAssessment = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Check for an existing session first
      try {
        const existing = await getModuleAssessment(moduleId);
        if (existing) {
          setSessionId(existing.sessionId);
          setQuestion(existing.generatedTask);

          if (existing.status === 'passed') {
            // Module already passed — go straight to completion
            setPassed(true);
            setModuleCompleted(true);
            return;
          }
          if (existing.status === 'in_progress') {
            // Active session exists, use it
            return;
          }
          // status === 'failed' — fall through to generate a new one
        }
      } catch {
        // No existing session
      }

      // Generate a fresh assessment
      const resp = await generateAssessment(moduleId);
      setSessionId(resp.sessionId);
      setQuestion(resp.generatedQuestion);
    } catch (err) {
      console.error('Failed to init assessment:', err);
      setErrorMsg('Nepodařilo se načíst test. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    initAssessment();
  }, [initAssessment]);

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!sessionId || !userAnswer.trim() || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
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
        // Auto-complete the module immediately (skip intermediate screen)
        try {
          const bestScore = Math.max(...newAttempts.map((a) => a.aiScore));
          const completionResult = await completeModule(moduleId, bestScore);
          setModuleCompleted(true);
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
      setErrorMsg('Nepodařilo se vyhodnotit odpověď. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Clear answer to retry (same question, same session)
  const handleRetry = () => {
    setUserAnswer('');
    setErrorMsg(null);
  };

  // Regenerate question within the same session
  const handleRegenerateQuestion = async () => {
    setRegenerating(true);
    setErrorMsg(null);
    try {
      const resp = await generateAssessment(moduleId);
      setSessionId(resp.sessionId);
      setQuestion(resp.generatedQuestion);
      setUserAnswer('');
    } catch (err) {
      console.error('Failed to regenerate question:', err);
      setErrorMsg('Nepodařilo se vygenerovat novou otázku.');
    } finally {
      setRegenerating(false);
    }
  };

  // Last attempt feedback
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm text-gray-500">Připravuji test...</p>
        </div>
      </div>
    );
  }

  // Module completed view
  if (moduleCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Score feedback */}
        {lastAttempt && (
          <div className="p-4 rounded-lg border bg-green-50 border-green-200 mb-6">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-green-700">
                    Skóre: {lastAttempt.aiScore}/100
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                    Splněno
                  </span>
                </div>
                {lastAttempt.aiFeedback && (
                  <p className="text-sm text-gray-600">{lastAttempt.aiFeedback}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(0, 200, 150, 0.1)' }}>
            <Trophy className="w-12 h-12" style={{ color: '#00C896' }} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {courseCompleted ? 'Kurz dokončen!' : 'Modul dokončen!'}
          </h3>
          <p className="text-gray-500 mb-8">
            {courseCompleted
              ? 'Gratulujeme! Úspěšně jste dokončili všechny moduly kurzu.'
              : 'Gratulujeme! Úspěšně jste prošli testem.'}
          </p>
          <button
            onClick={onModuleComplete}
            className="inline-flex items-center gap-2 text-white font-semibold py-3 px-8 rounded-md transition-all hover:opacity-90 hover:shadow-md"
            style={{ backgroundColor: '#00C896' }}
          >
            {courseCompleted ? 'Zpět na kurz' : nextModule ? 'Další modul' : 'Dokončit kurz'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-800">Test</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{
            backgroundColor: attemptsRemaining <= 1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 91, 168, 0.1)',
            color: attemptsRemaining <= 1 ? '#DC2626' : '#8B5BA8',
          }}>
            Zbývá pokusů: {attemptsRemaining} z {maxAttempts}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(attemptsUsed / maxAttempts) * 100}%`,
              backgroundColor: passed ? '#00C896' : '#8B5BA8',
            }}
          />
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Question view (not passed, not failed) ── */}
        {!passed && !failed && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question text */}
            <div className="mb-6">
              <p className="text-gray-800 font-medium leading-relaxed">{question}</p>
            </div>

            {/* Answer textarea */}
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Napište svou odpověď..."
              rows={4}
              disabled={submitting}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 resize-none mb-3"
            />

            {/* Last attempt feedback */}
            {lastAttempt && (
              <motion.div
                key={`feedback-${lastAttempt.attemptId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`p-4 rounded-lg border mb-4 ${
                  lastAttempt.aiScore >= PASSING_SCORE ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-red-700">
                      Skóre: {lastAttempt.aiScore}/100
                    </span>
                    {lastAttempt.aiFeedback && (
                      <p className="text-sm text-gray-600 mt-1">{lastAttempt.aiFeedback}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                {lastAttempt && attemptsRemaining > 0 && (
                  <>
                    <button
                      onClick={handleRetry}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Upravit odpověď
                    </button>
                    <button
                      onClick={handleRegenerateQuestion}
                      disabled={regenerating}
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline disabled:opacity-50"
                      style={{ color: '#8B5BA8' }}
                    >
                      {regenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Nová otázka
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim() || submitting}
                className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8B5BA8' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vyhodnocuji...
                  </>
                ) : (
                  'Odevzdat'
                )}
              </button>
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
              <div className="p-4 rounded-lg border bg-red-50 border-red-200 mb-6">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-red-700">
                      Skóre: {lastAttempt.aiScore}/100
                    </span>
                    {lastAttempt.aiFeedback && (
                      <p className="text-sm text-gray-600 mt-1">{lastAttempt.aiFeedback}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center py-6">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-1">Vyčerpali jste všechny pokusy</h3>
              <p className="text-sm text-gray-500 mb-6">
                Pro pokračování musíte opakovat celý modul znovu.
              </p>
              <button
                onClick={onRestartModule}
                className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90"
                style={{ backgroundColor: '#8B5BA8' }}
              >
                Opakovat modul
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
