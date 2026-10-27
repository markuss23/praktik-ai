'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { createCourse, uploadCourseFile } from '@/lib/api-client';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCatalogData } from '@/hooks/useCatalogData';
import { Button, CatalogSelect, Input, Textarea } from '@/components/ui';
import { CourseCategoryFields } from '@/components/admin/CourseCategoryFields';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { crossSubjectsRule, subjectAllowed, validateCourseCategories } from '@/lib/course-categories';
import { readApiErrorDetail } from '@/lib/api-error';
// Nahrání souboru pro vytvoření kurzu
export function CourseUploadView() {
  const { goToCourses, goToCourseEdit } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    blocks, targets, subjects, requirements, eqfLevels, types, krauuCompetences, bloomLevels, crossSubjects,
    loading: catalogsLoading,
  } = useCatalogData();
  const [showCategoryErrors, setShowCategoryErrors] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseBlockId: 0,
    courseTargetId: 0,
    courseSubjectId: 0,
    courseRequirementId: 0,
    courseEqfLevelId: 0,
    courseTypeId: 0,
    krauuCompetenceIds: [] as number[],
    bloomLevelIds: [] as number[],
    crossSubjectIds: [] as number[],
  });

  // Povinné selecty předvyplníme první položkou; blok a obor jsou volitelné.
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

  const crossRule = crossSubjectsRule(blocks, formData.courseBlockId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/markdown',
        'text/plain',
      ];
      
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.md', '.txt'];
      const fileExt = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (allowedTypes.includes(selectedFile.type) || allowedExtensions.includes(fileExt)) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Nepodporovaný formát souboru. Povolené formáty: PDF, Word, Excel, Markdown');
        setFile(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Vyberte prosím soubor');
      return;
    }

    const categoryError = validateCourseCategories(formData, crossRule);
    if (categoryError) {
      setShowCategoryErrors(true);
      setError(categoryError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const course = await createCourse({
        title: formData.title,
        description: formData.description || undefined,
        courseBlockId: formData.courseBlockId || null,
        courseTargetId: formData.courseTargetId || null,
        courseSubjectId: subjectAllowed(blocks, formData.courseBlockId) ? formData.courseSubjectId || null : null,
        courseRequirementId: formData.courseRequirementId || undefined,
        courseEqfLevelId: formData.courseEqfLevelId,
        courseTypeId: formData.courseTypeId,
        krauuCompetenceIds: formData.krauuCompetenceIds,
        bloomLevelIds: formData.bloomLevelIds,
        crossSubjectIds: formData.crossSubjectIds,
      });
      
      await uploadCourseFile(course.courseId, file);
      
      // Přechod na editaci kurzu
      goToCourseEdit(course.courseId);
    } catch (err: unknown) {
      const detail = await readApiErrorDetail(err);
      if (detail) {
        setError(detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Nepodařilo se vytvořit kurz');
      }
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📁';
  };

  return (
    <div className="flex-1 lg:h-full lg:overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-card border-b shrink-0">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <Button
            variant="plain"
            onClick={goToCourses}
            className={cn(BTN_KEEP_BOX, "p-2 hover:bg-muted rounded-md transition-colors shrink-0")}
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Upload className="text-tip shrink-0" size={20} />
              <span className="truncate">Nahrát soubor kurzu</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              Kurz / Přehled kurzů / Nahrát soubor
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Název kurzu */}
          <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Název kurzu</h2>
            <Input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={cn("h-auto", "w-full px-3 sm:px-4 py-2 sm:py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tip/30 text-foreground text-sm sm:text-base")}
              placeholder="např. Jak komunikovat s AI?"
            />
          </div>

          {/* Popis kurzu */}
          <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Popis kurzu</h2>
            <Textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={cn("field-sizing-fixed min-h-0", "w-full px-3 sm:px-4 py-2 sm:py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tip/30 text-foreground resize-none text-sm sm:text-base")}
              placeholder="Stručný popis kurzu..."
            />
          </div>

          {/* Katalogové údaje */}
          <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Zařazení kurzu</h2>
            {catalogsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Načítám katalogy...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tematický blok</label>
                  <CatalogSelect
                    value={formData.courseBlockId}
                    onValueChange={(next) => setFormData({ ...formData, courseBlockId: next })}
                    options={blocks.map((b) => ({ value: b.blockId, label: b.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Tematický blok"
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Cílová skupina</label>
                  <CatalogSelect
                    value={formData.courseTargetId}
                    onValueChange={(next) => setFormData({ ...formData, courseTargetId: next })}
                    options={targets.map((t) => ({ value: t.targetId, label: t.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Cílová skupina"
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Obor</label>
                  <CatalogSelect
                    value={subjectAllowed(blocks, formData.courseBlockId) ? formData.courseSubjectId : 0}
                    onValueChange={(next) => setFormData({ ...formData, courseSubjectId: next })}
                    disabled={!subjectAllowed(blocks, formData.courseBlockId)}
                    options={subjects.map((s) => ({ value: s.subjectId, label: s.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Obor"
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">EQF úroveň *</label>
                  <CatalogSelect
                    value={formData.courseEqfLevelId}
                    onValueChange={(next) => setFormData({ ...formData, courseEqfLevelId: next })}
                    options={eqfLevels.map((l) => ({ value: l.eqfLevelId, label: `${l.code} – ${l.name}` }))}
                    aria-label="EQF úroveň"
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Typ kurzu *</label>
                  <CatalogSelect
                    value={formData.courseTypeId}
                    onValueChange={(next) => setFormData({ ...formData, courseTypeId: next })}
                    options={types.map((t) => ({ value: t.typeId, label: t.name }))}
                    aria-label="Typ kurzu"
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Povinnost kurzu</label>
                  <CatalogSelect
                    value={formData.courseRequirementId}
                    onValueChange={(next) => setFormData({ ...formData, courseRequirementId: next })}
                    options={requirements.map((r) => ({ value: r.requirementId, label: r.name }))}
                    emptyLabel="Neurčeno"
                    aria-label="Povinnost kurzu"
                    className="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                  />
                </div>
              </div>
            )}
            {!catalogsLoading && (
              <div className="mt-4">
                <CourseCategoryFields
                  values={formData}
                  onChange={(next) => setFormData({ ...formData, ...next })}
                  krauuCompetences={krauuCompetences}
                  bloomLevels={bloomLevels}
                  crossSubjects={crossSubjects}
                  crossRule={crossRule}
                  showErrors={showCategoryErrors}
                  labelClassName="block text-sm font-medium text-foreground mb-1"
                  triggerClassName="w-full px-3 py-2 border border-border rounded-md text-foreground bg-card text-sm data-[size=default]:h-auto"
                />
              </div>
            )}
          </div>

          {/* Upload souboru */}
          <div className="bg-card rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Nahrát soubor</h2>
            
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 sm:p-8 text-center cursor-pointer hover:border-tip/30 hover:bg-tip/10 transition-colors"
              >
                <Upload className="mx-auto mb-3 sm:mb-4 text-muted-foreground" size={36} />
                <p className="text-foreground font-medium mb-2 text-sm sm:text-base">
                  Klikněte pro výběr souboru
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  PDF, Word, Excel, Markdown
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.md,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-border rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-2xl sm:text-3xl shrink-0">{getFileIcon(file.type)}</span>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-sm sm:text-base truncate">{file.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="plain"
                  type="button"
                  onClick={handleRemoveFile}
                  className={cn(BTN_KEEP_BOX, "p-2 hover:bg-muted rounded-md transition-colors shrink-0")}
                >
                  <X size={20} className="text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>

          {/* Tlačítka */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <Button
              variant="plain"
              type="button"
              onClick={goToCourses}
              className={cn(BTN_KEEP_BOX, "px-4 sm:px-6 py-2 text-foreground hover:bg-muted rounded-md transition-colors text-sm sm:text-base")}
            >
              Zpět
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled={loading || !file}
              className={cn(BTN_KEEP_BOX, "px-4 sm:px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base")}
            >
              {loading ? 'Vytváření...' : 'Vytvořit kurz'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourseUploadView;
