'use client';

import { useState, useEffect } from 'react';
import { Module, Course } from '@/api';
import { getCourse, updateCourse, updateModule, listCourseFiles, downloadCourseFile, type CourseFileItem } from '@/lib/api-client';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState, CourseCreationTabs, CourseRubric, CourseStepNav, CourseCategoryFields, ModuleModal, type CreationTab, type CourseStep, type ModuleFormData } from '@/components/admin';
import { Drawer, DrawerContent, Button, Input, Textarea, ModuleCategories } from '@/components/ui';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCatalogData } from '@/hooks/useCatalogData';
import { czechPlural, BTN_KEEP_BOX, cn } from '@/lib/utils';
import {
  courseCategoryValues, courseToUpdate, crossSubjectIdsFor, crossSubjectsRule, validateCourseCategories,
  moduleCategoryValues, moduleToUpdate, validateModuleCategories,
  type CourseCategoryValues,
} from '@/lib/course-categories';
import { readApiErrorDetail } from '@/lib/api-error';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Pencil,
  X,
} from 'lucide-react';

interface CourseSummaryViewProps {
  courseId: number;
}

// Souhrn kurzu s přehledem modulů
export function CourseSummaryView({ courseId }: CourseSummaryViewProps) {
  const { goToCourseTests, goToCourseContent, goToCourses } = useAdminNavigation();
  
  const [activeTab, setActiveTab] = useState<CreationTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set());
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedCategories, setEditedCategories] = useState<CourseCategoryValues>({
    krauuCompetenceIds: [],
    bloomLevelIds: [],
    crossSubjectIds: [],
  });
  // Chyba uložení se ukazuje u formuláře — `error` přepíná celý pohled na ErrorState.
  const [saveError, setSaveError] = useState('');
  const { blocks, neuroPrinciples, krauuCompetences, bloomLevels, crossSubjects, loading: catalogsLoading } = useCatalogData();
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  // Úprava modulu (název, perex, číselníky) — AI je naplní, autor je ale musí
  // umět opravit i tady, ne jen v editoru obsahu. `null` = modal zavřený.
  const [moduleForm, setModuleForm] = useState<ModuleFormData | null>(null);
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const [showModuleCategoryErrors, setShowModuleCategoryErrors] = useState(false);
  const [courseFiles, setCourseFiles] = useState<CourseFileItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        const courseData = await getCourse(courseId);
        setCourse(courseData);
        setModules(courseData.modules || []);
        setEditedTitle(courseData.title || '');
        setEditedDescription(courseData.description || '');
        setEditedCategories(courseCategoryValues(courseData));
        // Rozbalit všechny moduly
        setExpandedOutlineItems(new Set((courseData.modules || []).map((_, i) => i)));
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Nepodařilo se načíst kurz');
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    async function loadFiles() {
      setFilesLoading(true);
      try {
        const files = await listCourseFiles(courseId);
        setCourseFiles(files);
      } catch (err) {
        console.error('Failed to load course files:', err);
      } finally {
        setFilesLoading(false);
      }
    }
    loadFiles();
  }, [courseId]);

  const handleDownloadFile = async (file: CourseFileItem) => {
    setDownloadingFileId(file.fileId);
    try {
      await downloadCourseFile(courseId, file.fileId, file.filename);
    } catch (err) {
      console.error('Failed to download course file:', err);
      setError('Soubor se nepodařilo stáhnout');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const toggleOutlineItem = (index: number) => {
    setExpandedOutlineItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getTotalQuestions = () => {
    return modules.reduce((total, module) => {
      return total + (module.practiceQuestions?.length || 0);
    }, 0);
  };

  const handleBack = () => {
    goToCourseTests(courseId);
  };

  const openModuleEdit = (module: Module) => {
    setModuleForm({
      moduleId: module.moduleId,
      title: module.title,
      perex: module.perex ?? '',
      courseId: module.courseId,
      // Chybějící KRAUU / Bloom modul zdědí z kurzu — autor je vidí a může upravit.
      categories: moduleCategoryValues(module, course, neuroPrinciples),
    });
    setModuleError('');
    setShowModuleCategoryErrors(false);
  };

  const closeModuleEdit = () => {
    if (moduleSaving) return;
    setModuleForm(null);
    setModuleError('');
    setShowModuleCategoryErrors(false);
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm?.moduleId) return;
    const existing = modules.find(m => m.moduleId === moduleForm.moduleId);
    if (!existing) {
      setModuleError('Modul se nepodařilo najít. Obnovte stránku a zkuste to znovu.');
      return;
    }
    if (!moduleForm.title.trim()) {
      setModuleError('Zadejte název modulu.');
      return;
    }
    // Backend chce u modulu alespoň jeden princip, KRAUU i Bloom —
    // chybějící položky zvýrazníme přímo ve formuláři.
    const categoryError = validateModuleCategories(moduleForm.categories);
    if (categoryError) {
      setShowModuleCategoryErrors(true);
      setModuleError(categoryError);
      return;
    }

    setModuleSaving(true);
    setModuleError('');
    try {
      const updated = await updateModule(
        moduleForm.moduleId,
        moduleToUpdate(existing, moduleForm.categories, {
          title: moduleForm.title.trim(),
          perex: moduleForm.perex.trim(),
        }),
      );
      // PUT vrací modul bez otázek a bloků — ty si necháme z načteného kurzu,
      // aby souhrn dál počítal otázky správně.
      setModules(prev => prev.map(m => (
        m.moduleId === updated.moduleId
          ? { ...m, ...updated, learnBlocks: m.learnBlocks, practiceQuestions: m.practiceQuestions }
          : m
      )));
      setModuleForm(null);
      setShowModuleCategoryErrors(false);
    } catch (err) {
      setModuleError(
        (await readApiErrorDetail(err))
          ?? (err instanceof Error && err.message ? err.message : 'Nepodařilo se uložit modul'),
      );
    } finally {
      setModuleSaving(false);
    }
  };

  // Přepnutí mezi fázemi tvorby přes krokový přepínač
  const handleStepNavigate = async (step: CourseStep) => {
    if (step === 'summary') return;
    try {
      await saveCourseChanges();
    } catch (err) {
      await reportSaveError(err);
      return;
    }
    if (step === 'content') goToCourseContent(courseId);
    else goToCourseTests(courseId);
  };

  const [savingOnly, setSavingOnly] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const crossRule = crossSubjectsRule(blocks, course?.courseBlockId);

  const saveCourseChanges = async () => {
    if (!course) return;
    const categoryError = validateCourseCategories(editedCategories, crossRule);
    if (categoryError) {
      setActiveTab('general');
      throw new Error(categoryError);
    }
    setSaveError('');
    await updateCourse(courseId, courseToUpdate(course, {
      title: editedTitle,
      description: editedDescription,
      ...editedCategories,
      crossSubjectIds: crossSubjectIdsFor(crossRule, editedCategories.crossSubjectIds),
    }));
  };

  const reportSaveError = async (err: unknown) => {
    console.error('Failed to save course:', err);
    setSaveError(
      (await readApiErrorDetail(err))
        ?? (err instanceof Error && err.message ? err.message : 'Nepodařilo se uložit kurz'),
    );
  };

  const handleSave = async () => {
    if (savingOnly) return;
    setSavingOnly(true);
    try {
      await saveCourseChanges();
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (err) {
      await reportSaveError(err);
    } finally {
      setSavingOnly(false);
    }
  };

  const handleFinish = async () => {
    if (!course) return;

    setSaving(true);
    try {
      await saveCourseChanges();
      goToCourses();
    } catch (err) {
      await reportSaveError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !course) {
    return <ErrorState message={error || 'Kurz nenalezen'} />;
  }

  const outlinePanelInner = (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-foreground">Osnova kurzu</h2>
        <Button
          variant="plain"
          className={cn(BTN_KEEP_BOX, "lg:hidden p-1 hover:bg-muted rounded")}
          onClick={() => setMobileOutlineOpen(false)}
          aria-label="Zavřít osnovu"
        >
          <X size={16} className="text-muted-foreground" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {modules.map((module, index) => (
          <div key={module.moduleId} className="border-b border-border last:border-b-0">
            <div
              className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 border-l-4 border-l-transparent"
              onClick={() => toggleOutlineItem(index)}
            >
              {expandedOutlineItems.has(index) ? (
                <ChevronDown size={16} className="text-muted-foreground" />
              ) : (
                <ChevronUp size={16} className="text-muted-foreground" />
              )}
              <span className="text-sm text-foreground font-medium truncate">{module.title}</span>
            </div>
            {expandedOutlineItems.has(index) && (
              <div className="pb-2 pl-10 pr-4">
                <span className="text-xs text-muted-foreground">
                  {module.practiceQuestions?.length || 0} {czechPlural(module.practiceQuestions?.length || 0, 'otázka', 'otázky', 'otázek')}
                </span>
              </div>
            )}
          </div>
        ))}

        {modules.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Žádné moduly
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-muted">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${course.title} / Souhrn kurzu`}
        title="Souhrn kurzu"
        onSave={handleSave}
        saving={savingOnly}
        saved={savedFeedback}
        showButtons={true}
        onMenuClick={() => setMobileOutlineOpen(true)}
      />
      <CourseStepNav current="summary" onNavigate={handleStepNavigate} />
      <CourseCreationTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:gap-6 min-h-0 view-fade-in">
        {/* Left Content - Summary */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 bg-card rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Přehled kurzu</h2>
          </div>

          <div key={activeTab} className="flex-1 overflow-y-auto p-6 space-y-6 view-fade-in">
            {activeTab === 'general' && (
            <>
            {saveError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                {saveError}
              </div>
            )}

            {/* Editable Course Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Název kurzu</label>
                <Input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className={cn("h-auto md:text-base", "w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-transparent text-foreground")}
                  placeholder="Zadejte název kurzu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Popis kurzu</label>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className={cn("field-sizing-fixed min-h-0 md:text-base", "w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-transparent resize-none text-foreground")}
                  placeholder="Zadejte popis kurzu"
                />
              </div>
              {!catalogsLoading && (
                <CourseCategoryFields
                  values={editedCategories}
                  onChange={setEditedCategories}
                  krauuCompetences={krauuCompetences}
                  bloomLevels={bloomLevels}
                  crossSubjects={crossSubjects}
                  crossRule={crossRule}
                  // Starší kurzy tyto kategorie nemají — rovnou ukážeme, co je třeba doplnit.
                  showErrors
                  labelClassName="block text-sm font-medium text-foreground mb-1"
                  triggerClassName="w-full px-3 py-2 border border-border rounded-lg text-sm text-foreground bg-card data-[size=default]:h-auto"
                />
              )}
            </div>

            {/* Statistics - compact inline */}
            <div className="text-sm text-muted-foreground">
              {modules.length} {czechPlural(modules.length, 'modul', 'moduly', 'modulů')} • {getTotalQuestions()} {czechPlural(getTotalQuestions(), 'otázka', 'otázky', 'otázek')}
            </div>

            {/* Modules List */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/50 border-b border-border">
                <h4 className="font-medium text-foreground text-sm">Přehled modulů</h4>
              </div>
              <div className="divide-y divide-border">
                {modules.map((module, index) => (
                  <div key={module.moduleId} className="p-3 flex items-start gap-3">
                    <div className="shrink-0 size-6 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-foreground">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{module.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {module.practiceQuestions?.length || 0} {czechPlural(module.practiceQuestions?.length || 0, 'otázka', 'otázky', 'otázek')}
                      </p>
                      {module.perex && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{module.perex}</p>
                      )}
                      <ModuleCategories module={module} className="mt-2" />
                    </div>
                    <Button
                      variant="plain"
                      type="button"
                      onClick={() => openModuleEdit(module)}
                      disabled={catalogsLoading}
                      className={cn(BTN_KEEP_BOX, "shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50")}
                      title="Upravit název, perex a zařazení modulu"
                      aria-label={`Upravit modul ${module.title}`}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                ))}
                
                {modules.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Kurz zatím nemá žádné moduly
                  </div>
                )}
              </div>
            </div>

            {/* Podkladové materiály — z čeho byl kurz vygenerován */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/50 border-b border-border">
                <h4 className="font-medium text-foreground text-sm">Podkladové materiály</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Soubory, ze kterých byl kurz vygenerován</p>
              </div>
              {filesLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Načítám soubory...</div>
              ) : courseFiles.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Ke kurzu nejsou připojeny žádné podklady</div>
              ) : (
                <ul className="divide-y divide-border">
                  {courseFiles.map((file) => (
                    <li key={file.fileId} className="p-3 flex items-center gap-3">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0 text-sm text-foreground truncate" title={file.filename}>
                        {file.filename}
                      </span>
                      <Button
                        variant="plain"
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        disabled={downloadingFileId === file.fileId}
                        className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-r/10 text-gradient-r hover:bg-gradient-r/20 text-xs font-medium transition-colors disabled:opacity-50")}
                      >
                        <Download className="size-3.5" />
                        {downloadingFileId === file.fileId ? 'Stahuji...' : 'Stáhnout'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            </>
            )}

            {activeTab === 'rubric' && (
              <CourseRubric />
            )}

          </div>

          <PageFooterActions
            onBack={handleBack}
            onContinue={handleFinish}
            continueLabel={saving ? 'Ukládám...' : 'Dokončit'}
            backLabel="Zpět k testům"
            continueDisabled={saving}
          />
        </div>

        {/* Right Sidebar - Course Outline (desktop) */}
        <div className="hidden lg:flex w-64 shrink-0 bg-card rounded-lg shadow-sm overflow-hidden border border-border flex-col">
          {outlinePanelInner}
        </div>

        {/* Mobile Outline Drawer — kitový Drawer řeší overlay i stacking */}
        <Drawer open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen} swipeDirection="left">
          <DrawerContent className="lg:hidden" aria-label="Struktura kurzu">
            {outlinePanelInner}
          </DrawerContent>
        </Drawer>
      </div>

      {/* Úprava modulu — stejný formulář jako v přehledu kurzů */}
      {moduleForm && (
        <ModuleModal
          isOpen
          mode="edit"
          formData={moduleForm}
          courses={[course]}
          neuroPrinciples={neuroPrinciples}
          krauuCompetences={krauuCompetences}
          bloomLevels={bloomLevels}
          showCategoryErrors={showModuleCategoryErrors}
          loading={moduleSaving}
          error={moduleError}
          onClose={closeModuleEdit}
          onSubmit={handleModuleSubmit}
          onChange={setModuleForm}
        />
      )}
    </div>
  );
}

export default CourseSummaryView;
