'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Loader2, Upload, X, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createCourse, uploadCourseFile, generateCourseWithAI, type CourseGenerationProgress } from '@/lib/api-client';
import { CoursePageHeader, CourseCategoryFields, CourseStepsCard, courseStepLabel } from '@/components/admin';
import { useCourseGeneration, COURSE_GENERATION_FINISHED_EVENT, type CourseGenerationFinishedDetail } from '@/components/admin/CourseGenerationProvider';
import { BackgroundGenerationsBanner, GenerationProgressCard } from '@/components/admin/GenerationProgress';
import { Button, CatalogSelect, FilterSelect, Modal, Input, Textarea } from '@/components/ui';
import { Difficulty } from '@/api';
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from '@/lib/difficulty';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { useCatalogData } from '@/hooks/useCatalogData';
import { crossSubjectsRule, subjectAllowed, validateCourseCategories, type CourseCategoryValues } from '@/lib/course-categories';
import { readApiErrorDetail } from '@/lib/api-error';
// Průběh zobrazený hned po spuštění, než backend vrátí první stav.
const INITIAL_PROGRESS: CourseGenerationProgress = {
  step: 0, total: 5, label: 'Spouštění generování', status: 'running', error: null,
};

// Tvorba kurzu pomocí AI generování
export function CourseAICreateView() {
  const { goToCourses, goToCourseContent } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'uploading' | 'generating'>('form');
  const [error, setError] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  // Kurz založený v tomto formuláři. Jeho generování sleduje CourseGenerationProvider
  // (polling přežije odchod ze stránky) — tady se jen čte průběh a reaguje na dokončení.
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const generation = useCourseGeneration();
  const progress = activeCourseId !== null ? generation.getProgress(activeCourseId) : null;
  // Generace jiných kurzů běžící na pozadí (po refreshi nebo spuštěné z přehledu)
  const backgroundGenerations = Array.from(generation.generations.values())
    .filter((g) => g.courseId !== activeCourseId);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    blocks, targets, subjects, requirements, eqfLevels, types, krauuCompetences, bloomLevels, crossSubjects,
    loading: catalogsLoading, error: catalogsError,
  } = useCatalogData();
  const [showCategoryErrors, setShowCategoryErrors] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    moduleCount: number;
    durationMinutes: string;
    courseBlockId: number;
    courseTargetId: number;
    courseSubjectId: number;
    courseRequirementId: number;
    courseEqfLevelId: number;
    courseTypeId: number;
    difficulty: Difficulty;
  } & CourseCategoryValues>({
    title: '',
    description: '',
    moduleCount: 3,
    durationMinutes: '',
    courseBlockId: 0,
    courseTargetId: 0,
    courseSubjectId: 0,
    courseRequirementId: 0,
    courseEqfLevelId: 0,
    courseTypeId: 0,
    // Default obtížnosti dle požadavku — mírně pokročilý.
    difficulty: Difficulty.SlightlyAdvanced,
    krauuCompetenceIds: [],
    bloomLevelIds: [],
    crossSubjectIds: [],
  });

  // Dokončení generování kurzu z tohoto formuláře (událost vysílá provider):
  // hotový kurz rovnou otevřeme v editoru, selhání ukážeme v modalu s „Zkusit znovu".
  useEffect(() => {
    if (activeCourseId === null) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CourseGenerationFinishedDetail>).detail;
      if (detail.courseId !== activeCourseId) return;
      if (detail.status === 'completed') {
        goToCourseContent(activeCourseId);
        return;
      }
      setGenerationError(
        detail.status === 'failed'
          ? (detail.error || 'Generování kurzu se nezdařilo. Zkuste to prosím znovu.')
          : 'Server o běžícím generování neví, nejspíš byl mezitím restartován. Spusťte generování znovu.',
      );
      setStep('form');
      setLoading(false);
    };
    window.addEventListener(COURSE_GENERATION_FINISHED_EVENT, handler);
    return () => window.removeEventListener(COURSE_GENERATION_FINISHED_EVENT, handler);
  }, [activeCourseId, goToCourseContent]);

  // Spuštění generování už založeného kurzu (první pokus i „Zkusit znovu").
  // Backend task spustí na pozadí a hned se vrátí; průběh přebírá provider.
  const startGeneration = async (courseId: number, title: string) => {
    setGenerationError(null);
    setStep('generating');
    setLoading(true);
    try {
      await generateCourseWithAI(courseId);
    } catch (genErr: unknown) {
      setGenerationError(
        (await readApiErrorDetail(genErr))
          ?? (genErr instanceof Error && genErr.message ? genErr.message : 'Generování kurzu se nezdařilo. Zkuste to prosím znovu.'),
      );
      setStep('form');
      setLoading(false);
      return;
    }
    generation.track(courseId, title);
  };

  // Po načtení katalogů předvyplníme povinné selecty první položkou (blok a obor
  // jsou volitelné, zůstávají „Neurčeno“).
  const catalogDefaultsRef = useRef(false);
  useEffect(() => {
    if (catalogsLoading || catalogDefaultsRef.current) return;
    catalogDefaultsRef.current = true;
    setFormData(prev => ({
      ...prev,
      courseEqfLevelId: prev.courseEqfLevelId || (eqfLevels[0]?.eqfLevelId ?? 0),
      courseTypeId: prev.courseTypeId || (types[0]?.typeId ?? 0),
    }));
  }, [catalogsLoading, eqfLevels, types]);

  useEffect(() => {
    if (catalogsError) setError('Nepodařilo se načíst katalogy');
  }, [catalogsError]);

  const crossRule = crossSubjectsRule(blocks, formData.courseBlockId);

  const ACCEPTED_TYPES = '.md,.docx';
  const ACCEPTED_EXTENSIONS = ['md', 'docx'];
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return ACCEPTED_EXTENSIONS.includes(ext);
    });
    if (valid.length === 0) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
    setError('');
  }, []);

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const title = formData.title.trim();
    if (title.length < 3 || title.length > 120) {
      setError('Název kurzu musí mít 3 až 120 znaků.');
      return;
    }
    const desc = formData.description.trim();
    if (desc.length < 3 || desc.length > 500) {
      setError('Popis kurzu musí mít 3 až 500 znaků.');
      return;
    }
    if (formData.moduleCount < 1 || formData.moduleCount > 12) {
      setError('Počet modulů musí být mezi 1 a 12.');
      return;
    }
    const duration = formData.durationMinutes ? parseInt(formData.durationMinutes) : 0;
    if (formData.durationMinutes && (duration < 15 || duration > 300)) {
      setError('Délka kurzu musí být mezi 15 a 300 minutami.');
      return;
    }

    const categoryError = validateCourseCategories(formData, crossRule);
    if (categoryError) {
      setShowCategoryErrors(true);
      setError(categoryError);
      return;
    }

    if (files.length === 0) {
      setError('Prosím nahrajte alespoň jeden soubor s podklady');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setStep('uploading');
      
      if (formData.courseEqfLevelId === 0 || formData.courseTypeId === 0) {
        throw new Error('Prosím vyplňte všechny katalogové údaje');
      }

      let course;
      try {
        course = await createCourse({
          title: formData.title,
          description: formData.description || undefined,
          modulesCountAiGenerated: formData.moduleCount,
          durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : formData.moduleCount * 20,
          // 0 = „Neurčeno“ — blok, obor a povinnost jsou na backendu volitelné.
          courseBlockId: formData.courseBlockId || null,
          courseTargetId: formData.courseTargetId || null,
          courseSubjectId: subjectAllowed(blocks, formData.courseBlockId) ? formData.courseSubjectId || null : null,
          courseRequirementId: formData.courseRequirementId || undefined,
          courseEqfLevelId: formData.courseEqfLevelId,
          courseTypeId: formData.courseTypeId,
          difficulty: formData.difficulty,
          krauuCompetenceIds: formData.krauuCompetenceIds,
          bloomLevelIds: formData.bloomLevelIds,
          crossSubjectIds: formData.crossSubjectIds,
        });
      } catch (createErr: unknown) {
        const detail = await readApiErrorDetail(createErr);
        if (detail) throw new Error(detail);
        throw createErr;
      }

      // Nahrání všech souborů
      for (const file of files) {
        await uploadCourseFile(course.courseId, file);
      }

      // Generování kurzu pomocí AI — kurz i podklady už jsou uložené, takže
      // případné selhání jde zopakovat bez nového vyplňování formuláře.
      setActiveCourseId(course.courseId);
      await startGeneration(course.courseId, formData.title.trim());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: Response }).response;
        try {
          const data = await response.json();
          setError(data.detail || 'Nepodařilo se vytvořit kurz');
        } catch {
          setError(`Chyba serveru: ${response.status}`);
        }
      } else {
        setError('Nepodařilo se vytvořit kurz');
      }
      setStep('form');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  const getStepMessage = () => {
    switch (step) {
      case 'uploading':
        return 'Nahrávám podklady...';
      case 'generating':
        return 'AI generuje kurz... Toto může trvat několik minut.';
      default:
        return 'Pokračovat';
    }
  };

  return (
    <div className="flex-1 lg:h-full lg:overflow-hidden flex flex-col">
      <div className="shrink-0">
        <CoursePageHeader
          breadcrumb="Kurzy / Přehled kurzů / Popis kurzu"
          title="Popis kurzu"
          stepLabel={courseStepLabel('description')}
          onSave={handleSave}
          showButtons={false}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden">
      {/* Karta „Tvorba kurzu“ — nový kurz zatím nemá ID, další kroky jsou
          dostupné až po vygenerování (pak se otevřou Podklady) */}
      <CourseStepsCard
        current="description"
        disabledSteps={['content', 'tests', 'summary']}
        className="lg:mt-8 lg:ml-8"
      />

      {/* Sloupcový flex, aby se karta průběhu mohla roztáhnout (flex-1) na zbytek
          výšky a vycentrovat — procentuální min-h by přes několik flex vrstev
          nemusela mít z čeho počítat */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        {step !== 'generating' && (
          <BackgroundGenerationsBanner generations={backgroundGenerations} onGoToCourses={goToCourses} />
        )}

        {step === 'generating' ? (
          // Karta uprostřed obsahové plochy: vodorovně vždy, svisle od lg
          // (na mobilu u horního okraje, ať není pod ohybem).
          <div className="flex-1 flex items-start lg:items-center justify-center">
            <GenerationProgressCard progress={progress ?? INITIAL_PROGRESS} onGoToCourses={goToCourses} />
          </div>
        ) : (
        <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Název kurzu */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Název kurzu
              </label>
              <Input
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={cn("h-auto md:text-base", "w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground")}
                placeholder="Výběr zrn kávy"
              />
              <span className="text-xs text-muted-foreground mt-1">{formData.title.length}/120</span>
            </div>

            {/* Katalogové údaje */}
            {catalogsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Načítám katalogy...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Tematický blok
                  </label>
                  <CatalogSelect
                    value={formData.courseBlockId}
                    onValueChange={(next) => setFormData({ ...formData, courseBlockId: next })}
                    options={blocks.map((b) => ({ value: b.blockId, label: b.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Tematický blok"
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Cílová skupina
                  </label>
                  <CatalogSelect
                    value={formData.courseTargetId}
                    onValueChange={(next) => setFormData({ ...formData, courseTargetId: next })}
                    options={targets.map((t) => ({ value: t.targetId, label: t.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Cílová skupina"
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Obor
                  </label>
                  <CatalogSelect
                    value={subjectAllowed(blocks, formData.courseBlockId) ? formData.courseSubjectId : 0}
                    onValueChange={(next) => setFormData({ ...formData, courseSubjectId: next })}
                    disabled={!subjectAllowed(blocks, formData.courseBlockId)}
                    options={subjects.map((s) => ({ value: s.subjectId, label: s.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Obor"
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    EQF úroveň *
                  </label>
                  <CatalogSelect
                    value={formData.courseEqfLevelId}
                    onValueChange={(next) => setFormData({ ...formData, courseEqfLevelId: next })}
                    options={eqfLevels.map((l) => ({ value: l.eqfLevelId, label: `${l.code} – ${l.name}` }))}
                    aria-label="EQF úroveň"
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Typ kurzu *
                  </label>
                  <CatalogSelect
                    value={formData.courseTypeId}
                    onValueChange={(next) => setFormData({ ...formData, courseTypeId: next })}
                    options={types.map((t) => ({ value: t.typeId, label: t.name }))}
                    aria-label="Typ kurzu"
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Povinnost kurzu
                  </label>
                  <CatalogSelect
                    value={formData.courseRequirementId}
                    onValueChange={(next) => setFormData({ ...formData, courseRequirementId: next })}
                    options={requirements.map((r) => ({ value: r.requirementId, label: r.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Povinnost kurzu"
                    className="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
                  />
                </div>
              </div>
            )}

            {/* Pedagogické zařazení — KRAUU, Bloom, průřezové obory */}
            {!catalogsLoading && (
              <CourseCategoryFields
                values={formData}
                onChange={(next) => setFormData({ ...formData, ...next })}
                krauuCompetences={krauuCompetences}
                bloomLevels={bloomLevels}
                crossSubjects={crossSubjects}
                crossRule={crossRule}
                showErrors={showCategoryErrors}
                triggerClassName="w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card data-[size=default]:h-auto"
              />
            )}

            {/* Popis kurzu */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Popis kurzu
              </label>
              <Textarea
                required
                rows={6}
                minLength={3}
                maxLength={500}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={cn("field-sizing-fixed min-h-0 md:text-base", "w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground resize-none")}
                placeholder="V této kapitole se studenti seznámí s hlavními typy kávových zrn..."
              />
              <span className="text-xs text-muted-foreground mt-1">{formData.description.length}/500</span>
            </div>

            {/* Počet modulů + Doporučená obtížnost + Délka kurzu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Počet modulů
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="plain"
                    type="button"
                    aria-label="Snížit počet modulů"
                    disabled={formData.moduleCount <= 1}
                    onClick={() => setFormData({ ...formData, moduleCount: Math.max(1, formData.moduleCount - 1) })}
                    className={cn(BTN_KEEP_BOX, "size-10 flex items-center justify-center border border-border rounded-md hover:bg-muted/50 transition-colors text-xl text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent")}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.moduleCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, moduleCount: Math.min(12, Math.max(1, val)) });
                    }}
                    className={cn("h-auto md:text-base", "w-16 px-2 py-2 border border-border rounded-md text-center focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground")}
                  />
                  <Button
                    variant="plain"
                    type="button"
                    aria-label="Zvýšit počet modulů"
                    disabled={formData.moduleCount >= 12}
                    onClick={() => setFormData({ ...formData, moduleCount: Math.min(12, formData.moduleCount + 1) })}
                    className={cn(BTN_KEEP_BOX, "size-10 flex items-center justify-center border border-border rounded-md hover:bg-muted/50 transition-colors text-xl text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent")}
                  >
                    +
                  </Button>
                  <span className="text-xs text-muted-foreground ml-1">
                    max 12
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Doporučená obtížnost
                </label>
                <FilterSelect
                  value={formData.difficulty}
                  onChange={(next) => setFormData({ ...formData, difficulty: next as Difficulty })}
                  placeholder="Doporučená obtížnost"
                  includeEmpty={false}
                  options={DIFFICULTY_ORDER.map((d: Difficulty) => ({
                    value: d,
                    label: DIFFICULTY_LABELS[d],
                  }))}
                  className="w-full data-[size=default]:h-auto px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground bg-card"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Délka kurzu (minuty)
                </label>
                <Input
                  type="number"
                  min="15"
                  max="300"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  className={cn("h-auto md:text-base", "w-full px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground")}
                  placeholder={String(formData.moduleCount * 20)}
                />
              </div>
            </div>


            {/* Nahrát podklady */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Nahrát podklady
              </label>

              {/* File list — nad upload polem, chipy v řadě */}
              {files.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {files.map((f) => (
                    <div
                      key={f.name}
                      className="inline-flex items-center gap-2 max-w-full px-3 py-1.5 bg-muted/50 border border-border rounded-md text-sm"
                    >
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground truncate max-w-[180px]" title={f.name}>{f.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <Button
                        variant="plain"
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className={cn(BTN_KEEP_BOX, "p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors shrink-0")}
                        title="Odebrat soubor"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-gradient-r/30 bg-gradient-r/10'
                    : 'border-border hover:border-border hover:bg-muted/50'
                }`}
              >
                <Upload className={`mx-auto mb-3 ${dragActive ? 'text-gradient-r' : 'text-muted-foreground'}`} size={32} />
                <p className="text-sm font-medium text-foreground mb-1">
                  Přetáhněte soubory sem nebo klikněte pro výběr
                </p>
                <p className="text-xs text-muted-foreground">
                  Markdown (.md) a Word (.docx) — lze vybrat více souborů najednou
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Tlačítka */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="plain"
                type="button"
                onClick={goToCourses}
                disabled={loading}
                className={cn(BTN_KEEP_BOX, "text-muted-foreground hover:text-foreground transition-colors text-sm disabled:opacity-50")}
              >
                Zpět
              </Button>
              <Button
                variant="plain"
                type="button"
                onClick={handleSubmit}
                disabled={loading || formData.title.trim().length < 3 || formData.description.trim().length < 3}
                className={cn(BTN_KEEP_BOX, "flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors")}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                <span>{loading ? getStepMessage() : 'Pokračovat'}</span>
              </Button>
            </div>
          </form>
        </div>
        )}
      </div>
      </div>

      <AnimatePresence>
        {step === 'uploading' && (
          <motion.div
            key="progress-upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            >
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="text-gradient-r animate-spin" />
                <h3 className="text-lg font-bold text-foreground">Nahrávání podkladů</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Soubory se nahrávají na server...</p>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Chyba generování — kitový Modal */}
      <Modal
        isOpen={generationError !== null}
        onClose={() => {
          setGenerationError(null);
          goToCourses();
        }}
        title="Generování kurzu selhalo"
        maxWidth="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setGenerationError(null);
                goToCourses();
              }}
            >
              Přejít na kurzy
            </Button>
            {activeCourseId !== null && (
              <Button size="lg" onClick={() => void startGeneration(activeCourseId, formData.title.trim())}>
                <RefreshCw data-icon="inline-start" />
                Zkusit znovu
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg bg-destructive/20 p-2">
            <AlertTriangle className="size-5 text-destructive" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm break-words text-muted-foreground">{generationError}</p>
            {activeCourseId !== null && (
              <p className="text-sm text-muted-foreground">
                Kurz s nahranými podklady zůstal uložený, generování můžete spustit znovu i později z přehledu kurzů.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CourseAICreateView;
