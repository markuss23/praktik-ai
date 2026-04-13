'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Module, FeedbackItem, Status } from '@/api';
import { UpdateCourseStatusStatusEnum } from '@/api/apis/CoursesApi';
import {
  getCourse,
  getModule,
  getModules,
  getFeedbackSection,
  createFeedback,
  deleteFeedback,
  updateCourseStatus,
  generateCourseEmbeddings,
} from '@/lib/api-client';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  CheckCircle,
  XCircle,
  BookOpenText,
  Dumbbell,
  Send,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  CornerDownRight,
  Check,
} from 'lucide-react';
import { PageSpinner } from '@/components/ui';

type TabType = 'handbook' | 'practice';

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Právě teď';
  if (diffMin < 60) return `Před ${diffMin}m`;
  if (diffHours < 24) return `Před ${diffHours}h`;
  if (diffDays === 1) return 'Před 1 dnem';
  return `Před ${diffDays} dny`;
}

interface ReviewCourseViewProps {
  courseId: number;
}

export function ReviewCourseView({ courseId }: ReviewCourseViewProps) {
  const router = useRouter();
  const { isGuarantor, isSuperAdmin } = useRole();
  const { currentUser } = useCurrentUser();

  // Data state
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [loadingModule, setLoadingModule] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Content navigation
  const [activeTab, setActiveTab] = useState<TabType>('handbook');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  // Feedback state
  const [newFeedbackText, setNewFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState<number | null>(null);

  // Per-module approval state (local only)
  const [approvedModules, setApprovedModules] = useState<Set<number>>(new Set());
  const [rejectedModules, setRejectedModules] = useState<Set<number>>(new Set());

  // Course-level approval state
  const [approvalLoading, setApprovalLoading] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const canApprove = isGuarantor;
  const canAddFeedback = isGuarantor;
  const canDeleteFeedback = (authorId: number) =>
    isSuperAdmin || (isGuarantor && authorId === currentUser?.userId);

  const allModulesApproved = modules.length > 0 && modules.every(m => approvedModules.has(m.moduleId));

  // Load course + modules + first module content + feedbacks
  useEffect(() => {
    async function load() {
      try {
        const [courseData, mods] = await Promise.all([
          getCourse(courseId),
          getModules({ courseId, includeInactive: false }),
        ]);
        setCourse(courseData);
        const activeMods = mods.filter(m => m.isActive);
        setModules(activeMods);

        if (activeMods.length > 0) {
          const firstMod = await getModule(activeMods[0].moduleId);
          setSelectedModule(firstMod);
        }

        try {
          const section = await getFeedbackSection(courseId);
          setFeedbacks(section.feedbacks);
        } catch {
          // feedback may not exist yet
        }
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Nepodařilo se načíst kurz.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const handleSelectModule = async (index: number) => {
    if (index === selectedModuleIndex) return;
    const mod = modules[index];
    if (!mod) return;
    setSelectedModuleIndex(index);
    setActiveTab('handbook');
    setCurrentBlockIndex(0);
    setLoadingModule(true);
    try {
      const full = await getModule(mod.moduleId);
      setSelectedModule(full);
    } catch (err) {
      console.error('Failed to load module:', err);
    } finally {
      setLoadingModule(false);
    }
  };

  const learnBlocks = selectedModule?.learnBlocks ?? [];
  const practiceQuestions = selectedModule?.practiceQuestions ?? [];
  const currentBlock = learnBlocks[currentBlockIndex];
  const totalBlocks = learnBlocks.length;

  const handleContinue = () => {
    if (activeTab === 'handbook') {
      if (currentBlockIndex < totalBlocks - 1) {
        setCurrentBlockIndex(prev => prev + 1);
      } else if (practiceQuestions.length > 0) {
        setActiveTab('practice');
      } else {
        goToNextModule();
      }
    } else {
      goToNextModule();
    }
  };

  const goToNextModule = () => {
    if (selectedModuleIndex < modules.length - 1) {
      handleSelectModule(selectedModuleIndex + 1);
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(prev => prev - 1);
    }
  };

  // Derived state
  const isApproved = course?.status === Status.Approved;
  const isInReview = course?.status === Status.InReview;

  // Per-module approval
  const currentModuleId = selectedModule?.moduleId;
  const currentModuleApproved = currentModuleId ? approvedModules.has(currentModuleId) : false;
  const currentModuleRejected = currentModuleId ? rejectedModules.has(currentModuleId) : false;

  const handleApproveModule = () => {
    if (!currentModuleId) return;
    setApprovedModules(prev => new Set(prev).add(currentModuleId));
    setRejectedModules(prev => {
      const next = new Set(prev);
      next.delete(currentModuleId);
      return next;
    });
  };

  const handleRejectModule = () => {
    if (!currentModuleId) return;
    setRejectedModules(prev => new Set(prev).add(currentModuleId));
    setApprovedModules(prev => {
      const next = new Set(prev);
      next.delete(currentModuleId);
      return next;
    });
  };


  // Feedback filtered by current module
  const currentModuleFeedbacks = selectedModule
    ? feedbacks.filter(fb => fb.moduleId === selectedModule.moduleId)
    : feedbacks;

  // Comment count per module
  const feedbackCountByModule = (moduleId: number) =>
    feedbacks.filter(fb => fb.moduleId === moduleId).length;

  // Build context label for a feedback item
  const feedbackContextLabel = (fb: FeedbackItem) => {
    const parts: string[] = [];
    if (fb.module) parts.push(fb.module.title);
    if (fb.contentType === 'learn_block' && fb.contentRef) {
      parts.push(`Příručka – str. ${fb.contentRef}`);
    } else if (fb.contentType === 'practice' && fb.contentRef) {
      parts.push(`Procvičování – ot. ${fb.contentRef}`);
    }
    return parts.length > 0 ? parts.join(' / ') : null;
  };

  // Feedback handlers
  const handleAddFeedback = async () => {
    if (!newFeedbackText.trim() || !selectedModule) return;
    setSubmittingFeedback(true);
    try {
      const contentRef = activeTab === 'handbook'
        ? String(currentBlockIndex + 1)
        : undefined;
      const item = await createFeedback(selectedModule.moduleId, newFeedbackText.trim(), {
        contentType: activeTab === 'handbook' ? 'learn_block' : 'practice',
        contentRef,
      });
      setFeedbacks(prev => [...prev, item]);
      setNewFeedbackText('');
    } catch (err) {
      console.error('Failed to add feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: number) => {
    setDeletingFeedback(feedbackId);
    try {
      await deleteFeedback(feedbackId);
      setFeedbacks(prev => prev.filter(fb => fb.feedbackId !== feedbackId));
    } catch (err) {
      console.error('Failed to delete feedback:', err);
    } finally {
      setDeletingFeedback(null);
    }
  };

  // Course-level approval handlers
  const handleApproveCourse = async () => {
    if (!course) return;
    setApprovalLoading(true);
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.Approved);
      await generateCourseEmbeddings(courseId).catch(() => {});
      setCourse(prev => prev ? { ...prev, status: Status.Approved } : prev);
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectCourse = async () => {
    if (!course) return;
    setApprovalLoading(true);
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.Edited);
      router.push('/admin/review');
    } catch (err) {
      console.error('Failed to reject:', err);
      setApprovalLoading(false);
    }
  };

  if (loading) {
    return <PageSpinner message="Načítání kurzu…" />;
  }

  if (error || !course) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error ?? 'Kurz nebyl nalezen.'}</p>
          <button onClick={() => router.push('/admin/review')} className="text-purple-600 hover:underline">
            ← Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">
            <button onClick={() => router.push('/admin/review')} className="hover:text-gray-700">
              Ke schválení
            </button>
            {' / '}
            <span className="text-gray-700">{course.title}</span>
          </p>
          <h1 className="text-xl font-bold text-black">Obsah ke schválení</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Guarantor: approve/reject course (only in_review) */}
          {canApprove && isInReview && (
            <>
              <button
                onClick={handleRejectCourse}
                disabled={approvalLoading}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <ThumbsDown size={16} />
                Zamítnout kurz
              </button>
              <button
                onClick={handleApproveCourse}
                disabled={approvalLoading || !allModulesApproved}
                title={!allModulesApproved ? 'Nejprve schvalte všechny moduly' : undefined}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsUp size={16} />
                Schválit kurz
              </button>
            </>
          )}
          {/* Status badges */}
          {isApproved && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
              <CheckCircle size={15} />
              Schváleno
            </span>
          )}
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* Left: Module sidebar */}
        <div className="w-56 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-black">Osnova kurzu</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {modules.map((mod, idx) => {
              const modApproved = approvedModules.has(mod.moduleId);
              const modRejected = rejectedModules.has(mod.moduleId);
              return (
                <button
                  key={mod.moduleId}
                  onClick={() => handleSelectModule(idx)}
                  className={`w-full text-left px-3 py-3 text-sm transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-2 ${
                    selectedModuleIndex === idx
                      ? 'bg-purple-50 border-l-4 border-l-purple-600 font-medium text-black'
                      : 'hover:bg-gray-50 text-gray-700 border-l-4 border-l-transparent'
                  }`}
                >
                  {modApproved && (
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </span>
                  )}
                  {modRejected && (
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                      <XCircle size={10} className="text-white" />
                    </span>
                  )}
                  <span className="truncate flex-1">{mod.title}</span>
                  {feedbackCountByModule(mod.moduleId) > 0 && (
                    <span className="flex-shrink-0 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {feedbackCountByModule(mod.moduleId)}
                    </span>
                  )}
                </button>
              );
            })}
            {modules.length === 0 && (
              <p className="p-3 text-xs text-gray-400 text-center">Žádné moduly</p>
            )}
          </div>
        </div>

        {/* Center: Module content */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden min-w-0">
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="font-semibold text-black mb-3">
              {selectedModule?.title ?? 'Výběr modulu'}
            </h2>
            {/* Tabs — freely switchable */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('handbook')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'handbook'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BookOpenText size={14} />
                Příručka
              </button>
              <button
                onClick={() => setActiveTab('practice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'practice'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Dumbbell size={14} />
                Procvičování
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadingModule ? (
              <PageSpinner />
            ) : activeTab === 'handbook' ? (
              /* ===== HANDBOOK TAB ===== */
              currentBlock ? (
                <>
                  <div className="mb-4">
                    <span className="text-xs text-gray-500">
                      Stránka {currentBlockIndex + 1} z {totalBlocks}
                    </span>
                  </div>
                  <div
                    ref={contentRef}
                    className="module-content prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentBlock.content }}
                  />
                </>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <BookOpenText size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Obsah příručky není k dispozici</p>
                </div>
              )
            ) : (
              /* ===== PRACTICE TAB ===== */
              <div className="space-y-6">
                {practiceQuestions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Dumbbell size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Žádné otázky k procvičování</p>
                  </div>
                ) : (
                  practiceQuestions.map((q, idx) => (
                    <div key={q.questionId} className="pb-5 border-b border-gray-100 last:border-b-0">
                          <div className="mb-3">
                            <p className="font-semibold text-gray-800 text-sm">
                              <span className="text-purple-600 mr-1">{idx + 1}.</span>
                              {q.question}
                            </p>
                          </div>
                          {q.questionType === 'closed' && (
                            <div className="space-y-2 ml-4">
                              {(q.closedOptions ?? []).map(opt => {
                                const isCorrect = q.correctAnswer != null && opt.text === q.correctAnswer;
                                return (
                                  <div
                                    key={opt.optionId}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                                      isCorrect
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-200 bg-white'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                      isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                    }`}>
                                      {isCorrect && <Check size={10} className="text-white" />}
                                    </div>
                                    <span className={`text-sm ${isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                                      {opt.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {q.questionType === 'open' && (
                            <div className="ml-4 space-y-2">
                              {q.exampleAnswer && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-xs text-green-600 font-medium mb-1">Příklad odpovědi:</p>
                                  <p className="text-sm text-green-800">{q.exampleAnswer}</p>
                                </div>
                              )}
                              {q.correctAnswer && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-xs text-green-600 font-medium mb-1">Správná odpověď:</p>
                                  <p className="text-sm text-green-800">{q.correctAnswer}</p>
                                </div>
                              )}
                              {q.openKeywords && q.openKeywords.length > 0 && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <p className="text-xs text-blue-600 font-medium mb-1">Klíčová slova:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {q.openKeywords.map(kw => (
                                      <span key={kw.keywordId} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                        {kw.keyword}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!q.exampleAnswer && !q.correctAnswer && (!q.openKeywords || q.openKeywords.length === 0) && (
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <p className="text-xs text-gray-500">Odpověď nebyla nastavena</p>
                                </div>
                              )}
                            </div>
                          )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer navigation + per-module approval */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevBlock}
                disabled={activeTab !== 'handbook' || currentBlockIndex === 0}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                ← Předchozí
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Per-module approve/reject (guarantors only, in_review only) */}
              {canApprove && isInReview && selectedModule && (
                <>
                  {currentModuleApproved ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle size={13} />
                      Modul schválen
                    </span>
                  ) : currentModuleRejected ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
                      <XCircle size={13} />
                      Modul zamítnut
                    </span>
                  ) : null}
                  <button
                    onClick={handleRejectModule}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                      currentModuleRejected
                        ? 'border-red-400 bg-red-100 text-red-700'
                        : 'border-red-300 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <ThumbsDown size={13} />
                    Zamítnout modul
                  </button>
                  <button
                    onClick={handleApproveModule}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      currentModuleApproved
                        ? 'bg-green-700 text-white'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <ThumbsUp size={13} />
                    Schválit modul
                  </button>
                </>
              )}

              <button
                onClick={handleContinue}
                disabled={selectedModuleIndex >= modules.length - 1 && (activeTab === 'practice' || practiceQuestions.length === 0) && currentBlockIndex >= totalBlocks - 1}
                className="flex items-center gap-2 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#00C896' }}
              >
                {activeTab === 'handbook' && currentBlockIndex < totalBlocks - 1
                  ? 'Pokračovat'
                  : selectedModuleIndex < modules.length - 1
                  ? 'Další modul'
                  : 'Dokončit'}
                →
              </button>
            </div>
          </div>
        </div>

        {/* Right: Comments panel */}
        <div className="w-72 flex-shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
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
                <div key={fb.feedbackId}>
                  {/* Feedback bubble */}
                  <div className="bg-gray-100 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-xs">
                        {fb.author.displayName ?? 'Uživatel'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[11px] text-gray-400">{timeAgo(fb.createdAt)}</span>
                        {canDeleteFeedback(fb.author.userId) && !fb.reply && (
                          <button
                            onClick={() => handleDeleteFeedback(fb.feedbackId)}
                            disabled={deletingFeedback === fb.feedbackId}
                            className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    {feedbackContextLabel(fb) && (
                      <p className="text-[10px] text-purple-500 font-medium mb-1">{feedbackContextLabel(fb)}</p>
                    )}
                    <p className="text-gray-700 text-xs leading-relaxed">{fb.feedback}</p>
                  </div>

                  {/* Reply bubble */}
                  {fb.reply && (
                    <div className="ml-4 mt-1.5">
                      <div className="bg-purple-50 rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <CornerDownRight size={10} className="text-purple-400" />
                          <span className="text-[11px] text-purple-500 font-medium">Odpověď</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{fb.reply}</p>
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* Add comment (in_review only — API requires in_review status) */}
          {canAddFeedback && isInReview && (
            <div className="p-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-2">
                <textarea
                  value={newFeedbackText}
                  onChange={e => setNewFeedbackText(e.target.value)}
                  rows={2}
                  placeholder="Přidat komentář..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddFeedback();
                    }
                  }}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
                <button
                  onClick={handleAddFeedback}
                  disabled={!newFeedbackText.trim() || submittingFeedback}
                  className="self-end p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Info for non-commentable states */}
          {isApproved && (
            <div className="p-3 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">Kurz je schválený – komentáře jsou uzavřeny.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewCourseView;
