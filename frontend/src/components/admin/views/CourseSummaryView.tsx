'use client';

import { useState, useEffect } from 'react';
import { Module, Course } from '@/api';
import { getCourse, updateCourse, listCourseFiles, downloadCourseFile, type CourseFileItem } from '@/lib/api-client';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState, CourseCreationTabs, CourseRubric, type CreationTab } from '@/components/admin';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { czechPlural } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  X,
} from 'lucide-react';

interface CourseSummaryViewProps {
  courseId: number;
}

// Souhrn kurzu s přehledem modulů
export function CourseSummaryView({ courseId }: CourseSummaryViewProps) {
  const { goToCourseTests, goToCourses } = useAdminNavigation();
  
  const [activeTab, setActiveTab] = useState<CreationTab>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set());
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
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

  const [savingOnly, setSavingOnly] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const saveCourseChanges = async () => {
    if (!course) return;
    await updateCourse(courseId, {
      title: editedTitle,
      description: editedDescription,
      courseBlockId: course.courseBlockId,
      courseTargetId: course.courseTargetId,
      courseSubjectId: course.courseSubjectId,
    });
  };

  const handleSave = async () => {
    if (savingOnly) return;
    setSavingOnly(true);
    try {
      await saveCourseChanges();
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to save course:', err);
      setError('Nepodařilo se uložit kurz');
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
      console.error('Failed to save course:', err);
      setError('Nepodařilo se uložit kurz');
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
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-black">Osnova kurzu</h2>
        <button
          className="lg:hidden p-1 hover:bg-gray-100 rounded"
          onClick={() => setMobileOutlineOpen(false)}
          aria-label="Zavřít osnovu"
        >
          <X size={16} className="text-gray-600" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {modules.map((module, index) => (
          <div key={module.moduleId} className="border-b border-gray-100 last:border-b-0">
            <div
              className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 border-l-4 border-l-transparent"
              onClick={() => toggleOutlineItem(index)}
            >
              {expandedOutlineItems.has(index) ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronUp size={16} className="text-gray-400" />
              )}
              <span className="text-sm text-black font-medium truncate">{module.title}</span>
            </div>
            {expandedOutlineItems.has(index) && (
              <div className="pb-2 pl-10 pr-4">
                <span className="text-xs text-gray-500">
                  {module.practiceQuestions?.length || 0} {czechPlural(module.practiceQuestions?.length || 0, 'otázka', 'otázky', 'otázek')}
                </span>
              </div>
            )}
          </div>
        ))}

        {modules.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            Žádné moduly
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${course.title} / Souhrn kurzu`}
        title="Souhrn kurzu"
        onSave={handleSave}
        saving={savingOnly}
        saved={savedFeedback}
        showButtons={true}
        onMenuClick={() => setMobileOutlineOpen(true)}
      />
      <CourseCreationTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:gap-6 min-h-0">
        {/* Left Content - Summary */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Přehled kurzu</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Editable Course Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název kurzu</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  placeholder="Zadejte název kurzu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Popis kurzu</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-black"
                  placeholder="Zadejte popis kurzu"
                />
              </div>
            </div>

            {/* Statistics - compact inline */}
            <div className="text-sm text-gray-500">
              {modules.length} {czechPlural(modules.length, 'modul', 'moduly', 'modulů')} • {getTotalQuestions()} {czechPlural(getTotalQuestions(), 'otázka', 'otázky', 'otázek')}
            </div>

            {/* Modules List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-black text-sm">Přehled modulů</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {modules.map((module, index) => (
                  <div key={module.moduleId} className="p-3 flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-black">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate">{module.title}</p>
                      <p className="text-xs text-gray-500">
                        {module.practiceQuestions?.length || 0} {czechPlural(module.practiceQuestions?.length || 0, 'otázka', 'otázky', 'otázek')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {modules.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Kurz zatím nemá žádné moduly
                  </div>
                )}
              </div>
            </div>

            {/* Podkladové materiály — z čeho byl kurz vygenerován */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-black text-sm">Podkladové materiály</h4>
                <p className="text-xs text-gray-500 mt-0.5">Soubory, ze kterých byl kurz vygenerován</p>
              </div>
              {filesLoading ? (
                <div className="p-4 text-sm text-gray-500">Načítám soubory...</div>
              ) : courseFiles.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Ke kurzu nejsou připojeny žádné podklady</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {courseFiles.map((file) => (
                    <li key={file.fileId} className="p-3 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="flex-1 min-w-0 text-sm text-black truncate" title={file.filename}>
                        {file.filename}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(file)}
                        disabled={downloadingFileId === file.fileId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {downloadingFileId === file.fileId ? 'Stahuji...' : 'Stáhnout'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {activeTab === 'rubric' && (
              <div className="pt-2">
                <CourseRubric />
              </div>
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
        <div className="hidden lg:flex w-64 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 flex-col">
          {outlinePanelInner}
        </div>

        {/* Mobile Outline Drawer */}
        {mobileOutlineOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOutlineOpen(false)} />
            <div className="relative w-72 max-w-[85%] bg-white shadow-xl flex flex-col">
              {outlinePanelInner}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseSummaryView;
