'use client';

import { useState, useEffect, useRef, useMemo, type ReactNode, type RefObject } from 'react';
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
  listCourseAssessments,
  type CourseAssessmentConfig,
} from '@/lib/api-client';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { REVIEW_COUNT_EVENT } from '@/components/admin/AdminSidebar';
import { ArrowLeft, ArrowRight, BookOpenText, Check, CheckCircle, Dumbbell, Gavel, Headphones, Info } from 'lucide-react';
import { ReviewModuleMaterials } from '@/components/admin/ReviewModuleMaterials';
import { hasMindmap, hasPodcast } from '@/lib/module-materials';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  ModuleCategories,
  PageSpinner,
  Tabs,
  TabsList,
  TabsTrigger,
  useToast,
} from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize-html';
import {
  AI_MATERIALS_FEEDBACK,
  COURSE_FINAL_FEEDBACK,
  COURSE_GENERAL_FEEDBACK,
  COURSE_SUMMARY_FEEDBACK,
  isCourseFinalFeedback,
  isCourseLevelFeedback,
  isCourseSummaryFeedback,
  reviewFeedbackLabel,
} from '@/lib/review-feedback';
import { ReviewCourseSummary } from '@/components/admin/ReviewCourseSummary';
import { CommentsDrawer, ReviewerCommentComposer, ReviewerCommentList } from '@/components/admin/ReviewComments';
import { CommentsToggle } from '@/components/admin/CoursePageHeader';
import { ReviewModuleTests } from '@/components/admin/assessments/ReviewModuleTests';
import {
  collectReviewWarnings,
  ReviewDecisionActions,
  ReviewDecisionOverview,
  type ReviewPart,
} from '@/components/admin/ReviewDecision';

// Plný (ne podtržený) aktivní stav — kitový `line` variant kreslí podtržení
// a průhledné pozadí, obojí přebíjíme stejným modifikátorem.
const MODULE_TAB = [
  'flex-none gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
  'text-muted-foreground hover:bg-muted',
  'group-data-[variant=line]/tabs-list:data-active:bg-gradient-r data-active:text-primary-foreground',
  'group-data-[variant=line]/tabs-list:data-active:after:opacity-0',
  "[&_svg:not([class*='size-'])]:size-auto",
].join(' ');

// Od této šířky jsou komentáře sloupec vedle obsahu (px breakpoint by Tailwind řadil špatně)
const COMMENTS_INLINE_FROM = '90rem';

// materials = podcast a myslenkova mapa, jen u modulu, ktery je ma
type TabType = 'handbook' | 'materials' | 'practice';

// Kroky kontroly: Souhrn -> moduly -> Závěrečný test -> Rozhodnutí
type StepKey = 'summary' | 'final' | 'decision' | `module:${number}`;
const moduleKey = (moduleId: number): StepKey => `module:${moduleId}`;

// "Krok 3 ze 7" / "z 5": ze před číslovkou na s, z, š, ž a skupinu souhlásek
function stepOf(n: number, total: number): string {
  const lead = total >= 20 ? Math.floor(total / 10) * 10 : total;
  const ze = [2, 3, 4, 6, 7, 12, 13, 14, 16, 17, 20, 30, 40, 60, 70].includes(lead);
  return `Krok ${n} ${ze ? 'ze' : 'z'} ${total}`;
}

// Otevřené části se pamatují pro kolo kontroly; nové odeslání ke schválení mění updatedAt
const VISITED_KEY = 'reviewVisited';
const reviewRound = (course: Course) => new Date(course.updatedAt).toISOString();

function readVisited(courseId: number, round: string): Set<string> {
  try {
    const saved = JSON.parse(localStorage.getItem(`${VISITED_KEY}.${courseId}`) ?? 'null');
    if (saved?.round === round && Array.isArray(saved.steps)) return new Set(saved.steps);
  } catch {
    // bez úložiště se pamatuje jen v rámci zobrazení
  }
  return new Set();
}

function writeVisited(courseId: number, round: string, steps: Set<string>) {
  try {
    localStorage.setItem(`${VISITED_KEY}.${courseId}`, JSON.stringify({ round, steps: [...steps] }));
  } catch {
    // viz readVisited
  }
}

function clearVisited(courseId: number) {
  try {
    localStorage.removeItem(`${VISITED_KEY}.${courseId}`);
  } catch {
    // viz readVisited
  }
}

interface ReviewCourseViewProps {
  courseId: number;
}

export function ReviewCourseView({ courseId }: ReviewCourseViewProps) {
  const router = useRouter();
  const toast = useToast();
  const { isGuarantor, isSuperAdmin } = useRole();
  const { currentUser } = useCurrentUser();

  // Data
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [configs, setConfigs] = useState<CourseAssessmentConfig[] | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigace
  const [step, setStep] = useState<StepKey>('summary');
  const [activeTab, setActiveTab] = useState<TabType>('handbook');
  const [blockIndex, setBlockIndex] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  // Komentáře
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newFeedbackText, setNewFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState<number | null>(null);
  // Garant chce vrátit kurz, ale nemá komentář -> výzva nad polem komentáře
  const [commentPrompt, setCommentPrompt] = useState(false);

  // Po schválení krátká animace, pak návrat na seznam
  const [approvedTransition, setApprovedTransition] = useState(false);

  // Panel komentářů (pod 90rem) začíná pod hlavičkou
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [courseData, mods] = await Promise.all([
          getCourse(courseId),
          getModules({ courseId, includeInactive: false }),
        ]);
        const active = mods.filter((m) => m.isActive);
        // Plný obsah všech modulů najednou, přepínání je pak okamžité
        const [fullModules, section, assessmentConfigs] = await Promise.all([
          Promise.all(active.map((m) => getModule(m.moduleId).catch(() => m))),
          getFeedbackSection(courseId).catch(() => null),
          listCourseAssessments(courseId).catch(() => null),
        ]);
        if (cancelled) return;
        setCourse(courseData);
        setModules(fullModules);
        setFeedbacks(section?.feedbacks ?? []);
        setConfigs(assessmentConfigs);
        setVisited(readVisited(courseId, reviewRound(courseData)));
      } catch (err) {
        console.error('Failed to load course:', err);
        if (!cancelled) setError('Nepodařilo se načíst kurz.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Otevřená část se označí v osnově jako prohlédnutá
  useEffect(() => {
    if (!course || step === 'decision') return;
    setVisited((prev) => (prev.has(step) ? prev : new Set(prev).add(step)));
  }, [step, course]);

  useEffect(() => {
    if (!course || course.status !== Status.InReview || visited.size === 0) return;
    writeVisited(courseId, reviewRound(course), visited);
  }, [visited, course, courseId]);

  // Nová stránka nebo krok začíná nahoře
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step, activeTab, blockIndex]);

  // Role
  const isOwnCourse = !!course && course.ownerId === currentUser?.userId;
  const isInReview = course?.status === Status.InReview;
  const isApproved = course?.status === Status.Approved;
  const canDecide = isGuarantor && !isOwnCourse && isInReview;
  const canDeleteFeedback = (fb: FeedbackItem) =>
    isSuperAdmin || (isGuarantor && fb.author.userId === currentUser?.userId);

  // Aktuální modul
  const moduleIndex = step.startsWith('module:') ? modules.findIndex((m) => moduleKey(m.moduleId) === step) : -1;
  const selectedModule = moduleIndex >= 0 ? modules[moduleIndex] : null;
  const learnBlocks = selectedModule?.learnBlocks ?? [];
  const totalBlocks = learnBlocks.length;
  const currentBlock = learnBlocks[blockIndex];
  const currentBlockHtml = useMemo(() => sanitizeHtml(currentBlock?.content ?? ''), [currentBlock?.content]);
  const selectedHasMaterials = !!selectedModule && (hasPodcast(selectedModule) || hasMindmap(selectedModule));

  // Části ke kontrole (bez Rozhodnutí)
  const parts: ReviewPart[] = [
    { key: 'summary', label: 'Souhrn kurzu', visited: visited.has('summary') },
    ...modules.map((m, i) => ({
      key: moduleKey(m.moduleId),
      label: `Modul ${i + 1}: ${m.title}`,
      visited: visited.has(moduleKey(m.moduleId)),
    })),
    { key: 'final', label: 'Závěrečný test kurzu', visited: visited.has('final') },
  ];
  const totalSteps = parts.length + 1;
  const unvisited = parts.filter((p) => !p.visited).map((p) => p.label);

  const openStep = (key: StepKey, tab: TabType = 'handbook') => {
    setStep(key);
    setActiveTab(tab);
    const mod = modules.find((m) => moduleKey(m.moduleId) === key);
    // Návrat zpět z dalšího modulu míří na konec příručky předchozího
    setBlockIndex(tab === 'practice' && mod ? Math.max(0, (mod.learnBlocks?.length ?? 0) - 1) : 0);
  };

  const goNext = () => {
    if (step === 'summary') return openStep(modules[0] ? moduleKey(modules[0].moduleId) : 'final');
    if (step === 'final') return openStep('decision');
    if (!selectedModule) return;
    if (activeTab === 'handbook') {
      if (blockIndex < totalBlocks - 1) setBlockIndex((i) => i + 1);
      else setActiveTab(selectedHasMaterials ? 'materials' : 'practice');
      return;
    }
    if (activeTab === 'materials') {
      setActiveTab('practice');
      return;
    }
    const next = modules[moduleIndex + 1];
    openStep(next ? moduleKey(next.moduleId) : 'final');
  };

  const goBack = () => {
    if (step === 'decision') return openStep('final');
    if (step === 'final') {
      const last = modules[modules.length - 1];
      return last ? openStep(moduleKey(last.moduleId), 'practice') : openStep('summary');
    }
    if (!selectedModule) return;
    if (activeTab === 'practice' && selectedHasMaterials) {
      setActiveTab('materials');
      return;
    }
    if (activeTab === 'practice' || activeTab === 'materials') {
      setActiveTab('handbook');
      setBlockIndex(Math.max(0, totalBlocks - 1));
      return;
    }
    if (blockIndex > 0) return setBlockIndex((i) => i - 1);
    const prev = modules[moduleIndex - 1];
    openStep(prev ? moduleKey(prev.moduleId) : 'summary', 'practice');
  };

  const nextLabel =
    step === 'summary'
      ? modules.length > 0 ? 'Pokračovat na moduly' : 'Pokračovat na závěrečný test'
      : step === 'final'
        ? 'Pokračovat na rozhodnutí'
        : activeTab === 'handbook'
          ? blockIndex < totalBlocks - 1
            ? 'Další stránka'
            : selectedHasMaterials ? 'Pokračovat na podcast a mapu' : 'Pokračovat na procvičování'
          : activeTab === 'materials'
            ? 'Pokračovat na procvičování'
            : moduleIndex < modules.length - 1 ? 'Další modul' : 'Pokračovat na závěrečný test';

  // Komentáře podle kroku
  const moduleFeedbacks = (moduleId: number) =>
    feedbacks.filter((fb) => !isCourseLevelFeedback(fb) && fb.moduleId === moduleId);
  const feedbacksForStep = (key: StepKey): FeedbackItem[] => {
    if (key === 'summary') return feedbacks.filter(isCourseSummaryFeedback);
    if (key === 'final') return feedbacks.filter(isCourseFinalFeedback);
    if (key === 'decision') return feedbacks;
    const mod = modules.find((m) => moduleKey(m.moduleId) === key);
    return mod ? moduleFeedbacks(mod.moduleId) : [];
  };
  const unresolvedFor = (key: StepKey) => feedbacksForStep(key).filter((fb) => !fb.isResolved).length;
  const stepFeedbacks = feedbacksForStep(step);
  const unresolvedCount = feedbacks.filter((fb) => !fb.isResolved).length;
  const resolvedCount = feedbacks.length - unresolvedCount;
  // Odpovědi nebo vyřešené komentáře = autor už kurz jednou opravoval
  const isResubmission = feedbacks.some((fb) => fb.isResolved || !!fb.reply);

  // Kam se uloží nový komentář; komentáře ke kurzu backend váže k prvnímu modulu
  const firstModuleId = modules[0]?.moduleId;
  const commentTarget = ((): { label: string; moduleId?: number; contentType?: string; contentRef?: string } => {
    if (step === 'summary') return { label: 'Souhrn kurzu', moduleId: firstModuleId, contentType: COURSE_SUMMARY_FEEDBACK };
    if (step === 'final') return { label: 'Závěrečný test kurzu', moduleId: firstModuleId, contentType: COURSE_FINAL_FEEDBACK };
    if (step === 'decision') return { label: 'Celý kurz', moduleId: firstModuleId, contentType: COURSE_GENERAL_FEEDBACK };
    if (!selectedModule) return { label: '' };
    if (activeTab === 'practice') return { label: 'Procvičování', moduleId: selectedModule.moduleId, contentType: 'practice' };
    if (activeTab === 'materials') return { label: 'Podcast a mapa', moduleId: selectedModule.moduleId, contentType: AI_MATERIALS_FEEDBACK };
    return totalBlocks > 0
      ? {
          label: `Příručka – str. ${blockIndex + 1}`,
          moduleId: selectedModule.moduleId,
          contentType: 'learn_block',
          contentRef: String(blockIndex + 1),
        }
      : { label: 'Příručka', moduleId: selectedModule.moduleId };
  })();

  const handleAddFeedback = async () => {
    const text = newFeedbackText.trim();
    if (!text || !commentTarget.moduleId) return;
    setSubmittingFeedback(true);
    try {
      const item = await createFeedback(commentTarget.moduleId, text, {
        contentType: commentTarget.contentType,
        contentRef: commentTarget.contentRef,
      });
      setFeedbacks((prev) => [...prev, item]);
      setNewFeedbackText('');
      setCommentPrompt(false);
    } catch (err) {
      toast.error(err, 'Komentář se nepodařilo uložit.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId: number) => {
    setDeletingFeedback(feedbackId);
    try {
      await deleteFeedback(feedbackId);
      setFeedbacks((prev) => prev.filter((fb) => fb.feedbackId !== feedbackId));
    } catch (err) {
      toast.error(err, 'Komentář se nepodařilo smazat.');
    } finally {
      setDeletingFeedback(null);
    }
  };

  const handleApproveCourse = async (): Promise<boolean> => {
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.Approved);
      await generateCourseEmbeddings(courseId).catch(() => {});
      clearVisited(courseId);
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
      setApprovedTransition(true);
      setTimeout(() => router.push('/admin/review'), 1400);
      return true;
    } catch (err) {
      toast.error(err, 'Kurz se nepodařilo schválit.');
      return false;
    }
  };

  const handleReturnCourse = async (): Promise<boolean> => {
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.Edited);
      clearVisited(courseId);
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
      toast.success('Autor uvidí komentáře a po úpravách kurz znovu odešle.', 'Kurz vrácen k úpravám');
      router.push('/admin/review');
      return true;
    } catch (err) {
      toast.error(err, 'Kurz se nepodařilo vrátit k úpravám.');
      return false;
    }
  };

  const warnings = useMemo(
    () => (course ? collectReviewWarnings(course, modules, configs) : []),
    [course, modules, configs],
  );

  if (loading) {
    return <PageSpinner message="Načítání kurzu…" />;
  }

  if (error || !course) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-4">{error ?? 'Kurz nebyl nalezen.'}</p>
          <Button variant="plain" onClick={() => router.push('/admin/review')} className={cn(BTN_KEEP_BOX, 'text-gradient-r hover:underline')}>
            ← Zpět na přehled
          </Button>
        </div>
      </div>
    );
  }

  // Kurz bez modulů nemá kam komentář uložit (backend ho váže k modulu)
  const canAddFeedback = canDecide && modules.length > 0 && !!commentTarget.moduleId;
  const returnNeedsComment = unresolvedCount === 0 && modules.length > 0;

  const decisionNotice = !canDecide ? (
    <Alert variant={isApproved ? 'success' : 'info'}>
      {isApproved ? <CheckCircle /> : <Info />}
      <AlertDescription>
        {isApproved
          ? 'Kurz je schválený.'
          : !isInReview
            ? 'Kurz teď nečeká na schválení.'
            : isOwnCourse
              ? 'Vlastní kurz schválit nemůžete, rozhoduje o něm jiný garant.'
              : 'Schvalovat kurzy může jen garant.'}
      </AlertDescription>
    </Alert>
  ) : null;

  const footerNav = (
    <Button variant="ghost" size="lg" onClick={goBack} disabled={step === 'summary'}>
      <ArrowLeft data-icon="inline-start" />
      Zpět
    </Button>
  );
  const nextButton = (
    <Button size="lg" onClick={goNext}>
      {nextLabel}
      <ArrowRight data-icon="inline-end" />
    </Button>
  );

  let stepContent: ReactNode;
  if (step === 'summary') {
    stepContent = (
      <StepFrame
        label={stepOf(1, totalSteps)}
        title="Souhrn kurzu"
        description="Zkontrolujte popis, zařazení a náhledový obrázek kurzu."
        bodyRef={bodyRef}
        footer={<>{footerNav}{nextButton}</>}
      >
        <ReviewCourseSummary course={course} modulesCount={modules.length} />
      </StepFrame>
    );
  } else if (step === 'final') {
    stepContent = (
      <StepFrame
        label={stepOf(totalSteps - 1, totalSteps)}
        title="Závěrečný test kurzu"
        description="Zkontrolujte otázky a nastavení závěrečného testu."
        bodyRef={bodyRef}
        footer={<>{footerNav}{nextButton}</>}
      >
        <ReviewModuleTests courseId={courseId} moduleId={null} />
      </StepFrame>
    );
  } else if (step === 'decision') {
    stepContent = (
      <StepFrame
        label={stepOf(totalSteps, totalSteps)}
        title="Rozhodnutí"
        description="Projděte přehled a kurz schvalte, nebo ho vraťte autorovi k úpravám."
        bodyRef={bodyRef}
        footer={
          <>
            {footerNav}
            {canDecide && (
              <ReviewDecisionActions
                unvisited={unvisited}
                unresolvedCount={unresolvedCount}
                returnNeedsComment={returnNeedsComment}
                onWriteComment={() => {
                  setCommentPrompt(true);
                  setCommentsOpen(true);
                }}
                onApprove={handleApproveCourse}
                onReturn={handleReturnCourse}
              />
            )}
          </>
        }
      >
        <ReviewDecisionOverview
          parts={parts}
          onOpenPart={(key) => openStep(key as StepKey)}
          warnings={warnings}
          testsChecked={configs !== null}
          unresolvedCount={unresolvedCount}
          resolvedCount={resolvedCount}
          onOpenComments={() => setCommentsOpen(true)}
          notice={decisionNotice}
        />
      </StepFrame>
    );
  } else if (selectedModule) {
    stepContent = (
      <StepFrame
        label={stepOf(moduleIndex + 2, totalSteps)}
        title={selectedModule.title}
        description={selectedModule.perex ?? undefined}
        bodyRef={bodyRef}
        headerExtra={
          <>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                Zařazení modulu
              </summary>
              <div className="mt-3">
                <ModuleCategories module={selectedModule} />
              </div>
            </details>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="mt-3 gap-0">
              <TabsList variant="line" className="gap-2 p-0 group-data-horizontal/tabs:h-auto">
                <TabsTrigger value="handbook" className={MODULE_TAB}>
                  <BookOpenText size={14} />
                  Příručka
                </TabsTrigger>
                {selectedHasMaterials && (
                  <TabsTrigger value="materials" className={MODULE_TAB}>
                    <Headphones size={14} />
                    Podcast a mapa
                  </TabsTrigger>
                )}
                <TabsTrigger value="practice" className={MODULE_TAB}>
                  <Dumbbell size={14} />
                  Procvičování
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        }
        footer={<>{footerNav}{nextButton}</>}
      >
        {activeTab === 'handbook' ? (
          currentBlock ? (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                Stránka {blockIndex + 1} z {totalBlocks}
              </p>
              <div className="module-content prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentBlockHtml }} />
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpenText size={40} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Obsah příručky není k dispozici</p>
            </div>
          )
        ) : activeTab === 'materials' ? (
          <ReviewModuleMaterials module={selectedModule} />
        ) : (
          <ReviewModuleTests courseId={courseId} moduleId={selectedModule.moduleId} />
        )}
      </StepFrame>
    );
  }

  const commentsSubtitle =
    step === 'summary'
      ? 'Souhrn kurzu'
      : step === 'final'
        ? 'Závěrečný test kurzu'
        : step === 'decision'
          ? 'Všechny komentáře kurzu'
          : selectedModule ? `Modul: ${selectedModule.title}` : undefined;

  // Layout: hlavička (název + komentáře), osnova, obsah kroku, panel komentářů.
  // O kurzu se rozhoduje až v kroku Rozhodnutí, ne v hlavičce.
  return (
    <div className="flex-1 flex flex-col h-full bg-muted overflow-hidden">
      <div ref={headerRef} className="bg-card border-b border-border px-4 sm:px-6 py-4 flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">
            <Button variant="plain" onClick={() => router.push('/admin/review')} className={cn(BTN_KEEP_BOX, 'hover:text-foreground')}>
              Ke schválení
            </Button>
            {' / Kontrola kurzu'}
          </p>
          <h1 className="text-xl font-bold text-foreground break-words">{course.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {course.ownerDisplayName && <span>Autor: {course.ownerDisplayName}</span>}
            {isResubmission && isInReview && <Badge variant="open">Opravená verze</Badge>}
            {isApproved && <Badge variant="resolved">Schváleno</Badge>}
          </div>
        </div>
        <CommentsToggle
          onClick={() => setCommentsOpen((open) => !open)}
          count={stepFeedbacks.filter((fb) => !fb.isResolved).length}
          open={commentsOpen}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-3 sm:p-4 gap-3 sm:gap-4">
        <nav
          aria-label="Kontrola kurzu"
          className="max-h-64 lg:max-h-none lg:w-56 shrink-0 bg-card rounded-lg border border-border flex flex-col overflow-hidden"
        >
          <div className="p-3 border-b border-border flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Kontrola kurzu</h2>
            <span className="text-xs text-muted-foreground" title="Otevřené části kurzu">
              {parts.filter((p) => p.visited).length}/{parts.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {parts.map((part) => (
              <OutlineItem
                key={part.key}
                label={part.key.startsWith('module:') ? part.label.replace(/^Modul \d+: /, '') : part.label}
                active={step === part.key}
                marker={<VisitedMarker visited={part.visited} />}
                badge={unresolvedFor(part.key as StepKey)}
                onClick={() => openStep(part.key as StepKey)}
              />
            ))}
            <OutlineItem
              label="Rozhodnutí"
              active={step === 'decision'}
              marker={<Gavel size={16} className="shrink-0 text-muted-foreground" />}
              onClick={() => openStep('decision')}
            />
          </div>
        </nav>

        <div className="flex-1 bg-card rounded-lg border border-border flex flex-col overflow-hidden min-w-0">
          {stepContent}
        </div>

        <CommentsDrawer
          open={commentsOpen}
          onOpenChange={setCommentsOpen}
          anchorRef={headerRef}
          inlineMinWidth={COMMENTS_INLINE_FROM}
          title={`Komentáře${stepFeedbacks.length > 0 ? ` (${stepFeedbacks.length})` : ''}`}
          subtitle={commentsSubtitle}
          footer={
            canAddFeedback ? (
              <ReviewerCommentComposer
                target={commentTarget.label}
                value={newFeedbackText}
                onChange={setNewFeedbackText}
                onSubmit={handleAddFeedback}
                submitting={submittingFeedback}
                warning={commentPrompt ? 'Před vrácením kurzu napište aspoň jeden komentář, ať autor ví, co má opravit.' : null}
              />
            ) : isApproved ? (
              <p className="text-xs text-muted-foreground text-center">Kurz je schválený, komentáře jsou uzavřené.</p>
            ) : undefined
          }
        >
          <ReviewerCommentList
            feedbacks={stepFeedbacks}
            emptyText={step === 'decision' ? 'Kurz nemá žádné komentáře.' : 'K této části nejsou žádné komentáře.'}
            contextLabel={(fb) => reviewFeedbackLabel(fb, { withModule: step === 'decision' })}
            canDelete={canDeleteFeedback}
            deletingId={deletingFeedback}
            onDelete={handleDeleteFeedback}
          />
        </CommentsDrawer>
      </div>

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

// Karta kroku: hlavička s číslem kroku, rolovací obsah, patička s navigací
function StepFrame({
  label,
  title,
  description,
  headerExtra,
  bodyRef,
  footer,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  headerExtra?: ReactNode;
  bodyRef: RefObject<HTMLDivElement | null>;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="p-4 border-b border-border shrink-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <h2 className="font-semibold text-foreground break-words">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1 break-words">{description}</p>}
        {headerExtra}
      </div>
      <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border shrink-0">
        {footer}
      </div>
    </>
  );
}

function OutlineItem({
  label,
  active,
  marker,
  badge = 0,
  onClick,
}: {
  label: string;
  active: boolean;
  marker: ReactNode;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <Button
      variant="plain"
      onClick={onClick}
      aria-current={active ? 'step' : undefined}
      className={cn(
        BTN_KEEP_BOX,
        'w-full justify-start text-left px-3 py-3 text-sm transition-colors border-b border-border last:border-b-0 flex items-center gap-2 border-l-4',
        active
          ? 'bg-gradient-r/10 border-l-gradient-r font-medium text-foreground'
          : 'hover:bg-muted/50 text-foreground border-l-transparent',
      )}
    >
      {marker}
      <span className="truncate flex-1">{label}</span>
      {badge > 0 && (
        <span
          className="shrink-0 bg-brand-accent text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
          aria-label={`Komentáře k opravě: ${badge}`}
        >
          {badge}
        </span>
      )}
    </Button>
  );
}

// Plné kolečko s fajfkou = část byla otevřena, prázdné = ještě ne
function VisitedMarker({ visited }: { visited: boolean }) {
  return visited ? (
    <span className="shrink-0 size-4 rounded-full bg-primary flex items-center justify-center" aria-label="Otevřeno">
      <Check size={10} className="text-primary-foreground" />
    </span>
  ) : (
    <span className="shrink-0 size-4 rounded-full border border-border" aria-label="Neotevřeno" />
  );
}

export default ReviewCourseView;
