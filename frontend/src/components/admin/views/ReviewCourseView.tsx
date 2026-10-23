'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { PageSpinner, Button, Tabs, TabsList, TabsTrigger, Textarea, CourseCategories, ModuleCategories } from '@/components/ui';
import { timeAgo, BTN_KEEP_BOX, cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { COURSE_SUMMARY_FEEDBACK, isCourseSummaryFeedback, reviewFeedbackLabel } from '@/lib/review-feedback';
import { ReviewCourseSummary } from '@/components/admin/ReviewCourseSummary';
import { CommentsDrawer } from '@/components/admin/ReviewComments';
import { CommentsToggle } from '@/components/admin/CoursePageHeader';

// Plný (ne podtržený) aktivní stav — kitový `line` variant kreslí podtržení
// a průhledné pozadí, obojí přebíjíme stejným modifikátorem.
const MODULE_TAB = [
  'flex-none gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
  'text-muted-foreground hover:bg-muted',
  'group-data-[variant=line]/tabs-list:data-active:bg-gradient-r data-active:text-primary-foreground',
  'group-data-[variant=line]/tabs-list:data-active:after:opacity-0',
  "[&_svg:not([class*='size-'])]:size-auto",
].join(' ');

type TabType = 'handbook' | 'practice';

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
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Garant zkusil zamítnout kurz bez komentáře — panel ukáže výzvu ho napsat
  const [rejectNeedsComment, setRejectNeedsComment] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState<number | null>(null);

  // Krok 1 = souhrn kurzu (popis, zařazení, obrázek), další kroky = moduly.
  const [showSummary, setShowSummary] = useState(true);
  const [summaryReview, setSummaryReview] = useState<'approved' | 'rejected' | null>(null);

  // Per-module approval state (local only)
  const [approvedModules, setApprovedModules] = useState<Set<number>>(new Set());
  const [rejectedModules, setRejectedModules] = useState<Set<number>>(new Set());

  // Course-level approval state
  const [approvalLoading, setApprovalLoading] = useState(false);
  // Po schválení ukážeme krátkou přechodovou animaci a teprve pak naviguju
  // zpět na seznam — bez tohoto skoku by se UI změnilo skokem.
  const [approvedTransition, setApprovedTransition] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  // Panel komentářů začíná pod hlavičkou, ať Schválit / Zamítnout zůstanou vidět
  const headerRef = useRef<HTMLDivElement>(null);

  // Reviewers can't approve courses they own — back-end enforces this too,
  // but the UI must hide approve/reject controls regardless.
  const isOwnCourse = !!course && course.ownerId === currentUser?.userId;
  const canApprove = isGuarantor && !isOwnCourse;
  const canAddFeedback = isGuarantor && !isOwnCourse;
  const canDeleteFeedback = (authorId: number) =>
    isSuperAdmin || (isGuarantor && authorId === currentUser?.userId);

  const allModulesApproved = modules.length > 0 && modules.every(m => approvedModules.has(m.moduleId));
  const allStepsApproved = summaryReview === 'approved' && allModulesApproved;
  // Souhrn + jeden krok na modul
  const totalSteps = 1 + modules.length;
  const approvedSteps = (summaryReview === 'approved' ? 1 : 0) + modules.filter(m => approvedModules.has(m.moduleId)).length;

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
    setShowSummary(false);
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
  const currentBlockHtml = useMemo(() => sanitizeHtml(currentBlock?.content ?? ''), [currentBlock?.content]);
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


  // Komentáře k souhrnu jsou uložené u prvního modulu, ale patří ke kroku souhrnu
  const summaryFeedbacks = feedbacks.filter(isCourseSummaryFeedback);
  const moduleFeedbacks = feedbacks.filter(fb => !isCourseSummaryFeedback(fb));

  // Feedback filtered by current step
  const currentModuleFeedbacks = showSummary
    ? summaryFeedbacks
    : selectedModule
      ? moduleFeedbacks.filter(fb => fb.moduleId === selectedModule.moduleId)
      : moduleFeedbacks;

  // Comment count per module
  const feedbackCountByModule = (moduleId: number) =>
    moduleFeedbacks.filter(fb => fb.moduleId === moduleId).length;

  // Build context label for a feedback item
  const feedbackContextLabel = (fb: FeedbackItem) => reviewFeedbackLabel(fb, { withModule: true });

  // Feedback handlers
  const handleAddFeedback = async () => {
    if (!newFeedbackText.trim()) return;
    // Komentář k souhrnu se ukládá k prvnímu modulu (backend modul vyžaduje)
    const targetModuleId = showSummary ? modules[0]?.moduleId : selectedModule?.moduleId;
    if (!targetModuleId) return;
    setSubmittingFeedback(true);
    try {
      const item = await createFeedback(
        targetModuleId,
        newFeedbackText.trim(),
        showSummary
          ? { contentType: COURSE_SUMMARY_FEEDBACK }
          : {
              contentType: activeTab === 'handbook' ? 'learn_block' : 'practice',
              contentRef: activeTab === 'handbook' ? String(currentBlockIndex + 1) : undefined,
            },
      );
      setFeedbacks(prev => [...prev, item]);
      setNewFeedbackText('');
      setRejectNeedsComment(false);
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

  // Zamítnout jde jen s aspoň jedním nevyřešeným komentářem — autor jinak neví, co opravit.
  // Kurz bez modulů komentář uložit nemůže (backend ho váže k modulu), ten jde zamítnout i bez něj.
  const unresolvedFeedbackCount = feedbacks.filter(fb => !fb.isResolved).length;
  const handleRejectCourse = async () => {
    if (!course) return;
    if (unresolvedFeedbackCount === 0 && modules.length > 0) {
      setRejectNeedsComment(true);
      setCommentsOpen(true);
      return;
    }
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
          <Button variant="plain" onClick={() => router.push('/admin/review')} className={cn(BTN_KEEP_BOX, "text-gradient-r hover:underline")}>
            ← Zpět na přehled
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-muted overflow-hidden">
      {/* Header */}
      <div ref={headerRef} className="bg-card border-b border-border px-4 sm:px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5 break-words">
            <Button variant="plain" onClick={() => router.push('/admin/review')} className={cn(BTN_KEEP_BOX, "hover:text-foreground")}>
              Ke schválení
            </Button>
            {' / '}
            <span className="text-foreground">{course.title}</span>
          </p>
          <h1 className="text-xl font-bold text-foreground">Obsah ke schválení</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CommentsToggle
            onClick={() => setCommentsOpen(open => !open)}
            count={currentModuleFeedbacks.filter(fb => !fb.isResolved).length}
            open={commentsOpen}
          />
          {/* Guarantor: approve/reject course (only in_review) */}
          {canApprove && isInReview && (
            <>
              <Button
                variant="ghost-destructive"
                onClick={handleRejectCourse}
                disabled={approvalLoading}
                className={cn(BTN_KEEP_BOX, "flex flex-1 lg:flex-none items-center gap-2 px-4 py-2 border border-destructive/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50")}
              >
                <ThumbsDown size={16} />
                Zamítnout kurz
              </Button>
              <Button
                variant="default"
                onClick={handleApproveCourse}
                disabled={approvalLoading || !allStepsApproved}
                title={!allStepsApproved ? 'Nejprve schvalte souhrn kurzu a všechny moduly' : undefined}
                className={cn(BTN_KEEP_BOX, "flex flex-1 lg:flex-none items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed")}
              >
                <ThumbsUp size={16} />
                Schválit kurz
              </Button>
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
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-3 sm:p-4 gap-3 sm:gap-4">

        {/* Left: Module sidebar */}
        <div className="max-h-64 lg:max-h-none lg:w-56 shrink-0 bg-card rounded-lg border border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Osnova kurzu</h2>
            {isInReview && (
              <span className="text-xs text-muted-foreground" title="Schválené kroky">
                {approvedSteps}/{totalSteps}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Krok 1: souhrn kurzu */}
            <Button
              variant="plain"
              onClick={() => setShowSummary(true)}
              className={cn(BTN_KEEP_BOX, `w-full text-left px-3 py-3 text-sm transition-colors border-b border-border flex items-center gap-2 ${
                showSummary
                  ? 'bg-gradient-r/10 border-l-4 border-l-purple-600 font-medium text-foreground'
                  : 'hover:bg-muted/50 text-foreground border-l-4 border-l-transparent'
              }`)}
            >
              <StepMarker approved={summaryReview === 'approved'} rejected={summaryReview === 'rejected'} />
              <span className="truncate flex-1">Souhrn kurzu</span>
              {summaryFeedbacks.length > 0 && (
                <span className="shrink-0 bg-brand-accent text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {summaryFeedbacks.length}
                </span>
              )}
            </Button>
            {modules.map((mod, idx) => {
              const modApproved = approvedModules.has(mod.moduleId);
              const modRejected = rejectedModules.has(mod.moduleId);
              return (
                <Button
                  variant="plain"
                  key={mod.moduleId}
                  onClick={() => handleSelectModule(idx)}
                  className={cn(BTN_KEEP_BOX, `w-full text-left px-3 py-3 text-sm transition-colors border-b border-border last:border-b-0 flex items-center gap-2 ${
                    !showSummary && selectedModuleIndex === idx
                      ? 'bg-gradient-r/10 border-l-4 border-l-purple-600 font-medium text-foreground'
                      : 'hover:bg-muted/50 text-foreground border-l-4 border-l-transparent'
                  }`)}
                >
                  <StepMarker approved={modApproved} rejected={modRejected} />
                  <span className="truncate flex-1">{mod.title}</span>
                  {feedbackCountByModule(mod.moduleId) > 0 && (
                    <span className="shrink-0 bg-brand-accent text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {feedbackCountByModule(mod.moduleId)}
                    </span>
                  )}
                </Button>
              );
            })}
            {modules.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground text-center">Žádné moduly</p>
            )}
          </div>
        </div>

        {/* Center: souhrn kurzu (krok 1) nebo obsah modulu */}
        <div className="flex-1 bg-card rounded-lg border border-border flex flex-col overflow-hidden min-w-0">
          {showSummary ? (
          <>
          <div className="p-4 border-b border-border shrink-0">
            <p className="text-xs text-muted-foreground mb-0.5">Krok 1 z {totalSteps}</p>
            <h2 className="font-semibold text-foreground">Souhrn kurzu</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Zkontrolujte popis, zařazení a náhledový obrázek kurzu.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <ReviewCourseSummary course={course} modulesCount={modules.length} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border shrink-0">
            {canApprove && isInReview && (
              <>
                {summaryReview === 'approved' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success bg-success/10 border border-success/30 rounded-lg">
                    <CheckCircle size={13} />
                    Souhrn schválen
                  </span>
                ) : summaryReview === 'rejected' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg">
                    <XCircle size={13} />
                    Souhrn zamítnut
                  </span>
                ) : null}
                <Button
                  variant="plain"
                  onClick={() => setSummaryReview('rejected')}
                  className={cn(BTN_KEEP_BOX, `flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                    summaryReview === 'rejected'
                      ? 'border-destructive/30 bg-destructive/20 text-destructive'
                      : 'border-destructive/30 text-destructive hover:bg-destructive/10'
                  }`)}
                >
                  <ThumbsDown size={13} />
                  Zamítnout souhrn
                </Button>
                <Button
                  variant="plain"
                  onClick={() => setSummaryReview('approved')}
                  className={cn(BTN_KEEP_BOX, "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/80")}
                >
                  <ThumbsUp size={13} />
                  Schválit souhrn
                </Button>
              </>
            )}
            <Button
              variant="plain"
              onClick={() => handleSelectModule(0)}
              disabled={modules.length === 0}
              className={cn(BTN_KEEP_BOX, "flex items-center gap-2 text-primary-foreground font-semibold py-2 px-5 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed")}
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Další krok →
            </Button>
          </div>
          </>
          ) : (
          <>
          <div className="p-4 border-b border-border shrink-0">
            <p className="text-xs text-muted-foreground mb-0.5">Krok {selectedModuleIndex + 2} z {totalSteps}</p>
            <h2 className="font-semibold text-foreground mb-3">
              {selectedModule?.title ?? 'Výběr modulu'}
            </h2>
            {selectedModule?.perex && (
              <p className="text-sm text-muted-foreground -mt-1 mb-3 break-words">{selectedModule.perex}</p>
            )}
            {/* Zařazení kurzu i vybraného modulu — garant ho při schvalování kontroluje */}
            <details className="mb-3 text-sm">
              <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                Zařazení kurzu a modulu
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Kurz</p>
                  <CourseCategories course={course} />
                </div>
                {selectedModule && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Modul</p>
                    <ModuleCategories module={selectedModule} />
                  </div>
                )}
              </div>
            </details>
            {/* Tabs — freely switchable */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'handbook' | 'practice')}
              className="gap-0"
            >
              <TabsList variant="line" className="gap-2 p-0 group-data-horizontal/tabs:h-auto">
                <TabsTrigger value="handbook" className={MODULE_TAB}>
                  <BookOpenText size={14} />
                  Příručka
                </TabsTrigger>
                <TabsTrigger value="practice" className={MODULE_TAB}>
                  <Dumbbell size={14} />
                  Procvičování
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                    dangerouslySetInnerHTML={{ __html: currentBlockHtml }}
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
          <div className="flex flex-wrap items-center justify-between gap-y-3 px-4 sm:px-6 py-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="plain"
                onClick={handlePrevBlock}
                disabled={activeTab !== 'handbook' || currentBlockIndex === 0}
                className={cn(BTN_KEEP_BOX, "text-sm font-medium text-muted-foreground hover:text-foreground disabled:text-muted-foreground disabled:cursor-not-allowed")}
              >
                ← Předchozí
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
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
                  <Button
                    variant="plain"
                    onClick={handleRejectModule}
                    className={cn(BTN_KEEP_BOX, `flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
                      currentModuleRejected
                        ? 'border-destructive/30 bg-destructive/20 text-destructive'
                        : 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    }`)}
                  >
                    <ThumbsDown size={13} />
                    Zamítnout modul
                  </Button>
                  <Button
                    variant="plain"
                    onClick={handleApproveModule}
                    className={cn(BTN_KEEP_BOX, `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      currentModuleApproved
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary text-primary-foreground hover:bg-primary/80'
                    }`)}
                  >
                    <ThumbsUp size={13} />
                    Schválit modul
                  </Button>
                </>
              )}

              <Button
                variant="plain"
                onClick={handleContinue}
                disabled={selectedModuleIndex >= modules.length - 1 && (activeTab === 'practice' || practiceQuestions.length === 0) && currentBlockIndex >= totalBlocks - 1}
                className={cn(BTN_KEEP_BOX, "flex items-center gap-2 text-primary-foreground font-semibold py-2 px-5 rounded-lg text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed")}
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {activeTab === 'handbook' && currentBlockIndex < totalBlocks - 1
                  ? 'Pokračovat'
                  : selectedModuleIndex < modules.length - 1
                  ? 'Další modul'
                  : 'Dokončit'}
                →
              </Button>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Komentáře — panel vyjíždí zprava přes obsah, garant může dál číst modul */}
        <CommentsDrawer
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          anchorRef={headerRef}
          title={`Komentáře${currentModuleFeedbacks.length > 0 ? ` (${currentModuleFeedbacks.length})` : ''}`}
          subtitle={showSummary ? 'Souhrn kurzu' : selectedModule ? `Modul: ${selectedModule.title}` : undefined}
          footer={
            canAddFeedback && isInReview && modules.length > 0 ? (
              // Add comment (in_review only — API requires in_review status).
              // Kurz bez modulů nemá kam komentář k souhrnu uložit.
              <div className="flex flex-col gap-2">
                {rejectNeedsComment && (
                  <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    Před zamítnutím kurzu napište aspoň jeden komentář, ať autor ví, co má opravit.
                  </p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={newFeedbackText}
                    onChange={e => setNewFeedbackText(e.target.value)}
                    rows={2}
                    placeholder="Přidat komentář..."
                    aria-label="Nový komentář"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddFeedback();
                      }
                    }}
                    className={cn("field-sizing-fixed min-h-0", "flex-1 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 resize-none")}
                  />
                  <Button
                    variant="brand-solid"
                    onClick={handleAddFeedback}
                    disabled={!newFeedbackText.trim() || submittingFeedback}
                    aria-label="Odeslat komentář"
                    className={cn(BTN_KEEP_BOX, "self-end p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0")}
                  >
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            ) : isApproved ? (
              <p className="text-xs text-muted-foreground text-center">Kurz je schválený – komentáře jsou uzavřeny.</p>
            ) : undefined
          }
        >
          {currentModuleFeedbacks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {showSummary ? 'Žádné komentáře k souhrnu kurzu' : 'Žádné komentáře pro tento modul'}
            </p>
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
                        <Button
                          variant="plain"
                          onClick={() => handleDeleteFeedback(fb.feedbackId)}
                          disabled={deletingFeedback === fb.feedbackId}
                          aria-label="Smazat komentář"
                          className={cn(BTN_KEEP_BOX, "p-0.5 text-muted-foreground hover:text-destructive transition-colors")}
                        >
                          <Trash2 size={11} />
                        </Button>
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
        </CommentsDrawer>
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

/** Značka schválení / zamítnutí kroku v osnově. */
function StepMarker({ approved, rejected }: { approved: boolean; rejected: boolean }) {
  if (approved) {
    return (
      <span className="shrink-0 size-4 rounded-full bg-primary flex items-center justify-center">
        <Check size={10} className="text-primary-foreground" />
      </span>
    );
  }
  if (rejected) {
    return (
      <span className="shrink-0 size-4 rounded-full bg-destructive flex items-center justify-center">
        <XCircle size={10} className="text-primary-foreground" />
      </span>
    );
  }
  return null;
}

export default ReviewCourseView;
