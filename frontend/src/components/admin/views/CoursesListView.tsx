'use client';

import { getCourses, getModules, updateCoursePublished, generateCourseEmbeddings } from "@/lib/api-client";
import { Course, CoursesApi, ModulesApi, Configuration, Status, Module } from "@/api";
import { API_BASE_URL } from "@/lib/constants";
import React, { useState, useEffect, useCallback } from "react";
import { Pencil, Eye, EyeOff, Trash2, GripVertical, X, BicepsFlexed, Upload, Sparkles } from "lucide-react";
import { CourseModal, ModuleModal, DeleteConfirmModal } from "@/components";
import { Dropdown, SimpleBotIcon } from "@/components/ui/Dropdown";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";

type ModalType = 'course-create' | 'course-edit' | 'module-create' | 'module-edit' | null;

// Hlavní dashboard admin sekce - seznam kurzů s rozbalitelnými moduly
export function CoursesListView() {
  const { goToCourseContent, goToCourseUpload, goToAICreate } = useAdminNavigation();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [courseModules, setCourseModules] = useState<{ [key: number]: Module[] }>({});

  // Embedding generation state
  const [embeddingLoading, setEmbeddingLoading] = useState<number | null>(null);
  const [embeddingDone, setEmbeddingDone] = useState<Set<number>>(new Set());

  // Stavy modálních oken
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Data formuláře kurzu
  const [courseFormData, setCourseFormData] = useState({
    courseId: null as number | null,
    title: '',
    description: '',
    isPublished: false,
  });

  // Data formuláře modulu
  const [moduleFormData, setModuleFormData] = useState({
    moduleId: null as number | null,
    title: '',
    courseId: 0,
    position: 1,
  });

  // Načtení rozbalené kurzu z localStorage při mountu
  useEffect(() => {
    const savedExpandedCourse = localStorage.getItem('expandedCourse');
    if (savedExpandedCourse) {
      const courseId = parseInt(savedExpandedCourse, 10);
      setExpandedCourse(courseId);
    }
  }, []);

  // Načtení modulů při změně rozbalené kurzu
  useEffect(() => {
    async function loadModulesForExpandedCourse() {
      if (expandedCourse && !courseModules[expandedCourse]) {
        try {
          const modules = await getModules({ courseId: expandedCourse });
          setCourseModules(prev => ({ ...prev, [expandedCourse]: modules }));
        } catch (error) {
          console.error('Failed to load modules:', error);
        }
      }
    }
    loadModulesForExpandedCourse();
  }, [expandedCourse, courseModules]);

  const loadCoursesList = useCallback(async () => {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  }, []);

  useEffect(() => {
    loadCoursesList();
  }, [loadCoursesList]);

  const handleDeleteClick = (courseId: number) => {
    setCourseToDelete(courseId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;
    
    setDeleting(true);
    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      await coursesApi.deleteCourse({ courseId: courseToDelete });
      
      await loadCoursesList();
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    
    alert('Mazání modulů není momentálně podporováno');
    setShowDeleteConfirm(false);
    setModuleToDelete(null);
  };

  const toggleCourseExpand = async (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      localStorage.removeItem('expandedCourse');
    } else {
      setExpandedCourse(courseId);
      localStorage.setItem('expandedCourse', courseId.toString());
      
      // Načtení modulů pokud ještě nejsou
      if (!courseModules[courseId]) {
        try {
          const modules = await getModules({ courseId });
          setCourseModules(prev => ({ ...prev, [courseId]: modules }));
        } catch (error) {
          console.error('Failed to load modules:', error);
        }
      }
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const newPublishState = !course.isPublished;
      await updateCoursePublished(course.courseId, newPublishState);
      await loadCoursesList();
    } catch (error) {
      console.error('Failed to update publish status:', error);
      alert('Nepodařilo se změnit stav publikování');
    }
  };

  const toggleModuleActive = async (_module: Module) => {
    console.warn('Module activation toggle not supported by current API');
    alert('Změna stavu modulu není momentálně podporována');
  };

  const getModuleCount = (course: Course) => {
    return course.modules?.length || 0;
  };

  // Handlery modálních oken
  const openCreateCourseModal = () => {
    setCourseFormData({
      courseId: null,
      title: '',
      description: '',
      isPublished: false,
    });
    setModalError('');
    setActiveModal('course-create');
  };

  const openCreateModuleModal = (courseId: number) => {
    const modules = courseModules[courseId] || [];
    const maxPosition = modules.length > 0 ? Math.max(...modules.map((m: Module) => m.position || 1)) : 0;
    
    setModuleFormData({
      moduleId: null,
      title: '',
      courseId: courseId,
      position: maxPosition + 1,
    });
    setModalError('');
    setActiveModal('module-create');
  };

  const openEditModuleModal = (module: Module) => {
    setModuleFormData({
      moduleId: module.moduleId,
      title: module.title,
      courseId: module.courseId,
      position: module.position || 1,
    });
    setModalError('');
    setActiveModal('module-edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalError('');
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      
      if (courseFormData.courseId) {
        const existingCourse = courses.find(c => c.courseId === courseFormData.courseId);
        await coursesApi.updateCourse({
          courseId: courseFormData.courseId,
          courseUpdate: {
            title: courseFormData.title,
            description: courseFormData.description,
            categoryId: existingCourse?.categoryId ?? 1,
          }
        });
      } else {
        await coursesApi.createCourse({
          courseCreate: {
            title: courseFormData.title,
            description: courseFormData.description,
            categoryId: 1,
          }
        });
      }
      
      await loadCoursesList();
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      
      if (moduleFormData.moduleId) {
        await modulesApi.updateModule({
          moduleId: moduleFormData.moduleId,
          moduleUpdate: {
            title: moduleFormData.title,
            position: moduleFormData.position,
          }
        });
        
        if (moduleFormData.courseId) {
          const modules = await getModules({ courseId: moduleFormData.courseId });
          setCourseModules(prev => ({ ...prev, [moduleFormData.courseId]: modules }));
        }
        
        closeModal();
      } else {
        setModalError('Vytváření modulů není momentálně podporováno');
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save module');
    } finally {
      setModalLoading(false);
    }
  };

  const closeCourseExpand = () => {
    setExpandedCourse(null);
    localStorage.removeItem('expandedCourse');
  };

  const handleGenerateEmbeddings = async (courseId: number) => {
    setEmbeddingLoading(courseId);
    try {
      await generateCourseEmbeddings(courseId);
      setEmbeddingDone(prev => new Set(prev).add(courseId));
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      alert('Nepodařilo se vygenerovat embeddingy. Zkontrolujte, zda je kurz ve stavu "Schváleno".');
    } finally {
      setEmbeddingLoading(null);
    }
  };

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 border-b">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Přehled kurzů</h2>
            <Dropdown
              trigger={<span>Přidat kurz</span>}
              items={[
                {
                  label: 'Manuální zadání',
                  icon: <BicepsFlexed size={18} />,
                  onClick: openCreateCourseModal,
                },
                {
                  label: 'Náhrát soubor',
                  icon: <Upload size={18} />,
                  onClick: goToCourseUpload,
                },
                {
                  label: 'Pomocí AI',
                  icon: <SimpleBotIcon size={18} />,
                  gradient: true,
                  onClick: goToAICreate,
                },
              ]}
            />
          </div>

          {/* Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Název kurzu</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Počet modulů</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Publikováno</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courses.map((course) => (
                  <React.Fragment key={course.courseId}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{course.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{getModuleCount(course)} moduly</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={course.status} />
                      </td>
                      <td className="px-6 py-4">
                        <PublishBadge status={course.status} isPublished={course.isPublished} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCourseExpand(course.courseId)}
                            className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            title="Zobrazit moduly"
                          >
                            <Pencil size={16} />
                          </button>
                          {(course.status === Status.Approved || course.status === Status.Archived) && (
                            <>
                              <button
                                onClick={() => togglePublish(course)}
                                className={`p-2 text-white rounded-md transition-colors ${
                                  course.isPublished 
                                    ? 'bg-orange-500 hover:bg-orange-600' 
                                    : 'bg-green-500 hover:bg-green-600'
                                }`}
                                title={course.isPublished ? 'Zrušit publikování' : 'Publikovat'}
                              >
                                {course.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                              <button
                                onClick={() => handleGenerateEmbeddings(course.courseId)}
                                disabled={embeddingDone.has(course.courseId) || embeddingLoading === course.courseId}
                                className={`p-2 text-white rounded-md transition-colors ${
                                  embeddingDone.has(course.courseId)
                                    ? 'bg-blue-300 cursor-not-allowed'
                                    : embeddingLoading === course.courseId
                                      ? 'bg-blue-400 cursor-wait'
                                      : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                title={embeddingDone.has(course.courseId) ? 'Embeddingy vygenerovány' : 'Generovat embeddingy'}
                              >
                                {embeddingLoading === course.courseId ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Sparkles size={16} />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteClick(course.courseId)}
                            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            title="Smazat"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Module List */}
                    {expandedCourse === course.courseId && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 p-0">
                          <ExpandedModuleList
                            course={course}
                            modules={courseModules[course.courseId] || []}
                            onEditCourse={() => goToCourseContent(course.courseId)}
                            onClose={closeCourseExpand}
                            onEditModule={openEditModuleModal}
                            onToggleModuleActive={toggleModuleActive}
                            onDeleteModule={(moduleId) => {
                              setModuleToDelete(moduleId);
                              setShowDeleteConfirm(true);
                            }}
                            onAddModule={() => openCreateModuleModal(course.courseId)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {courses.map((course) => (
              <MobileCourseCard
                key={course.courseId}
                course={course}
                isExpanded={expandedCourse === course.courseId}
                modules={courseModules[course.courseId] || []}
                onToggleExpand={() => toggleCourseExpand(course.courseId)}
                onTogglePublish={() => togglePublish(course)}
                onDelete={() => handleDeleteClick(course.courseId)}
                onEditCourse={() => goToCourseContent(course.courseId)}
                onCloseExpand={closeCourseExpand}
                onEditModule={openEditModuleModal}
                onToggleModuleActive={toggleModuleActive}
                onDeleteModule={(moduleId) => {
                  setModuleToDelete(moduleId);
                  setShowDeleteConfirm(true);
                }}
                onAddModule={() => openCreateModuleModal(course.courseId)}
                onGenerateEmbeddings={() => handleGenerateEmbeddings(course.courseId)}
                embeddingGenerating={embeddingLoading === course.courseId}
                embeddingGenerated={embeddingDone.has(course.courseId)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CourseModal
        isOpen={activeModal === 'course-create' || activeModal === 'course-edit'}
        mode={activeModal === 'course-create' ? 'create' : 'edit'}
        formData={courseFormData}
        loading={modalLoading}
        error={modalError}
        onClose={closeModal}
        onSubmit={handleCourseSubmit}
        onChange={setCourseFormData}
      />

      <ModuleModal
        isOpen={activeModal === 'module-create' || activeModal === 'module-edit'}
        mode={activeModal === 'module-create' ? 'create' : 'edit'}
        formData={moduleFormData}
        courses={courses}
        loading={modalLoading}
        error={modalError}
        onClose={closeModal}
        onSubmit={handleModuleSubmit}
        onChange={setModuleFormData}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        isModule={!!moduleToDelete}
        deleting={deleting}
        onConfirm={moduleToDelete ? handleDeleteModule : handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCourseToDelete(null);
          setModuleToDelete(null);
        }}
      />
    </>
  );
}

// =============================================================================
// Pomocné komponenty pro lepší organizaci
// =============================================================================

function StatusBadge({ status }: { status?: Status }) {
  const getStyles = () => {
    switch (status) {
      case Status.Draft: return 'bg-gray-100 text-gray-800';
      case Status.Generated: return 'bg-blue-100 text-blue-800';
      case Status.Approved: return 'bg-purple-100 text-purple-800';
      case Status.Archived: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLabel = () => {
    switch (status) {
      case Status.Draft: return 'Draft';
      case Status.Generated: return 'Vygenerováno';
      case Status.Approved: return 'Schváleno';
      case Status.Archived: return 'Archivováno';
      default: return status;
    }
  };

  return (
    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStyles()}`}>
      {getLabel()}
    </span>
  );
}

function PublishBadge({ status, isPublished }: { status?: Status; isPublished?: boolean }) {
  if (status !== Status.Approved && status !== Status.Archived) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return (
    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
      isPublished ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {isPublished ? 'ANO' : 'NE'}
    </span>
  );
}

interface ExpandedModuleListProps {
  course: Course;
  modules: Module[];
  onEditCourse: () => void;
  onClose: () => void;
  onEditModule: (module: Module) => void;
  onToggleModuleActive: (module: Module) => void;
  onDeleteModule: (moduleId: number) => void;
  onAddModule: () => void;
}

function ExpandedModuleList({
  modules,
  onEditCourse,
  onClose,
  onEditModule,
  onToggleModuleActive,
  onDeleteModule,
  onAddModule,
}: ExpandedModuleListProps) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-black">Přehled modulů</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onEditCourse}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Editovat kurz
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="divide-y">
          {modules.map((module, index) => (
            <div key={module.moduleId} className="p-4 flex items-center gap-4 hover:bg-gray-50">
              <GripVertical size={20} className="text-gray-400 flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">{module.title}</div>
              </div>
              
              <div className="text-sm text-gray-600 w-24 text-center flex-shrink-0">
                Modul {module.position || index + 1}
              </div>
              
              <div className="w-32 flex-shrink-0">
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                  module.isActive ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {module.isActive ? 'Aktivní' : 'Neaktivní'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEditModule(module)}
                  className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  title="Editovat modul"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => onToggleModuleActive(module)}
                  className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                  title={module.isActive ? 'Deaktivovat modul' : 'Aktivovat modul'}
                >
                  {module.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => onDeleteModule(module.moduleId)}
                  className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  title="Smazat modul"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t">
          <button
            onClick={onAddModule}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-fit"
          >
            <span>Přidat modul</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-90">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface MobileCourseCardProps {
  course: Course;
  isExpanded: boolean;
  modules: Module[];
  onToggleExpand: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onEditCourse: () => void;
  onCloseExpand: () => void;
  onEditModule: (module: Module) => void;
  onToggleModuleActive: (module: Module) => void;
  onDeleteModule: (moduleId: number) => void;
  onAddModule: () => void;
  onGenerateEmbeddings: () => void;
  embeddingGenerating: boolean;
  embeddingGenerated: boolean;
}

function MobileCourseCard({
  course,
  isExpanded,
  modules,
  onToggleExpand,
  onTogglePublish,
  onDelete,
  onEditCourse,
  onCloseExpand,
  onEditModule,
  onToggleModuleActive,
  onDeleteModule,
  onAddModule,
  onGenerateEmbeddings,
  embeddingGenerating,
  embeddingGenerated,
}: MobileCourseCardProps) {
  const moduleCount = course.modules?.length || 0;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
          <p className="text-sm text-gray-500 mt-1">{moduleCount} moduly</p>
          {(course.status === Status.Approved || course.status === Status.Archived) && (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-2 ${
              course.isPublished ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {course.isPublished ? 'Publikováno' : 'Neaktivní'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleExpand}
            className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            title="Zobrazit moduly"
          >
            <Pencil size={14} />
          </button>
          {(course.status === Status.Approved || course.status === Status.Archived) && (
            <>
              <button
                onClick={onTogglePublish}
                className={`p-2 text-white rounded-md transition-colors ${
                  course.isPublished ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                }`}
                title={course.isPublished ? 'Zrušit publikování' : 'Publikovat'}
              >
                {course.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={onGenerateEmbeddings}
                disabled={embeddingGenerated || embeddingGenerating}
                className={`p-2 text-white rounded-md transition-colors ${
                  embeddingGenerated
                    ? 'bg-blue-300 cursor-not-allowed'
                    : embeddingGenerating
                      ? 'bg-blue-400 cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title={embeddingGenerated ? 'Embeddingy vygenerovány' : 'Generovat embeddingy'}
              >
                {embeddingGenerating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
              </button>
            </>
          )}
          <button
            onClick={onDelete}
            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            title="Smazat"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {/* Expanded Module List - Mobile */}
      {isExpanded && (
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 text-sm">Moduly</h4>
            <button onClick={onCloseExpand} className="text-gray-500 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {modules.map((module, index) => (
              <div key={module.moduleId} className="bg-white rounded-md p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{module.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Modul {module.position || index + 1}</p>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${
                      module.isActive ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {module.isActive ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onEditModule(module)}
                      className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                      title="Editovat"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => onToggleModuleActive(module)}
                      className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600"
                      title={module.isActive ? 'Deaktivovat' : 'Aktivovat'}
                    >
                      {module.isActive ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={() => onDeleteModule(module.moduleId)}
                      className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                      title="Smazat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onAddModule}
            className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm w-full"
          >
            <span>Přidat modul</span>
          </button>
          <button
            onClick={onEditCourse}
            className="mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
          >
            Editovat kurz
          </button>
        </div>
      )}
    </div>
  );
}

export default CoursesListView;
