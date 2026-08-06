'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
import { REVIEW_COUNT_EVENT } from '@/components/admin/AdminSidebar';
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
  // Po schválení ukážeme krátkou přechodovou animaci a teprve pak naviguju
  // zpět na seznam — bez tohoto skoku by se UI změnilo skokem.
  const [approvedTransition, setApprovedTransition] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Reviewers can't approve courses they own — back-end enforces this too,
  // but the UI must hide approve/reject controls regardless.
  const isOwnCourse = !!course && course.ownerId === currentUser?.userId;
  const canApprove = isGuarantor && !isOwnCourse;
  const canAddFeedback = isGuarantor && !isOwnCourse;
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
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
      // Krátká success animace, pak skok zpět na výchozí stránku schvalování.
      setApprovedTransition(true);
      setTimeout(() => router.push('/admin/review'), 1400);
    } catch (err) {
      console.error('Failed to approve:', err);
      setApprovalLoading(false);
    }
  };

  const handleRejectCourse = async () => {
    if (!course) return;
    setApprovalLoading(true);
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.Edited);
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
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
          <p className="text-destructive mb-4">{error ?? 'Kurz nebyl nalezen.'}</p>
          <button onClick={() => router.push('/admin/review')} className="text-gradient-r hover:underline">
            ← Zpět na přehled
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-muted overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            <button onClick={() => router.push('/admin/review')} className="hover:text-foreground">
              Ke schválení
            </button>
            {' / '}
            <span className="text-foreground">{course.title}</span>
          </p>
          <h1 className="text-xl font-bold text-foreground">Obsah ke schválení</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Guarantor: approve/reject course (only in_review) */}
          {canApprove && isInReview && (
            <>
              <button
                onClick={handleRejectCourse}
                disabled={approvalLoading}
                className="flex items-center gap-2 px-4 py-2 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <ThumbsDown size={16} />
                Zamítnout kurz
              </button>
              <button
                onClick={handleApproveCourse}
                disabled={approvalLoading || !allModulesApproved}
                title={!allModulesApproved ? 'Nejprve schvalte všechny moduly' : undefined}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsUp size={16} />
                Schválit kurz
              </button>
            </>
          )}
          {/* Status badges */}
          {isApproved && (
            <span className="flex items-center gap-1.5 px-3 py-2 bg-success/10 text-success rounded-lg text-sm font-medium border border-success/30">
              <CheckCircle size={15} />
              Schváleno
            </span>
          )}
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">

        {/* Left: Module sidebar */}
        <div className="w-56 shrink-0 bg-card rounded-lg border border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Osnova kurzu</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {modules.map((mod, idx) => {
              const modApproved = approvedModules.has(mod.moduleId);
              const modRejected = rejectedModules.has(mod.moduleId);
              return (
                <button
                  key={mod.moduleId}
                  onClick={() => handleSelectModule(idx)}
                  className={`w-full text-left px-3 py-3 text-sm transition-colors border-b border-border last:border-b-0 flex items-center gap-2 ${
                    selectedModuleIndex === idx
                      ? 'bg-gradient-r/10 border-l-4 border-l-purple-600 font-medium text-foreground'
                      : 'hover:bg-muted/50 text-foreground border-l-4 border-l-transparent'
                  }`}
                >
                  {modApproved && (
                    <span className="shrink-0 size-4 rounded-full bg-primary flex items-center justify-center">
                      <Check size={10} className="text-primary-foreground" />
                    </span>
                  )}
                  {modRejected && (
                    <span className="shrink-0 size-4 rounded-full bg-destructive flex items-center justify-center">
                      <XCircle size={10} className="text-primary-foreground" />
                    </span>
                  )}
                  <span className="truncate flex-1">{mod.title}</span>
                  {feedbackCountByModule(mod.moduleId) > 0 && (
                    <span className="shrink-0 bg-brand-accent text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {feedbackCountByModule(mod.moduleId)}
                    </span>
                  )}
                </button>
              );
            })}
            {modules.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground text-center">Žádné moduly</p>
            )}
          </div>
        </div>

        {/* Center: Module content */}
        <div className="flex-1 bg-card rounded-lg border border-border flex flex-col overflow-hidden min-w-0">
          <div className="p-4 border-b border-border shrink-0">
            <h2 className="font-semibold text-foreground mb-3">
              {selectedModule?.title ?? 'Výběr modulu'}
            </h2>
            {/* Tabs — freely switchable */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('handbook')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'handbook'
                    ? 'bg-gradient-r text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <BookOpenText size={14} />
                Příručka
              </button>
              <button
                onClick={() => setActiveTab('practice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'practice'
                    ? 'bg-gradient-r text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
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
                    <span className="text-xs text-muted-foreground">
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
                <div className="text-center py-16 text-muted-foreground">
                  <BookOpenText size={40} className="mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Obsah příručky není k dispozici</p>
                </div>
              )
            ) : (
              /* ===== PRACTICE TAB ===== */
              <div className="space-y-6">
                {practiceQuestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Dumbbell size={40} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium">Žádné otázky k procvičování</p>
                  </div>
                ) : (
                  practiceQuestions.map((q, idx) => (
                    <div key={q.questionId} className="pb-5 border-b border-border last:border-b-0">
                          <div className="mb-3">
                            <p className="font-semibold text-foreground text-sm">
                              <span className="text-gradient-r mr-1">{idx + 1}.</span>
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
                                        ? 'border-success/30 bg-success/10'
                                        : 'border-border bg-card'
                                    }`}
                                  >
                                    <div className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                      isCorrect ? 'border-success/30 bg-primary' : 'border-border'
                                    }`}>
                                      {isCorrect && <Check size={10} className="text-primary-foreground" />}
                                    </div>
                                    <span className={`text-sm ${isCorrect ? 'text-success font-medium' : 'text-foreground'}`}>
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
                                <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                                  <p className="text-xs text-success font-medium mb-1">Příklad odpovědi:</p>
                                  <p className="text-sm text-success">{q.exampleAnswer}</p>
                                </div>
                              )}
                              {q.correctAnswer && (
                                <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                                  <p className="text-xs text-success font-medium mb-1">Správná odpověď:</p>
                                  <p className="text-sm text-success">{q.correctAnswer}</p>
                                </div>
                              )}
                              {q.openKeywords && q.openKeywords.length > 0 && (
                                <div className="p-3 bg-tip/10 border border-tip/30 rounded-lg">
                                  <p className="text-xs text-tip font-medium mb-1">Klíčová slova:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {q.openKeywords.map(kw => (
                                      <span key={kw.keywordId} className="px-2 py-0.5 bg-tip/20 text-tip rounded text-xs">
                                        {kw.keyword}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!q.exampleAnswer && !q.correctAnswer && (!q.openKeywords || q.openKeywords.length === 0) && (
                                <div className="p-3 bg-muted/50 border border-border rounded-lg">
                                  <p className="text-xs text-muted-foreground">Odpověď nebyla nastavena</p>
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
          <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevBlock}
                disabled={activeTab !== 'handbook' || currentBlockIndex === 0}
                className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                ← Předchozí
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Per-module approve/reject (guarantors only, in_review only) */}
              {canApprove && isInReview && selectedModule && (
                <>
                  {currentModuleApproved ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success bg-success/10 border border-success/30 rounded-lg">
                      <CheckCircle size={13} />
                      Modul schválen
                    </span>
                  ) : currentModuleRejected ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg">
                      <XCircle size={13} />
                      Modul zamítnut
                    </span>
                  ) : null}
                  <button
                    onClick={handleRejectModule}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                      currentModuleRejected
                        ? 'border-destructive/30 bg-destructive/20 text-destructive'
                        : 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    }`}
                  >
                    <ThumbsDown size={13} />
                    Zamítnout modul
                  </button>
                  <button
                    onClick={handleApproveModule}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      currentModuleApproved
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary text-primary-foreground hover:bg-primary/80'
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
                className="flex items-center gap-2 text-primary-foreground font-semibold py-2 px-5 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--primary)' }}
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
        <div className="w-72 shrink-0 bg-card rounded-lg border border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Komentáře{currentModuleFeedbacks.length > 0 && ` (${currentModuleFeedbacks.length})`}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {currentModuleFeedbacks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Žádné komentáře pro tento modul</p>
            ) : (
              currentModuleFeedbacks.map(fb => (
                <div key={fb.feedbackId}>
                  {/* Feedback bubble */}
                  <div className="bg-muted rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-foreground text-xs">
                        {fb.author.displayName ?? 'Uživatel'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-muted-foreground">{timeAgo(fb.createdAt)}</span>
                        {canDeleteFeedback(fb.author.userId) && !fb.reply && (
                          <button
                            onClick={() => handleDeleteFeedback(fb.feedbackId)}
                            disabled={deletingFeedback === fb.feedbackId}
                            className="p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    {feedbackContextLabel(fb) && (
                      <p className="text-[10px] text-gradient-r font-medium mb-1">{feedbackContextLabel(fb)}</p>
                    )}
                    <p className="text-foreground text-xs leading-relaxed">{fb.feedback}</p>
                  </div>

                  {/* Reply bubble */}
                  {fb.reply && (
                    <div className="ml-4 mt-1.5">
                      <div className="bg-gradient-r/10 rounded-xl px-3.5 py-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <CornerDownRight size={10} className="text-gradient-r" />
                          <span className="text-[11px] text-gradient-r font-medium">Odpověď</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{fb.reply}</p>
                      </div>
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* Add comment (in_review only — API requires in_review status) */}
          {canAddFeedback && isInReview && (
            <div className="p-3 border-t border-border shrink-0">
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
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 resize-none"
                />
                <button
                  onClick={handleAddFeedback}
                  disabled={!newFeedbackText.trim() || submittingFeedback}
                  className="self-end p-2 bg-gradient-r text-primary-foreground rounded-full hover:bg-gradient-r/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Info for non-commentable states */}
          {isApproved && (
            <div className="p-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">Kurz je schválený – komentáře jsou uzavřeny.</p>
            </div>
          )}
        </div>
      </div>

      {/* Přechodová animace po schválení kurzu — překryje obsah a po krátké
          chvíli se naviguje zpět na seznam ke schválení. */}
      <AnimatePresence>
        {approvedTransition && (
          <motion.div
            key="approved-transition"
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="absolute inset-0 bg-card/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-2xl bg-card shadow-xl border border-success/30"
              initial={{ scale: 0.85, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 14, delay: 0.1 }}
                className="size-16 rounded-full bg-success/20 flex items-center justify-center"
              >
                <CheckCircle size={36} className="text-success" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">Kurz schválen</p>
                <p className="text-sm text-muted-foreground mt-1">Vracím vás na přehled…</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReviewCourseView;
