'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Status, type AssessmentContext, type PretestSettings } from '@/api';
import {
  attachCourseAssessment, detachCourseAssessment, getPretestContent, listAssessmentFormats, listCourseAssessments,
  updateCourseAssessment, updateCourseStatus, updatePretestContent,
  type AssessmentFormat, type AssessmentFormatSettings, type CourseAssessmentConfig,
} from '@/lib/api-client';
import { UpdateCourseStatusStatusEnum } from '@/api/apis/CoursesApi';
import {
  CoursePageHeader, LoadingState, ErrorState, CourseCreationTabs, CourseRubric, CourseStepsCard, StepModuleList,
  courseStepLabel, moduleCountHint, testCountHint, useCourseStepNavigation, useAdminChrome,
  type CreationTab, type CourseStep, type StepModuleItem,
} from '@/components/admin';
import { StudentPreview } from '@/components/admin/StudentPreview';
import { PretestEditor } from '@/components/admin/assessments/PretestEditor';
import type { FormatDraft } from '@/components/admin/assessments/FormatConfigCard';
import { FormatCards } from '@/components/admin/assessments/FormatCards';
// Osnova kurzu je nahrazená kartou „Tvorba kurzu" (viz zakomentované použití níže).
// import { CourseOutlineSidebar } from '@/components/admin/CourseOutlineSidebar';
import { ConfirmModal, Drawer, DrawerContent, Button, Tabs, TabsList, TabsTrigger, useToast } from '@/components/ui';
import { readApiErrorDetail, readApiErrorStatus } from '@/lib/api-error';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCourseData } from '@/hooks/useCourseData';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAutosave } from '@/hooks/useAutosave';
import type { AssessmentContents } from '@/hooks/useCourseAssessments';
import { BTN_KEEP_BOX, cn, czechPlural } from '@/lib/utils';
import { CONTEXT_LABELS, formatName } from '@/lib/assessment-labels';
import {
  emptyClosedQuestion, emptyPretest, formatFinishErrors, formatSettingsErrors, normalizeFormatSettings, normalizePretest, pretestErrors,
} from '@/lib/assessment-validation';
import { isCourseSummaryFeedback, reviewFeedbackLabel } from '@/lib/review-feedback';
import { AuthorCommentsDrawer, useAuthorReviewFeedback, useAutoOpenReviewComments } from '@/components/admin/ReviewComments';
import {
  ArrowUpCircle,
} from 'lucide-react';

type TestsSection = Extract<CourseStep, 'pretest' | 'tests'>;

interface ValidationError {
  /** -1 = závěrečný test kurzu */
  moduleIndex: number;
  moduleName: string;
  message: string;
  // Krok, ve kterém se chyba opraví
  section: TestsSection;
  // Záložka a karta formátu, kterou klik na chybu otevře
  context: AssessmentContext;
  code: string;
}

interface CourseTestsViewProps {
  // 'pretest' = pretest modulů, 'tests' = formáty a závěrečný test
  section: TestsSection;
  courseId: number;
  initialModuleId?: number;
}

// Klíče otisků uloženého stavu — pretest a formát se ukládají jinými endpointy
const pretestKey = (id: number) => `p:${id}`;
const formatKey = (id: number) => `f:${id}`;

const CONTEXT_ORDER: AssessmentContext[] = ['pretest', 'practice', 'assessment', 'course_final'];
const byContext = (a: CourseAssessmentConfig, b: CourseAssessmentConfig) =>
  CONTEXT_ORDER.indexOf(a.context) - CONTEXT_ORDER.indexOf(b.context) || a.courseAssessmentId - b.courseAssessmentId;

// Záložky formátů v modulu
const MODULE_CONTEXTS = ['practice', 'assessment'] as const;
type ModuleContext = typeof MODULE_CONTEXTS[number];
const isModuleContext = (c: AssessmentContext): c is ModuleContext => (MODULE_CONTEXTS as readonly string[]).includes(c);

// Uzavřené otázky bez otázek začínají rovnou prázdnou otázkou k vyplnění
const withStarterQuestion = (code: string, settings: AssessmentFormatSettings): AssessmentFormatSettings =>
  code === 'closed_questions' && (settings.questions ?? []).length === 0
    ? { ...settings, questions: [emptyClosedQuestion()] }
    : settings;

// Náhled ukazuje jen to, co lektor začal vyplňovat
const withoutBlankQuestions = (code: string, settings: AssessmentFormatSettings): AssessmentFormatSettings =>
  code === 'closed_questions'
    ? { ...settings, questions: (settings.questions ?? []).filter((q) => q.question.trim() || q.options.some((o) => o.trim())) }
    : settings;

// Klíč rozbalených karet — modul (null = závěrečný test) a kontext
const openFormatsKey = (moduleId: number | null, context: AssessmentContext) => `${moduleId ?? 'final'}:${context}`;

// Stejný vzhled jako záložky Příručka/Procvičování ve schvalování
const FORMAT_TAB = [
  'flex-none gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
  'text-muted-foreground hover:bg-muted',
  'group-data-[variant=line]/tabs-list:data-active:bg-gradient-r data-active:text-primary-foreground',
  'group-data-[variant=line]/tabs-list:data-active:after:opacity-0',
].join(' ');

// Editor kroků Pretest a Testy; společná data i autosave, section řídí render
export function CourseTestsView({ section, courseId, initialModuleId }: CourseTestsViewProps) {
  const { goToCourseContent, goToCourseSummary } = useAdminNavigation();
  const toast = useToast();
  const { isOwner } = useCurrentUser();
  const {
    loading,
    error,
    courseTitle,
    modules,
    selectedModuleIndex,
    setSelectedModuleIndex,
    setExpandedOutlineItems,
    selectModule,
    courseData,
  } = useCourseData({ courseId, initialModuleId });

  const [activeTab, setActiveTab] = useState<CreationTab>('general');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Panel komentářů začíná pod hlavičkou stránky
  const reviewHeaderRef = useRef<HTMLDivElement>(null);
  // Sdílená instance — po přepnutí kroku scroll editoru nahoru
  const editorScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    editorScrollRef.current?.scrollTo({ top: 0 });
  }, [section]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { focusMode } = useAdminChrome();
  const goToStep = useCourseStepNavigation(courseId);

  // Komentáře garanta u vráceného kurzu (vysouvací panel)
  const { feedbacks, reply: replyToReviewFeedback, toggleResolve: toggleReviewFeedback } = useAuthorReviewFeedback(courseId);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const courseStatus = courseData?.status as string | undefined;
  const isEdited = courseStatus === Status.Edited;
  const hasFeedbacks = feedbacks.length > 0;
  const showCommentsPanel = isEdited && hasFeedbacks;
  const allResolved = feedbacks.length > 0 && feedbacks.every(fb => fb.isResolved);
  const canResubmit = isEdited && allResolved && courseData && isOwner(courseData.ownerId);

  // Komentáře k souhrnu kurzu patří do kroku „Popis kurzu", ne k modulu
  const moduleFeedbacks = feedbacks.filter(fb => !isCourseSummaryFeedback(fb));
  const unresolvedSummaryFeedbacks = feedbacks.filter(fb => isCourseSummaryFeedback(fb) && !fb.isResolved).length;

  const currentModuleFeedbacks = modules[selectedModuleIndex]
    ? moduleFeedbacks.filter(fb => fb.moduleId === modules[selectedModuleIndex].moduleId)
    : [];

  const feedbackCountByModule = (moduleId: number) =>
    moduleFeedbacks.filter(fb => fb.moduleId === moduleId && !fb.isResolved).length;

  useAutoOpenReviewComments(courseId, showCommentsPanel, feedbacks, currentModuleFeedbacks, setCommentsOpen);

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

  // Formáty připojené ke kurzu a katalog formátů
  const [configs, setConfigs] = useState<CourseAssessmentConfig[]>([]);
  const [formats, setFormats] = useState<AssessmentFormat[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null);
  // Rozpracovaný obsah pretestů a nastavení formátů podle courseAssessmentId
  const [pretestDrafts, setPretestDrafts] = useState<Record<number, PretestSettings>>({});
  const [formatDrafts, setFormatDrafts] = useState<Record<number, FormatDraft>>({});
  // Otisk naposledy uloženého stavu — ukládá se jen to, co se od něj liší
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({});
  // Po pokusu o dokončení se chyby ukážou i u neupravených částí
  const [showAllErrors, setShowAllErrors] = useState(false);
  // Vybraný závěrečný test místo modulu; v kroku Pretest se ignoruje
  const [finalPicked, setFinalPicked] = useState(false);
  const finalSelected = section === 'tests' && finalPicked;
  const [detachTarget, setDetachTarget] = useState<CourseAssessmentConfig | null>(null);
  const [detaching, setDetaching] = useState(false);
  // Záložka zůstává při přepnutí modulu
  const [formatTab, setFormatTab] = useState<ModuleContext>('practice');
  const [openFormats, setOpenFormats] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, catalog] = await Promise.all([listCourseAssessments(courseId), listAssessmentFormats()]);
        const pretestEntries = await Promise.all(
          list.filter((c) => c.assessmentTypeCode === 'pretest').map(async (c) => {
            try {
              return { id: c.courseAssessmentId, content: await getPretestContent(c.courseAssessmentId), stored: true };
            } catch (err) {
              // 422 = pretest bez otázek (připojený ručně) — začne se prázdným
              if (readApiErrorStatus(err) === 422) return { id: c.courseAssessmentId, content: emptyPretest(), stored: false };
              throw err;
            }
          }),
        );
        if (cancelled) return;

        const snapshots: Record<string, string> = {};
        const pretests: Record<number, PretestSettings> = {};
        for (const { id, content, stored } of pretestEntries) {
          pretests[id] = content;
          if (stored) snapshots[pretestKey(id)] = JSON.stringify(content);
        }
        const drafts: Record<number, FormatDraft> = {};
        for (const c of list) {
          if (c.assessmentTypeCode === 'pretest' || !c.settings) continue;
          // Snapshot i s prázdnou otázkou — chyby a autosave až po začátku vyplňování
          drafts[c.courseAssessmentId] = { settings: withStarterQuestion(c.assessmentTypeCode, c.settings), isEnabled: c.isEnabled, isRequired: c.isRequired };
          snapshots[formatKey(c.courseAssessmentId)] = JSON.stringify(drafts[c.courseAssessmentId]);
        }
        setConfigs(list);
        setFormats(catalog);
        setPretestDrafts(pretests);
        setFormatDrafts(drafts);
        setSavedSnapshots(snapshots);
      } catch (err) {
        if (!cancelled) setAssessmentsError((await readApiErrorDetail(err)) ?? 'Testy kurzu se nepodařilo načíst.');
      } finally {
        if (!cancelled) setAssessmentsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  const isDirty = (key: string, value: unknown) => savedSnapshots[key] !== JSON.stringify(value);

  // Uloží změněné platné části; vrací počet přeskočených neplatných (celkem a z toho pretestů)
  const saveChanges = async (): Promise<{ skipped: number; skippedPretests: number }> => {
    let skipped = 0;
    let skippedPretests = 0;
    const saved: Record<string, string> = {};
    try {
      for (const [idText, draft] of Object.entries(pretestDrafts)) {
        const id = Number(idText);
        const snapshot = JSON.stringify(draft);
        if (savedSnapshots[pretestKey(id)] === snapshot) continue;
        if (pretestErrors(draft).length > 0) { skipped++; skippedPretests++; continue; }
        await updatePretestContent(id, normalizePretest(draft));
        saved[pretestKey(id)] = snapshot;
      }
      for (const config of configs) {
        const draft = formatDrafts[config.courseAssessmentId];
        if (!draft) continue;
        const snapshot = JSON.stringify(draft);
        if (savedSnapshots[formatKey(config.courseAssessmentId)] === snapshot) continue;
        if (formatSettingsErrors(config.assessmentTypeCode, draft.settings).length > 0) { skipped++; continue; }
        await updateCourseAssessment(
          { ...config, isEnabled: draft.isEnabled, isRequired: draft.isRequired },
          normalizeFormatSettings(draft.settings),
        );
        saved[formatKey(config.courseAssessmentId)] = snapshot;
      }
    } catch (err) {
      toast.error(err, 'Nepodařilo se uložit testy.');
      throw err;
    } finally {
      setSavedSnapshots((prev) => ({ ...prev, ...saved }));
    }
    return { skipped, skippedPretests };
  };

  const autosaveValue = useMemo(() => ({ pretestDrafts, formatDrafts }), [pretestDrafts, formatDrafts]);

  const { status: saveStatus } = useAutosave(
    autosaveValue,
    async () => {
      // Neplatné části zůstanou neuložené — stav „neuloženo", dokud je lektor neopraví
      if ((await saveChanges()).skipped > 0) throw new Error('Neplatné části testů');
    },
    { delay: 3000, enabled: !assessmentsLoading && !assessmentsError },
  );

  // Před odchodem z kroku — chyba uložení už je v toastu, odchod nesmí blokovat
  const saveBeforeLeaving = async () => {
    try {
      const { skipped, skippedPretests } = await saveChanges();
      if (skipped > 0) {
        // Neplatná část z druhého kroku tu není vidět — toast řekne, kde ji doplnit
        const where = section === 'tests' && skippedPretests > 0
          ? ' Neúplný pretest doplňte v kroku Pretest.'
          : section === 'pretest' && skipped > skippedPretests ? ' Neúplné testy doplňte v kroku Testy.' : '';
        toast.info(`Neúplné části testů se neuložily. Doplňte je, jinak se změny ztratí.${where}`);
      }
    } catch {
      // toast už je zobrazený
    }
  };

  // Pretesty i formáty — Dokončit validuje celý kurz
  const collectErrors = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    for (const config of configs) {
      const moduleIndex = config.moduleId === null ? -1 : modules.findIndex((m) => m.moduleId === config.moduleId);
      if (config.moduleId !== null && moduleIndex < 0) continue;
      const moduleName = moduleIndex >= 0 ? modules[moduleIndex].title : 'Závěrečný test kurzu';
      const isPretest = config.assessmentTypeCode === 'pretest';
      const pretest = pretestDrafts[config.courseAssessmentId];
      const draft = formatDrafts[config.courseAssessmentId];
      const messages = isPretest
        ? (pretest ? pretestErrors(pretest).map((m) => `Pretest — ${m}`) : [])
        : (draft ? formatFinishErrors(config.assessmentTypeCode, draft.settings).map((m) => `${formatName(config.assessmentTypeCode)} — ${m}`) : []);
      const errorSection: TestsSection = isPretest ? 'pretest' : 'tests';
      messages.forEach((message) => errors.push({
        moduleIndex, moduleName, message, section: errorSection, context: config.context, code: config.assessmentTypeCode,
      }));
    }
    return errors;
  };

  const handleFinish = async () => {
    const errors = collectErrors();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowAllErrors(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    try {
      await saveChanges();
    } catch {
      return;
    }
    goToCourseSummary(courseId);
  };

  const selectModuleIndex = (index: number) => {
    setFinalPicked(false);
    selectModule(index);
  };

  const handleNextModule = async () => {
    await saveBeforeLeaving();
    if (selectedModuleIndex < modules.length - 1) {
      const nextIndex = selectedModuleIndex + 1;
      setSelectedModuleIndex(nextIndex);
      setFinalPicked(false);
      setExpandedOutlineItems(prev => new Set(prev).add(nextIndex));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = async () => {
    if (section === 'tests') {
      goToStep('pretest', modules[selectedModuleIndex]?.moduleId);
      return;
    }
    await saveBeforeLeaving();
    goToCourseContent(courseId);
  };

  // Přepnutí mezi kroky tvorby přes kartu „Tvorba kurzu"
  const handleStepNavigate = async (step: CourseStep) => {
    if (step === section) return;
    setMobileOutlineOpen(false);
    // Pretest ↔ Testy je stejná instance (AdminViewRouter), ukládá autosave
    if (step !== 'pretest' && step !== 'tests') await saveBeforeLeaving();
    goToStep(step, modules[selectedModuleIndex]?.moduleId);
  };

  // Chyba z druhého kroku přepne krok; u formátu otevře jeho záložku a kartu
  const showValidationError = (err: ValidationError) => {
    if (err.moduleIndex < 0) setFinalPicked(true);
    else selectModuleIndex(err.moduleIndex);
    if (err.section === 'tests') {
      if (isModuleContext(err.context)) setFormatTab(err.context);
      const key = openFormatsKey(err.moduleIndex < 0 ? null : modules[err.moduleIndex].moduleId, err.context);
      setOpenFormats((prev) => (prev[key]?.includes(err.code) ? prev : { ...prev, [key]: [...(prev[key] ?? []), err.code] }));
    }
    if (err.section !== section) goToStep(err.section, modules[err.moduleIndex]?.moduleId);
  };

  // true = připojeno
  const handleAttach = async (code: string, context: AssessmentContext, isRequired: boolean, moduleId: number | null) => {
    try {
      const created = await attachCourseAssessment(courseId, { assessmentTypeCode: code, context, moduleId, isRequired });
      setConfigs((prev) => [...prev, created]);
      if (code === 'pretest') {
        setPretestDrafts((prev) => ({ ...prev, [created.courseAssessmentId]: emptyPretest() }));
        return true;
      }
      const defaults = formats.find((f) => f.code === code)?.defaultSettings ?? {};
      const draft: FormatDraft = {
        settings: withStarterQuestion(code, created.settings ?? defaults),
        isEnabled: created.isEnabled,
        isRequired: created.isRequired,
      };
      setFormatDrafts((prev) => ({ ...prev, [created.courseAssessmentId]: draft }));
      // Snapshot i s prázdnou otázkou — chyby a autosave až po začátku vyplňování
      setSavedSnapshots((prev) => ({ ...prev, [formatKey(created.courseAssessmentId)]: JSON.stringify(draft) }));
      return true;
    } catch (err) {
      toast.error(err, 'Formát se nepodařilo přidat.');
      return false;
    }
  };

  const handleDetach = async () => {
    if (!detachTarget) return;
    const id = detachTarget.courseAssessmentId;
    setDetaching(true);
    try {
      await detachCourseAssessment(id);
      setConfigs((prev) => prev.filter((c) => c.courseAssessmentId !== id));
      setFormatDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDetachTarget(null);
    } catch (err) {
      toast.error(err, 'Formát se nepodařilo odebrat.');
    } finally {
      setDetaching(false);
    }
  };

  const isLastModule = selectedModuleIndex >= modules.length - 1;
  const selectedModule = modules[selectedModuleIndex];
  const moduleConfigs = selectedModule
    ? configs.filter((c) => c.moduleId === selectedModule.moduleId).sort(byContext)
    : [];
  const pretestConfig = moduleConfigs.find((c) => c.assessmentTypeCode === 'pretest');
  const moduleFormatConfigs = moduleConfigs.filter((c) => c.assessmentTypeCode !== 'pretest');
  const finalConfigs = configs.filter((c) => c.context === 'course_final').sort(byContext);

  // Náhled pro studenta — rozpracované pretesty a nastavení formátů
  const previewAssessments = useMemo((): AssessmentContents => {
    const pretests: Record<number, PretestSettings | null> = {};
    for (const c of configs) {
      if (c.assessmentTypeCode === 'pretest' && c.moduleId !== null) pretests[c.moduleId] = pretestDrafts[c.courseAssessmentId] ?? null;
    }
    const withDrafts = configs.map((c) => {
      const draft = formatDrafts[c.courseAssessmentId];
      return draft ? { ...c, ...draft, settings: withoutBlankQuestions(c.assessmentTypeCode, draft.settings) } : c;
    });
    return { configs: withDrafts, pretests, loadError: null };
  }, [configs, pretestDrafts, formatDrafts]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // Outline items pro sidebar
  // Data pro Osnovu kurzu — nahrazena kartou „Tvorba kurzu“ (viz zakomentovaný blok v JSX).
  // const outlineItems = modules.map((module, index) => {
  //   const questionsForModule = moduleQuestions[index] || [];
  //   return {
  //     id: index,
  //     title: module.title,
  //     isExpanded: expandedOutlineItems.has(index),
  //     isSelected: selectedModuleIndex === index,
  //     feedbackCount: feedbackCountByModule(module.moduleId),
  //     subItems: questionsForModule.map((q, qIdx) => ({
  //       id: `q-${index}-${q.id}`,
  //       label: q.question ? (q.question.substring(0, 30) + (q.question.length > 30 ? '...' : '')) : `Otázka ${qIdx + 1}`,
  //       questionIndex: qIdx,
  //     })),
  //   };
  // });

  const stepHints = {
    // Komentáře k popisu kurzu žijí v kroku 1 — upozornit, ať je autor nepřehlédne
    ...(isEdited && unresolvedSummaryFeedbacks > 0 && {
      description: `${unresolvedSummaryFeedbacks} ${czechPlural(unresolvedSummaryFeedbacks, 'komentář', 'komentáře', 'komentářů')} k opravě`,
    }),
    content: moduleCountHint(modules.length),
    tests: testCountHint(moduleFormatConfigs.length),
  };

  const stepModuleItems = (onPicked?: () => void): StepModuleItem[] => [
    ...modules.map((module, index) => ({
      id: module.moduleId,
      title: module.title,
      selected: !finalSelected && index === selectedModuleIndex,
      badge: feedbackCountByModule(module.moduleId),
      onSelect: () => {
        selectModuleIndex(index);
        onPicked?.();
      },
    })),
    // Závěrečný test jen v kroku Testy
    ...(section === 'tests' ? [{
      id: -1,
      title: 'Závěrečný test kurzu',
      selected: finalSelected,
      onSelect: () => {
        setFinalPicked(true);
        onPicked?.();
      },
    }] : []),
  ];

  // Po pokusu o dokončení i chyby, které hlásí až Dokončit (např. žádná otázka)
  const formatErrors = (config: CourseAssessmentConfig): string[] => {
    const draft = formatDrafts[config.courseAssessmentId];
    if (!draft) return [];
    if (showAllErrors) return formatFinishErrors(config.assessmentTypeCode, draft.settings);
    return isDirty(formatKey(config.courseAssessmentId), draft) ? formatSettingsErrors(config.assessmentTypeCode, draft.settings) : [];
  };

  // Karty všech formátů kontextu (moduleId null = závěrečný test)
  const renderFormatCards = (context: AssessmentContext, contextConfigs: CourseAssessmentConfig[], moduleId: number | null) => {
    const key = openFormatsKey(moduleId, context);
    return (
      <FormatCards
        formats={formats}
        context={context}
        configs={contextConfigs}
        drafts={formatDrafts}
        errorsFor={formatErrors}
        open={openFormats[key] ?? []}
        onOpenChange={(next) => setOpenFormats((prev) => ({ ...prev, [key]: next }))}
        onChange={(config, next) => setFormatDrafts((prev) => ({ ...prev, [config.courseAssessmentId]: next }))}
        onRemove={setDetachTarget}
        onAdd={(code) => handleAttach(code, context, true, moduleId)}
      />
    );
  };

  const renderModuleEditor = () => {
    if (!selectedModule) return <p className="text-sm text-muted-foreground">Kurz zatím nemá žádné moduly.</p>;
    const pretestDraft = pretestConfig ? pretestDrafts[pretestConfig.courseAssessmentId] : undefined;
    if (section === 'pretest') {
      return (
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold text-foreground">Pretest</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Student ho dělá po přečtení příručky. Má pevně dvě uzavřené otázky a jednu otevřenou, na každou tři pokusy,
              a splnit musí všechny — teprve pak se mu odemkne procvičování.
            </p>
          </div>
          {pretestConfig && pretestDraft ? (
            <PretestEditor
              value={pretestDraft}
              onChange={(next) => setPretestDrafts((prev) => ({ ...prev, [pretestConfig.courseAssessmentId]: next }))}
              errors={showAllErrors || isDirty(pretestKey(pretestConfig.courseAssessmentId), pretestDraft) ? pretestErrors(pretestDraft) : []}
            />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">Modul nemá pretest — student by procvičování a test dostal bez něj.</p>
              <Button variant="brand-solid" size="sm" onClick={() => handleAttach('pretest', 'pretest', true, selectedModule.moduleId)}>
                Vytvořit pretest
              </Button>
            </div>
          )}
        </section>
      );
    }
    return (
      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Procvičování a test modulu</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Formáty v procvičování dostane student po pretestu, test na konci modulu. Povinné musí splnit, aby postoupil dál.
          </p>
        </div>
        {renderFormatCards(formatTab, moduleFormatConfigs.filter((c) => c.context === formatTab), selectedModule.moduleId)}
      </section>
    );
  };

  // Záložky v hlavičce panelu (jako Příručka/Procvičování ve schvalování), karty jsou v body
  const showFormatTabs = section === 'tests' && !finalSelected && !!selectedModule && !assessmentsLoading && !assessmentsError;
  const renderFormatTabs = () => (
    <Tabs value={formatTab} onValueChange={(value) => setFormatTab(value as ModuleContext)} className="mt-3 gap-0">
      <TabsList variant="line" className="gap-2 p-0 group-data-horizontal/tabs:h-auto">
        {MODULE_CONTEXTS.map((context) => {
          const contextConfigs = moduleFormatConfigs.filter((c) => c.context === context);
          const hasErrors = contextConfigs.some((c) => formatErrors(c).length > 0);
          return (
            <TabsTrigger key={context} value={context} className={FORMAT_TAB}>
              {CONTEXT_LABELS[context]}
              {contextConfigs.length > 0 && (
                <span className="rounded-full bg-current/15 px-1.5 text-xs leading-5">{contextConfigs.length}</span>
              )}
              {hasErrors && (
                <span className="size-1.5 rounded-full bg-destructive">
                  <span className="sr-only">(obsahuje chyby)</span>
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );

  const pageTitle = section === 'pretest' ? 'Tvorba pretestu' : 'Tvorba testů';
  const panelTitle = finalSelected
    ? 'Závěrečný test kurzu'
    : selectedModule
      ? `${section === 'pretest' ? 'Pretest' : 'Testy'} modulu: ${selectedModule.title}`
      : section === 'pretest' ? 'Pretest' : 'Testy';

  const renderFinalEditor = () => (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Závěrečný test se studentovi odemkne po splnění testů všech modulů. Splněním povinného závěrečného testu je kurz dokončený.
      </p>
      {renderFormatCards('course_final', finalConfigs, null)}
    </section>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-muted">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${courseTitle} / ${pageTitle}`}
        title={pageTitle}
        stepLabel={courseStepLabel(section)}
        saveStatus={saveStatus}
        preview={{ active: previewOpen, onToggle: () => setPreviewOpen((open) => !open) }}
        showFullscreenToggle
        showButtons={true}
        onMenuClick={() => setMobileOutlineOpen(true)}
        onCommentsClick={showCommentsPanel ? () => setCommentsOpen((open) => !open) : undefined}
        commentsCount={showCommentsPanel ? currentModuleFeedbacks.filter(fb => !fb.isResolved).length : undefined}
        commentsOpen={commentsOpen}
        headerRef={reviewHeaderRef}
      />
      {/* Lišta „Fáze tvorby“ je nahrazená kartou „Tvorba kurzu“ */}
      {/* <CourseStepNav current="tests" onNavigate={handleStepNavigate} /> */}
      {previewOpen ? (
        <StudentPreview
          course={courseData ?? { title: courseTitle }}
          modules={modules}
          assessments={previewAssessments}
          start={{ screen: 'module', moduleIndex: selectedModuleIndex, tab: 'procvicovani' }}
          onExit={() => setPreviewOpen(false)}
        />
      ) : (
      <>
      <CourseCreationTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'rubric' ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 view-fade-in">
          <CourseRubric />
        </div>
      ) : (
      <>
      {/* Resubmit banner */}
      {/* {isEdited && hasFeedbacks && (
        <div className="bg-warning/10 border-b border-warning/30 px-6 py-2.5 flex items-center justify-between shrink-0">
          <p className="text-sm text-warning">
            Kurz byl zamítnut — vyřešte komentáře a odešlete znovu ke kontrole.
          </p>
          {canResubmit && (
            <Button
              variant="brand-solid"
              onClick={handleResubmit}
              disabled={resubmitLoading}
              className={cn(BTN_KEEP_BOX, "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50")}
            >
              <ArrowUpCircle size={14} />
              {resubmitLoading ? 'Odesílání...' : 'Odeslat ke kontrole'}
            </Button>
          )}
        </div>
      )} */}

      {validationErrors.length > 0 && (
        <div className="mx-4 sm:mx-6 mt-2 bg-destructive/10 rounded-lg p-2">
          <div className="flex items-center gap-2 text-destructive font-medium mb-2">
            <span>Opravte následující chyby:</span>
          </div>
          <ul className="list-disc list-inside text-foreground text-sm space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>
                <Button
                  variant="plain"
                  onClick={() => showValidationError(err)}
                  className={cn(BTN_KEEP_BOX, 'cursor-pointer justify-start p-0 text-left font-normal whitespace-normal hover:underline')}
                >
                  <span><span className="font-medium">{err.moduleName}</span>: {err.message}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:gap-6 min-h-0 view-fade-in">
        {/* Karta „Tvorba kurzu“ — nahrazuje Osnovu kurzu (moduly jsou pod aktivním krokem) */}
        {!focusMode && (
          <CourseStepsCard current={section} onNavigate={handleStepNavigate} hints={stepHints}>
            <StepModuleList items={stepModuleItems()} />
          </CourseStepsCard>
        )}

        {/* Left Sidebar - Course Outline (desktop) — nahrazeno kartou „Tvorba kurzu“
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
                    className="flex items-center gap-1.5 pl-8 pr-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer"
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
        */}

        {/* Mobile Outline Drawer — kitový Drawer řeší overlay i stacking */}
        <Drawer open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen} swipeDirection="left">
          <DrawerContent className="lg:hidden" aria-label="Tvorba kurzu">
            <CourseStepsCard
              current={section}
              onNavigate={handleStepNavigate}
              hints={stepHints}
              onClose={() => setMobileOutlineOpen(false)}
            >
              <StepModuleList items={stepModuleItems(() => setMobileOutlineOpen(false))} />
            </CourseStepsCard>
            {/* Osnova kurzu — nahrazena kartou „Tvorba kurzu“
            <CourseOutlineSidebar
                className="flex w-full flex-1 flex-col bg-card overflow-hidden"
                items={outlineItems}
                onClose={() => setMobileOutlineOpen(false)}
                onToggle={(index) => {
                  const isOpening = !expandedOutlineItems.has(index);
                  toggleOutlineItem(index);
                  if (isOpening) selectModule(index);
                }}
                onSelect={(index) => {
                  selectModule(index);
                  setMobileOutlineOpen(false);
                }}
                renderSubItems={(item, index) => {
                  const subItems = (item as typeof outlineItems[number]).subItems;
                  if (!subItems || subItems.length === 0) return null;
                  return (
                    <div className="pb-2">
                      {subItems.map((subItem) => (
                        <div
                          key={subItem.id}
                          className="flex items-center gap-1.5 pl-8 pr-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToQuestion(index, subItem.questionIndex);
                            setMobileOutlineOpen(false);
                          }}
                        >
                          <span className="truncate">{subItem.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
            />
            */}
          </DrawerContent>
        </Drawer>

        {/* Center Content - Test Editor */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 bg-card rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">{panelTitle}</h2>
            {showFormatTabs && renderFormatTabs()}
          </div>

          <div ref={editorScrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
            {assessmentsLoading ? (
              <LoadingState />
            ) : assessmentsError ? (
              <p role="alert" className="text-sm text-destructive">{assessmentsError}</p>
            ) : finalSelected ? (
              renderFinalEditor()
            ) : (
              renderModuleEditor()
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-t border-border bg-card">
            <Button variant="plain" type="button" onClick={handleBack} className={cn(BTN_KEEP_BOX, "text-muted-foreground hover:text-foreground transition-colors text-sm font-medium px-2")}>
              Zpět
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              {!isLastModule && !finalSelected && (
                <Button
                  variant="brand-solid"
                  onClick={handleNextModule}
                  className={cn(BTN_KEEP_BOX, "flex items-center gap-2 px-3 sm:px-5 py-2 rounded-md transition-colors text-sm")}
                >
                  <span className="hidden sm:inline">Uložit a pokračovat na modul {selectedModuleIndex + 2}</span>
                  <span className="sm:hidden">Uložit a modul {selectedModuleIndex + 2}</span>
                </Button>
              )}
              {section === 'pretest' ? (
                <Button
                  variant="default"
                  onClick={() => handleStepNavigate('tests')}
                  className={cn(BTN_KEEP_BOX, "flex items-center gap-2 px-3 sm:px-5 py-2 rounded-md transition-colors text-sm")}
                >
                  <span className="hidden sm:inline">Pokračovat na testy</span>
                  <span className="sm:hidden">Pokračovat</span>
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleFinish}
                  className={cn(BTN_KEEP_BOX, "flex items-center gap-2 px-3 sm:px-5 py-2 rounded-md transition-colors text-sm")}
                >
                  <span>Dokončit</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Komentáře garanta — panel vyjíždí zprava přes obsah (všechny šířky) */}
        {showCommentsPanel && (
          <AuthorCommentsDrawer
            open={commentsOpen}
            onOpenChange={setCommentsOpen}
            anchorRef={reviewHeaderRef}
            subtitle={modules[selectedModuleIndex] ? `Modul: ${modules[selectedModuleIndex].title}` : undefined}
            feedbacks={currentModuleFeedbacks}
            allFeedbacks={feedbacks}
            emptyText="K tomuto modulu nejsou žádné komentáře."
            contextLabel={(fb) => reviewFeedbackLabel(fb)}
            onReply={replyToReviewFeedback}
            onToggleResolve={toggleReviewFeedback}
          />
        )}
      </div>
      </>
      )}
      </>
      )}

      <ConfirmModal
        isOpen={detachTarget !== null}
        title="Odebrat formát?"
        message={detachTarget
          ? `${formatName(detachTarget.assessmentTypeCode)} se odebere z kurzu. Pokusy, které už studenti odevzdali, zůstanou v historii.`
          : ''}
        confirmLabel="Odebrat"
        variant="danger"
        loading={detaching}
        onConfirm={handleDetach}
        onCancel={() => setDetachTarget(null)}
      />
    </div>
  );
}

export default CourseTestsView;
