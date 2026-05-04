'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Plus, Loader2 } from 'lucide-react';
import {
  listPracticeQuestions,
  generatePracticeQuestion,
  evaluatePracticeAnswer,
} from '@/lib/api-client';
import type {
  PracticeQuestion,
  PracticeQuestionWithAttempts,
  EvaluatePracticeAnswerResponse,
  GeneratePracticeQuestionResponse,
  PracticeQuestionOption,
} from '@/api';
import { QuestionType } from '@/api';

// types 

interface PracticeTabProps {
  moduleId: number;
  practiceQuestions: PracticeQuestion[];
  onComplete: () => void;
}

type Phase = 'static' | 'ai';

// Local representation of an AI-generated question
interface AIQuestion {
  userQuestionId: number;
  questionType: 'open' | 'closed';
  generatedQuestion: string;
  options: PracticeQuestionOption[] | null;
  userInput: string;
  evaluation: EvaluatePracticeAnswerResponse | null;
  submitting: boolean;
}

//  component

export default function PracticeTab({ moduleId, practiceQuestions, onComplete }: PracticeTabProps) {
  const hasPracticeQuestions = practiceQuestions.length > 0;

  // Restore practice state from sessionStorage
  const storageKey = `practice-state-${moduleId}`;
  const savedState = (() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  // static course questions
  const [phase, setPhase] = useState<Phase>(savedState?.phase ?? (hasPracticeQuestions ? 'static' : 'ai'));
  const [staticAnswers, setStaticAnswers] = useState<Record<number, number | string>>(savedState?.staticAnswers ?? {});
  const [staticSubmitted, setStaticSubmitted] = useState(savedState?.staticSubmitted ?? false);

  // AI-generated questions 
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [savedAiInputs] = useState<Record<number, string>>(() => savedState?.aiUserInputs ?? {});
  const [aiLoaded, setAiLoaded] = useState(false);

  // Persist practice state to sessionStorage
  useEffect(() => {
    try {
      const aiUserInputs: Record<number, string> = aiLoaded
        ? aiQuestions.reduce<Record<number, string>>((acc, q) => {
            if (!q.evaluation && q.userInput) acc[q.userQuestionId] = q.userInput;
            return acc;
          }, {})
        : savedAiInputs;
      sessionStorage.setItem(storageKey, JSON.stringify({
        phase,
        staticAnswers,
        staticSubmitted,
        aiUserInputs,
      }));
    } catch { /* ignore */ }
  }, [storageKey, phase, staticAnswers, staticSubmitted, aiQuestions, aiLoaded, savedAiInputs]);

  const handleStaticAnswerChange = (questionId: number, value: number | string) => {
    setStaticAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const calculateStaticScore = () => {
    let correct = 0;
    const results: {
      questionId: number;
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      question: string;
      matchedKeywords?: string[];
      missingKeywords?: string[];
    }[] = [];

    practiceQuestions.forEach((q) => {
      const answer = staticAnswers[q.questionId];
      let isCorrect = false;
      let userAnswerText = '';
      const correctAnswerText = q.correctAnswer || q.exampleAnswer || '';
      let matchedKeywords: string[] | undefined;
      let missingKeywords: string[] | undefined;

      if (q.questionType === 'closed') {
        const selectedOption = (q.closedOptions ?? []).find((o) => o.optionId === answer);
        userAnswerText = selectedOption?.text || '';
        isCorrect = !!(q.correctAnswer && userAnswerText === q.correctAnswer);
      } else {
        userAnswerText = String(answer || '');
        const keywords = (q.openKeywords ?? []).map((k) => k.keyword);
        if (keywords.length > 0) {
          const lowerAnswer = userAnswerText.toLowerCase();
          matchedKeywords = keywords.filter((kw) => lowerAnswer.includes(kw.toLowerCase()));
          missingKeywords = keywords.filter((kw) => !lowerAnswer.includes(kw.toLowerCase()));
          isCorrect = matchedKeywords.length > 0;
        } else {
          isCorrect = userAnswerText.trim().length > 0;
        }
      }

      if (isCorrect) correct++;
      results.push({ questionId: q.questionId, isCorrect, userAnswer: userAnswerText, correctAnswer: correctAnswerText, question: q.question, matchedKeywords, missingKeywords });
    });

    return { correct, total: practiceQuestions.length, results };
  };

  const handleStaticSubmit = () => {
    setStaticSubmitted(true);
  };

  const staticScore = staticSubmitted ? calculateStaticScore() : null;
  const staticPercentage = staticScore ? (staticScore.total > 0 ? Math.round((staticScore.correct / staticScore.total) * 100) : 0) : 0;
  const staticPassed = staticPercentage >= 75;

  // AI question helpers 

  const loadAiQuestions = useCallback(async () => {
    try {
      setAiLoading(true);
      const data = await listPracticeQuestions(moduleId);
      const mapped: AIQuestion[] = data.map((q: PracticeQuestionWithAttempts) => {
        const lastAttempt = q.attempts.length > 0 ? q.attempts[q.attempts.length - 1] : null;
        return {
          userQuestionId: q.userQuestionId,
          questionType: q.questionType as 'open' | 'closed',
          generatedQuestion: q.generatedQuestion,
          options: q.options,
          userInput: lastAttempt?.userInput ?? (savedAiInputs[q.userQuestionId] ?? ''),
          evaluation: lastAttempt
            ? { attemptId: lastAttempt.attemptId, isCorrect: lastAttempt.isCorrect ?? false, aiResponse: lastAttempt.aiResponse }
            : null,
          submitting: false,
        };
      });
      setAiQuestions(mapped);
      setAiLoaded(true);
    } catch (err) {
      console.error('Failed to load AI practice questions:', err);
    } finally {
      setAiLoading(false);
    }
  }, [moduleId, savedAiInputs]);

  // When switching to AI phase, load existing AI questions
  useEffect(() => {
    if (phase === 'ai') {
      loadAiQuestions();
    }
  }, [phase, loadAiQuestions]);

  const handleGenerate = async (type: 'open' | 'closed') => {
    setShowTypeSelector(false);
    setGenerating(true);
    try {
      const qType = type === 'open' ? QuestionType.Open : QuestionType.Closed;
      const resp: GeneratePracticeQuestionResponse = await generatePracticeQuestion(moduleId, qType);
      const newQ: AIQuestion = {
        userQuestionId: resp.userQuestionId,
        questionType: type,
        generatedQuestion: resp.generatedQuestion,
        options: resp.options ?? null,
        userInput: '',
        evaluation: null,
        submitting: false,
      };
      setAiQuestions((prev) => [...prev, newQ]);
    } catch (err) {
      console.error('Failed to generate practice question:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAiInputChange = (idx: number, value: string) => {
    setAiQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, userInput: value } : q)));
  };

  const handleAiOptionSelect = (idx: number, optionText: string) => {
    setAiQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, userInput: optionText } : q)));
  };

  const handleAiSubmit = async (idx: number) => {
    const q = aiQuestions[idx];
    if (!q.userInput.trim()) return;
    setAiQuestions((prev) => prev.map((item, i) => (i === idx ? { ...item, submitting: true } : item)));
    try {
      const resp = await evaluatePracticeAnswer(q.userQuestionId, q.userInput);
      setAiQuestions((prev) => prev.map((item, i) => (i === idx ? { ...item, evaluation: resp, submitting: false } : item)));
    } catch (err) {
      console.error('Failed to evaluate practice answer:', err);
      setAiQuestions((prev) => prev.map((item, i) => (i === idx ? { ...item, submitting: false } : item)));
    }
  };

  const handleAiRetry = (idx: number) => {
    setAiQuestions((prev) => prev.map((item, i) => (i === idx ? { ...item, userInput: '', evaluation: null } : item)));
  };

  // ── Render ──

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800">Procvičování</h3>
        <p className="text-sm text-gray-500 mt-1">
          Odpovězte na otázky a ověřte si své znalosti z příručky.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* 
            PHASE 1 – Static course questions */}
        {phase === 'static' && !staticSubmitted && (
          <motion.div
            key="static-questions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-8">
              {practiceQuestions.map((q, qIdx) => (
                <div key={q.questionId} className="pb-6 border-b border-gray-100 last:border-b-0">
                  <p className="font-semibold text-gray-800 mb-3">
                    <span className="text-purple-600 mr-2">{qIdx + 1}.</span>
                    {q.question}
                  </p>

                  {q.questionType === 'closed' && q.closedOptions && (
                    <div className="space-y-2 ml-6">
                      {(q.closedOptions ?? []).map((opt) => (
                        <label
                          key={opt.optionId}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            staticAnswers[q.questionId] === opt.optionId
                              ? 'border-purple-300 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.questionId}`}
                            value={opt.optionId}
                            checked={staticAnswers[q.questionId] === opt.optionId}
                            onChange={() => handleStaticAnswerChange(q.questionId, opt.optionId)}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.questionType === 'open' && (
                    <div className="ml-6">
                      <textarea
                        value={String(staticAnswers[q.questionId] || '')}
                        onChange={(e) => handleStaticAnswerChange(q.questionId, e.target.value)}
                        placeholder="Napište svou odpověď..."
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {practiceQuestions.length > 0 && (
              <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={handleStaticSubmit}
                  className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90"
                  style={{ backgroundColor: '#8B5BA8' }}
                >
                  Odevzdat
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/*
            PHASE 1 – Evaluation results */}
        {phase === 'static' && staticSubmitted && staticScore && (
          <motion.div
            key="static-results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {/* Score header */}
            <div className="text-center mb-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${staticPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                {staticPassed ? <CheckCircle className="w-12 h-12 text-green-500" /> : <XCircle className="w-12 h-12 text-red-400" />}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">Vyhodnocení</h3>
              <p className={`text-lg font-semibold ${staticPassed ? 'text-green-600' : 'text-red-500'}`}>
                {staticScore.correct}/{staticScore.total} správně ({staticPercentage}%)
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {staticPassed ? 'Gratulujeme! Úspěšně jste prošli procvičováním.' : 'Bohužel jste neprošli. Zkuste to znovu.'}
              </p>
            </div>

            {/* Per-question results */}
            <div className="space-y-4 mb-8">
              {staticScore.results.map((r, idx) => (
                <div
                  key={r.questionId}
                  className={`p-4 rounded-lg border ${r.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-grow">
                      <p className="font-medium text-gray-800 text-sm">
                        {idx + 1}. {r.question}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Vaše odpověď: <span className="font-medium">{r.userAnswer || '(bez odpovědi)'}</span>
                      </p>
                      {!r.isCorrect && r.correctAnswer && !r.missingKeywords && (
                        <p className="text-sm text-green-700 mt-1">
                          Správná odpověď: <span className="font-medium">{r.correctAnswer}</span>
                        </p>
                      )}
                      {r.matchedKeywords && r.matchedKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.matchedKeywords.map((kw) => (
                            <span key={kw} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" /> {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.missingKeywords && r.missingKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.missingKeywords.map((kw) => (
                            <span key={kw} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              <XCircle className="w-3 h-3" /> {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-gray-100">
              <button
                onClick={() => { setStaticSubmitted(false); setStaticAnswers({}); }}
                className="text-gray-600 hover:text-gray-800 font-medium text-sm self-center sm:self-auto"
              >
                Zkusit znovu
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {staticPassed && (
                  <>
                    <button
                      onClick={() => setPhase('ai')}
                      className="inline-flex items-center justify-center gap-2 font-semibold py-2.5 px-4 sm:px-6 rounded-md transition-all hover:opacity-90 border w-full sm:w-auto text-sm sm:text-base"
                      style={{ color: '#8B5BA8', borderColor: '#8B5BA8' }}
                    >
                      Procvičovat dál
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                    <button
                      onClick={onComplete}
                      className="inline-flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 sm:px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md w-full sm:w-auto text-sm sm:text-base"
                      style={{ backgroundColor: '#00C896' }}
                    >
                      Dokončit
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 
            PHASE 2 – AI-generated questions */}
        {phase === 'ai' && (
          <motion.div
            key="ai-questions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {aiLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <p className="text-sm text-gray-500">Načítání otázek...</p>
                </div>
              </div>
            ) : (
              <>
                {/* AI question list */}
                <div className="space-y-6">
                  <AnimatePresence initial={false}>
                    {aiQuestions.map((q, idx) => (
                      <motion.div
                        key={q.userQuestionId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="pb-6 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-semibold text-gray-800 mb-3">
                          <span className="text-purple-600 mr-2">{idx + 1}.</span>
                          {q.generatedQuestion}
                        </p>

                        {/* Closed options */}
                        {q.questionType === 'closed' && q.options && (
                          <div className="space-y-2 ml-6">
                            {q.options.map((opt, optIdx) => (
                              <label
                                key={optIdx}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  q.evaluation
                                    ? q.userInput === opt.text
                                      ? q.evaluation.isCorrect
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-red-300 bg-red-50'
                                      : 'border-gray-200 opacity-60'
                                    : q.userInput === opt.text
                                      ? 'border-purple-300 bg-purple-50'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`pq-${q.userQuestionId}`}
                                  checked={q.userInput === opt.text}
                                  onChange={() => handleAiOptionSelect(idx, opt.text)}
                                  disabled={!!q.evaluation}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">{opt.text}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Open textarea */}
                        {q.questionType === 'open' && !q.evaluation && (
                          <div className="ml-6">
                            <textarea
                              value={q.userInput}
                              onChange={(e) => handleAiInputChange(idx, e.target.value)}
                              placeholder="Napište svou odpověď..."
                              rows={3}
                              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 resize-none"
                            />
                          </div>
                        )}

                        {/* Evaluation feedback */}
                        {q.evaluation && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`ml-6 mt-3 p-4 rounded-lg border ${
                              q.evaluation.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {q.evaluation.isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                              )}
                              <div>
                                <p className={`text-sm font-medium ${q.evaluation.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                  {q.evaluation.isCorrect ? 'Správně!' : 'Nesprávně'}
                                </p>
                                {q.questionType === 'open' && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Vaše odpověď: <span className="font-medium">{q.userInput}</span>
                                  </p>
                                )}
                                {q.evaluation.aiResponse && (
                                  <p className="text-sm text-gray-600 mt-1">{q.evaluation.aiResponse}</p>
                                )}
                                {!q.evaluation.isCorrect && (
                                  <button
                                    onClick={() => handleAiRetry(idx)}
                                    className="text-sm font-medium mt-2 hover:underline"
                                    style={{ color: '#8B5BA8' }}
                                  >
                                    Zkusit znovu
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Submit button */}
                        {!q.evaluation && (
                          <div className="ml-6 mt-3">
                            <button
                              onClick={() => handleAiSubmit(idx)}
                              disabled={!q.userInput.trim() || q.submitting}
                              className="inline-flex items-center gap-2 text-white font-medium py-2 px-5 rounded-md text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: '#8B5BA8' }}
                            >
                              {q.submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Vyhodnocuji...
                                </>
                              ) : (
                                'Odevzdat'
                              )}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add question button */}
                <div className="mt-6 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {showTypeSelector ? (
                      <motion.div
                        key="type-selector"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-sm text-gray-500">Typ otázky:</span>
                        <button
                          onClick={() => handleGenerate('open')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-sm font-medium transition-all hover:bg-purple-100"
                          style={{ color: '#8B5BA8' }}
                        >
                          Otevřená
                        </button>
                        <button
                          onClick={() => handleGenerate('closed')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-sm font-medium transition-all hover:bg-purple-100"
                          style={{ color: '#8B5BA8' }}
                        >
                          Uzavřená
                        </button>
                        <button
                          onClick={() => setShowTypeSelector(false)}
                          className="text-sm text-gray-400 hover:text-gray-600 ml-1"
                        >
                          Zrušit
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="add-btn"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setShowTypeSelector(true)}
                        disabled={generating}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 font-medium text-sm transition-all hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generuji otázku...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Přidat otázku
                          </>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* No AI questions prompt */}
                {aiQuestions.length === 0 && !generating && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">Zatím nemáte žádné další otázky k procvičování.</p>
                    <p className="text-sm text-gray-400">Klikněte na tlačítko výše a vygenerujte si otázku.</p>
                  </div>
                )}

                {/* Dokončit button (always visible in AI phase if static was passed or skipped) */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={onComplete}
                    className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md"
                    style={{ backgroundColor: '#00C896' }}
                  >
                    Dokončit
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
