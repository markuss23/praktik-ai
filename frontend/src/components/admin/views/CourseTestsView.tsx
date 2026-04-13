'use client';

import { useState, useEffect } from 'react';
import { QuestionType, FeedbackItem, Status } from '@/api';
import {
  updatePracticeQuestion, updatePracticeOption, createPracticeQuestion, createPracticeOption,
  getFeedbackSection, replyToFeedback, resolveFeedback, updateCourseStatus,
} from '@/lib/api-client';
import { UpdateCourseStatusStatusEnum } from '@/api/apis/CoursesApi';
import { CoursePageHeader, LoadingState, ErrorState } from '@/components/admin';
import { CourseOutlineSidebar } from '@/components/admin/CourseOutlineSidebar';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCourseData } from '@/hooks/useCourseData';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  Plus,
  Trash2,
  Send,
  CheckCircle,
  CornerDownRight,
  ArrowUpCircle,
} from 'lucide-react';

interface QuestionItem {
  id: number;
  questionId?: number;
  question: string;
  type: 'closed' | 'open';
  correctAnswer?: string;
  exampleAnswer?: string;
  options: { id: number; optionId?: number; text: string; isCorrect: boolean }[];
}

interface ValidationError {
  moduleIndex: number;
  moduleName: string;
  questionIndex: number;
  message: string;
}

interface CourseTestsViewProps {
  courseId: number;
  initialModuleId?: number;
}

// Editor testů/otázek pro moduly kurzu
export function CourseTestsView({ courseId, initialModuleId }: CourseTestsViewProps) {
  const { goToCourseContent, goToCourseSummary } = useAdminNavigation();
  const { isOwner } = useCurrentUser();
  const {
    loading,
    error,
    courseTitle,
    modules,
    selectedModuleIndex,
    setSelectedModuleIndex,
    expandedOutlineItems,
    setExpandedOutlineItems,
    toggleOutlineItem,
    selectModule,
    courseData,
  } = useCourseData({ courseId, initialModuleId });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [showReplyFor, setShowReplyFor] = useState<number | null>(null);
  const [submittingReply, setSubmittingReply] = useState<number | null>(null);
  const [resolvingFeedback, setResolvingFeedback] = useState<number | null>(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const courseStatus = courseData?.status as string | undefined;
  const isEdited = courseStatus === Status.Edited;
  const hasFeedbacks = feedbacks.length > 0;
  const showCommentsPanel = isEdited && hasFeedbacks;
  const allResolved = feedbacks.length > 0 && feedbacks.every(fb => fb.isResolved);
  const canResubmit = isEdited && allResolved && courseData && isOwner(courseData.ownerId);

  useEffect(() => {
    if (!courseId) return;
    getFeedbackSection(courseId)
      .then(section => setFeedbacks(section.feedbacks))
      .catch(() => {});
  }, [courseId]);

  const currentModuleFeedbacks = modules[selectedModuleIndex]
    ? feedbacks.filter(fb => fb.moduleId === modules[selectedModuleIndex].moduleId)
    : [];

  const feedbackCountByModule = (moduleId: number) =>
    feedbacks.filter(fb => fb.moduleId === moduleId).length;

  const feedbackContextLabel = (fb: FeedbackItem) => {
    if (fb.contentType === 'learn_block' && fb.contentRef) return `Příručka – str. ${fb.contentRef}`;
    if (fb.contentType === 'practice' && fb.contentRef) return `Procvičování – ot. ${fb.contentRef}`;
    return null;
  };

  const handleReply = async (feedbackId: number) => {
    const text = replyTexts[feedbackId]?.trim();
    if (!text) return;
    setSubmittingReply(feedbackId);
    try {
      const updated = await replyToFeedback(feedbackId, text);
      setFeedbacks(prev => prev.map(fb => fb.feedbackId === feedbackId ? updated : fb));
      setShowReplyFor(null);
      setReplyTexts(prev => ({ ...prev, [feedbackId]: '' }));
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleToggleResolve = async (fb: FeedbackItem) => {
    setResolvingFeedback(fb.feedbackId);
    try {
      const updated = await resolveFeedback(fb.feedbackId, !fb.isResolved);
      setFeedbacks(prev => prev.map(f => f.feedbackId === fb.feedbackId ? updated : f));
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolvingFeedback(null);
    }
  };

  const handleResubmit = async () => {
    setResubmitLoading(true);
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.InReview);
    } catch (err) {
      console.error('Failed to resubmit:', err);
    } finally {
      setResubmitLoading(false);
    }
  };

  // Stav otázek pro každý modul
  const [moduleQuestions, setModuleQuestions] = useState<{[key: number]: QuestionItem[]}>({});
  const [questionsInitialized, setQuestionsInitialized] = useState(false);

  // Inicializace otázek z courseData
  if (courseData && !questionsInitialized) {
    const allModuleQuestions: {[key: number]: QuestionItem[]} = {};
    (courseData.modules || []).forEach((module, moduleIndex) => {
      if (module.practiceQuestions && module.practiceQuestions.length > 0) {
        allModuleQuestions[moduleIndex] = module.practiceQuestions.map((q, qIndex) => ({
          id: qIndex + 1,
          questionId: q.questionId,
          question: q.question,
          type: q.questionType === QuestionType.Closed ? 'closed' : 'open',
          correctAnswer: q.correctAnswer ?? undefined,
          exampleAnswer: q.exampleAnswer ?? undefined,
          options: q.closedOptions?.map((opt, oIndex) => ({
            id: oIndex + 1,
            optionId: opt.optionId,
            text: opt.text,
            isCorrect: opt.text === q.correctAnswer,
          })) || [],
        }));
      } else {
        allModuleQuestions[moduleIndex] = [];
      }
    });
    setModuleQuestions(allModuleQuestions);
    setQuestionsInitialized(true);
  }

  const questions = moduleQuestions[selectedModuleIndex] || [];

  const setQuestions = (newQuestions: QuestionItem[] | ((prev: QuestionItem[]) => QuestionItem[])) => {
    setModuleQuestions(prev => ({
      ...prev,
      [selectedModuleIndex]: typeof newQuestions === 'function'
        ? newQuestions(prev[selectedModuleIndex] || [])
        : newQuestions
    }));
  };

  const addQuestion = () => {
    const newId = Math.max(...questions.map(q => q.id), 0) + 1;
    setQuestions([
      ...questions,
      {
        id: newId,
        question: '',
        type: 'closed',
        options: [
          { id: 1, text: '', isCorrect: false },
          { id: 2, text: '', isCorrect: false },
          { id: 3, text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const updateQuestion = (id: number, field: keyof QuestionItem, value: string | 'closed' | 'open') => {
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;
      if (field === 'type') {
        if (value === 'closed' && q.type === 'open') {
          return {
            ...q,
            type: 'closed' as const,
            options: q.options.length > 0 ? q.options : [
              { id: 1, text: '', isCorrect: false },
              { id: 2, text: '', isCorrect: false },
              { id: 3, text: '', isCorrect: false },
            ],
          };
        } else if (value === 'open' && q.type === 'closed') {
          return { ...q, type: 'open' as const };
        }
      }
      return { ...q, [field]: value };
    }));
  };

  const updateOption = (questionId: number, optionId: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: q.options.map(opt => opt.id === optionId ? { ...opt, text } : opt) };
      }
      return q;
    }));
  };

  const setCorrectOption = (questionId: number, optionId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: q.options.map(opt => ({ ...opt, isCorrect: opt.id === optionId })) };
      }
      return q;
    }));
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const saveTestContent = async () => {
    try {
      const questionUpdates: { questionId: number; data: Parameters<typeof updatePracticeQuestion>[1] }[] = [];
      const optionUpdatePromises: Promise<unknown>[] = [];
      const createdQuestions: { moduleIndex: number; questionIndex: number; question: QuestionItem }[] = [];
      const newOptionsForExistingQuestions: { moduleIndex: number; questionIndex: number; optionIndex: number; option: QuestionItem['options'][0]; questionId: number }[] = [];

      for (const moduleIndex of Object.keys(moduleQuestions)) {
        const questionsForModule = moduleQuestions[Number(moduleIndex)] || [];
        const module = modules[Number(moduleIndex)];

        for (let qIndex = 0; qIndex < questionsForModule.length; qIndex++) {
          const question = questionsForModule[qIndex];

          if (question.questionId) {
            const correctOption = question.options.find(opt => opt.isCorrect);
            questionUpdates.push({
              questionId: question.questionId,
              data: {
                question: question.question,
                questionType: question.type === 'closed' ? QuestionType.Closed : QuestionType.Open,
                correctAnswer: correctOption?.text ?? question.correctAnswer,
                exampleAnswer: question.exampleAnswer,
              },
            });

            if (question.type === 'closed') {
              for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
                const option = question.options[optIndex];
                if (option.optionId) {
                  optionUpdatePromises.push(
                    updatePracticeOption(option.optionId, { text: option.text })
                  );
                } else {
                  newOptionsForExistingQuestions.push({
                    moduleIndex: Number(moduleIndex), questionIndex: qIndex, optionIndex: optIndex, option, questionId: question.questionId,
                  });
                }
              }
            }
          } else if (module?.moduleId) {
            createdQuestions.push({ moduleIndex: Number(moduleIndex), questionIndex: qIndex, question });
          }
        }
      }

      for (const { questionId, data } of questionUpdates) {
        await updatePracticeQuestion(questionId, data);
      }

      await Promise.all(optionUpdatePromises);

      for (const { moduleIndex, questionIndex, optionIndex, option, questionId } of newOptionsForExistingQuestions) {
        const createdOption = await createPracticeOption({ questionId, text: option.text });
        setModuleQuestions(prev => {
          const updated = { ...prev };
          if (updated[moduleIndex] && updated[moduleIndex][questionIndex]) {
            const questionCopy = { ...updated[moduleIndex][questionIndex] };
            questionCopy.options = [...questionCopy.options];
            questionCopy.options[optionIndex] = { ...questionCopy.options[optionIndex], optionId: createdOption.optionId };
            updated[moduleIndex] = [...updated[moduleIndex]];
            updated[moduleIndex][questionIndex] = questionCopy;
          }
          return updated;
        });
      }

      for (const { moduleIndex, questionIndex, question } of createdQuestions) {
        const module = modules[moduleIndex];
        if (!module?.moduleId) continue;
        const correctOption = question.options.find(opt => opt.isCorrect);
        const createdQuestion = await createPracticeQuestion({
          moduleId: module.moduleId,
          questionType: question.type === 'closed' ? QuestionType.Closed : QuestionType.Open,
          question: question.question,
          correctAnswer: correctOption?.text ?? question.correctAnswer,
          exampleAnswer: question.exampleAnswer,
        });

        setModuleQuestions(prev => {
          const updated = { ...prev };
          if (updated[moduleIndex]) {
            updated[moduleIndex] = [...updated[moduleIndex]];
            updated[moduleIndex][questionIndex] = { ...updated[moduleIndex][questionIndex], questionId: createdQuestion.questionId };
          }
          return updated;
        });

        if (question.type === 'closed' && createdQuestion.questionId) {
          for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
            const option = question.options[optIndex];
            const createdOption = await createPracticeOption({
              questionId: createdQuestion.questionId, text: option.text,
            });
            setModuleQuestions(prev => {
              const updated = { ...prev };
              if (updated[moduleIndex] && updated[moduleIndex][questionIndex]) {
                const questionCopy = { ...updated[moduleIndex][questionIndex] };
                questionCopy.options = [...questionCopy.options];
                questionCopy.options[optIndex] = { ...questionCopy.options[optIndex], optionId: createdOption.optionId };
                updated[moduleIndex] = [...updated[moduleIndex]];
                updated[moduleIndex][questionIndex] = questionCopy;
              }
              return updated;
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to save test content:', err);
      alert('Nepodařilo se uložit obsah testu');
      throw err;
    }
  };

  const validateQuestions = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    for (const moduleIndexStr of Object.keys(moduleQuestions)) {
      const moduleIndex = Number(moduleIndexStr);
      const questionsForModule = moduleQuestions[moduleIndex] || [];
      const module = modules[moduleIndex];
      const moduleName = module?.title || `Modul ${moduleIndex + 1}`;

      questionsForModule.forEach((question, qIndex) => {
        if (!question.question.trim()) {
          errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá zadaný text otázky` });
        }
        if (question.type === 'closed') {
          if (!question.options.some(opt => opt.text.trim())) {
            errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá žádné možnosti odpovědí` });
          }
          if (!question.options.some(opt => opt.isCorrect && opt.text.trim())) {
            errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá označenou správnou odpověď` });
          }
        } else if (question.type === 'open') {
          if (!question.exampleAnswer?.trim()) {
            errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá příklad odpovědi` });
          }
        }
      });
    }
    return errors;
  };

  const handleFinish = async () => {
    const errors = validateQuestions();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    await saveTestContent();
    goToCourseSummary(courseId);
  };

  const handleNextModule = async () => {
    await saveTestContent();
    if (selectedModuleIndex < modules.length - 1) {
      const nextIndex = selectedModuleIndex + 1;
      setSelectedModuleIndex(nextIndex);
      setExpandedOutlineItems(prev => new Set(prev).add(nextIndex));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = async () => {
    await saveTestContent();
    goToCourseContent(courseId);
  };

  const isLastModule = selectedModuleIndex >= modules.length - 1;

  const scrollToQuestion = (moduleIndex: number, questionIndex: number) => {
    setSelectedModuleIndex(moduleIndex);
    if (!expandedOutlineItems.has(moduleIndex)) {
      setExpandedOutlineItems(prev => new Set(prev).add(moduleIndex));
    }
    setTimeout(() => {
      const el = document.getElementById(`question-${moduleIndex}-${questionIndex}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // Outline items pro sidebar
  const outlineItems = modules.map((module, index) => {
    const questionsForModule = moduleQuestions[index] || [];
    return {
      id: index,
      title: module.title,
      isExpanded: expandedOutlineItems.has(index),
      isSelected: selectedModuleIndex === index,
      feedbackCount: feedbackCountByModule(module.moduleId),
      subItems: questionsForModule.map((q, qIdx) => ({
        id: `q-${index}-${q.id}`,
        label: q.question ? (q.question.substring(0, 30) + (q.question.length > 30 ? '...' : '')) : `Otázka ${qIdx + 1}`,
        questionIndex: qIdx,
      })),
    };
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${courseTitle} / Tvorba obsahu testu`}
        title="Tvorba obsahu testu"
        onSave={handleFinish}
        showButtons={false}
      />

      {/* Resubmit banner */}
      {/* {isEdited && hasFeedbacks && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-amber-800">
            Kurz byl zamítnut — vyřešte komentáře a odešlete znovu ke kontrole.
          </p>
          {canResubmit && (
            <button
              onClick={handleResubmit}
              disabled={resubmitLoading}
              className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <ArrowUpCircle size={14} />
              {resubmitLoading ? 'Odesílání...' : 'Odeslat ke kontrole'}
            </button>
          )}
        </div>
      )} */}

      {validationErrors.length > 0 && (
        <div className="mx-4 sm:mx-6 mt-2 bg-red-50 rounded-lg p-2">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <span>Opravte následující chyby:</span>
          </div>
          <ul className="list-disc list-inside text-black text-sm space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="cursor-pointer hover:underline" onClick={() => selectModule(err.moduleIndex)}>
                <span className="font-medium">{err.moduleName}</span>, otázka {err.questionIndex + 1}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Sidebar - Course Outline */}
        <CourseOutlineSidebar
          items={outlineItems}
          onToggle={(index) => {
            const isOpening = !expandedOutlineItems.has(index);
            toggleOutlineItem(index);
            if (isOpening) selectModule(index);
          }}
          onSelect={selectModule}
          renderSubItems={(item, index) => {
            const subItems = (item as typeof outlineItems[number]).subItems;
            if (!subItems || subItems.length === 0) return null;
            return (
              <div className="pb-2">
                {subItems.map((subItem) => (
                  <div
                    key={subItem.id}
                    className="flex items-center gap-1.5 pl-8 pr-4 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToQuestion(index, subItem.questionIndex);
                    }}
                  >
                    <span className="truncate">{subItem.label}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />

        {/* Center Content - Test Editor */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Úprava testu</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {questions.map((question, qIndex) => (
              <div key={question.id} id={`question-${selectedModuleIndex}-${qIndex}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-black mb-2">Otázka {qIndex + 1}</label>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                      placeholder="Zadejte otázku..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(question.id, 'type', e.target.value as 'closed' | 'open')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm bg-white"
                    >
                      <option value="closed">Uzavřená</option>
                      <option value="open">Otevřená</option>
                    </select>
                    <button onClick={() => removeQuestion(question.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {question.type === 'closed' && (
                  <div className="space-y-2 ml-4">
                    {question.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={option.isCorrect}
                          onChange={() => setCorrectOption(question.id, option.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                        />
                        <span className={`w-4 h-4 rounded-full flex-shrink-0 ${option.isCorrect ? 'bg-purple-600' : 'border-2 border-gray-300'}`} />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-black text-sm"
                          placeholder="Možnost odpovědi..."
                        />
                      </div>
                    ))}
                    {question.correctAnswer && (
                      <p className="mt-3 ml-1 text-xs text-green-600">
                        <span className="font-semibold">Správná odpověď:</span> {question.correctAnswer}
                      </p>
                    )}
                  </div>
                )}

                {question.type === 'open' && (
                  <div className="ml-4">
                    <label className="block text-xs text-gray-500 mb-1">Příklad odpovědi</label>
                    <textarea
                      value={question.exampleAnswer || ''}
                      onChange={(e) => updateQuestion(question.id, 'exampleAnswer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-black text-sm resize-none"
                      rows={2}
                      placeholder="Zadejte příklad správné odpovědi..."
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-gray-600 hover:text-purple-600 w-full justify-center"
            >
              <Plus size={16} />
              <span className="text-sm">Přidat otázku</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
            <button type="button" onClick={handleBack} className="text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium">
              Zpět
            </button>
            <div className="flex items-center gap-3">
              {!isLastModule && (
                <button
                  onClick={handleNextModule}
                  className="flex items-center gap-2 px-5 py-2 rounded-md transition-colors text-sm bg-purple-600 text-white hover:bg-purple-700"
                >
                  <span>Pokračovat na modul {selectedModuleIndex + 2}</span>
                </button>
              )}
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-5 py-2 rounded-md transition-colors text-sm bg-green-600 text-white hover:bg-green-700"
              >
                <span>Dokončit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right - Comments panel (only when course has feedbacks from review) */}
        {showCommentsPanel && (
          <div className="w-72 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-black">
                Komentáře{currentModuleFeedbacks.length > 0 && ` (${currentModuleFeedbacks.length})`}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {currentModuleFeedbacks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Žádné komentáře pro tento modul</p>
              ) : (
                currentModuleFeedbacks.map(fb => (
                  <div key={fb.feedbackId} className={`rounded-xl border ${fb.isResolved ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
                    <div className="px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-xs">
                          {fb.author.displayName ?? 'Uživatel'}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleToggleResolve(fb)}
                            disabled={resolvingFeedback === fb.feedbackId}
                            className={`p-0.5 rounded transition-colors ${
                              fb.isResolved
                                ? 'text-green-600 hover:text-green-700'
                                : 'text-gray-300 hover:text-green-500'
                            }`}
                            title={fb.isResolved ? 'Označit jako nevyřešené' : 'Označit jako vyřešené'}
                          >
                            <CheckCircle size={16} />
                          </button>
                        </div>
                      </div>

                      {feedbackContextLabel(fb) && (
                        <p className="text-[10px] text-purple-500 font-medium mb-1">{feedbackContextLabel(fb)}</p>
                      )}

                      <p className="text-gray-700 text-xs leading-relaxed">{fb.feedback}</p>
                    </div>

                    {fb.reply && (
                      <div className="px-3.5 pb-2.5">
                        <div className="ml-3 bg-purple-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-1 mb-0.5">
                            <CornerDownRight size={10} className="text-purple-400" />
                            <span className="text-[10px] text-purple-500 font-medium">Vaše odpověď</span>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">{fb.reply}</p>
                        </div>
                      </div>
                    )}

                    {!fb.reply && (
                      <div className="px-3.5 pb-2.5">
                        {showReplyFor === fb.feedbackId ? (
                          <div>
                            <textarea
                              value={replyTexts[fb.feedbackId] ?? ''}
                              onChange={e => setReplyTexts(prev => ({ ...prev, [fb.feedbackId]: e.target.value }))}
                              rows={2}
                              placeholder="Napište odpověď..."
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
                            />
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => handleReply(fb.feedbackId)}
                                disabled={submittingReply === fb.feedbackId}
                                className="flex-1 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                              >
                                Odeslat
                              </button>
                              <button
                                onClick={() => setShowReplyFor(null)}
                                className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs"
                              >
                                Zrušit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowReplyFor(fb.feedbackId)}
                            className="text-xs text-purple-600 hover:underline flex items-center gap-0.5"
                          >
                            <CornerDownRight size={11} /> Odpovědět
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Vyřešeno: {feedbacks.filter(fb => fb.isResolved).length}/{feedbacks.length}
                </span>
                {allResolved && (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Vše vyřešeno
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseTestsView;
