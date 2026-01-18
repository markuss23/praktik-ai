'use client';

import { getCourses, getModules } from "@/lib/api-client";
import { Course, CoursesApi, ModulesApi, Configuration } from "@/api";
import { API_BASE_URL } from "@/lib/constants";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Eye, Trash2, GripVertical, X, BicepsFlexed, Upload } from "lucide-react";
import { CourseModal, ModuleModal, DeleteConfirmModal } from "@/components";
import { Dropdown, SimpleBotIcon } from "@/components/ui/Dropdown";

type ModalType = 'course-create' | 'course-edit' | 'module-create' | 'module-edit' | null;

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [courseModules, setCourseModules] = useState<{ [key: number]: any[] }>({});
  const router = useRouter();

  // Modal states
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Course form data
  const [courseFormData, setCourseFormData] = useState({
    courseId: null as number | null,
    title: '',
    description: '',
    isPublished: false,
  });

  // Module form data
  const [moduleFormData, setModuleFormData] = useState({
    moduleId: null as number | null,
    title: '',
    courseId: 0,
    order: 1,
  });

  // Load expanded course from localStorage on mount
  useEffect(() => {
    const savedExpandedCourse = localStorage.getItem('expandedCourse');
    if (savedExpandedCourse) {
      const courseId = parseInt(savedExpandedCourse, 10);
      setExpandedCourse(courseId);
    }
  }, []);

  // Load modules when expandedCourse changes
  useEffect(() => {
    async function loadModulesForExpandedCourse() {
      if (expandedCourse && !courseModules[expandedCourse]) {
        try {
          const modules = await getModules({ courseId: expandedCourse });
          setCourseModules({ ...courseModules, [expandedCourse]: modules });
        } catch (error) {
          console.error('Failed to load modules:', error);
        }
      }
    }
    loadModulesForExpandedCourse();
  }, [expandedCourse]);

  useEffect(() => {
    loadCoursesList();
  }, []);

  const loadCoursesList = async () => {
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

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
    
    setDeleting(true);
    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      await modulesApi.deleteModule({ moduleId: moduleToDelete });
      
      // Refresh modules for expanded course
      if (expandedCourse) {
        const modules = await getModules({ courseId: expandedCourse });
        setCourseModules({ ...courseModules, [expandedCourse]: modules });
      }
      
      setShowDeleteConfirm(false);
      setModuleToDelete(null);
    } catch (error) {
      console.error('Failed to delete module:', error);
      alert('Failed to delete module');
    } finally {
      setDeleting(false);
    }
  };

  const toggleCourseExpand = async (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      localStorage.removeItem('expandedCourse');
    } else {
      setExpandedCourse(courseId);
      localStorage.setItem('expandedCourse', courseId.toString());
      
      // Load modules if not already loaded
      if (!courseModules[courseId]) {
        try {
          const modules = await getModules({ courseId });
          setCourseModules({ ...courseModules, [courseId]: modules });
        } catch (error) {
          console.error('Failed to load modules:', error);
        }
      }
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      await coursesApi.updateCourse({
        courseId: course.courseId,
        courseUpdate: {
          title: course.title,
          description: course.description,
          isPublished: !course.isPublished
        }
      });
      
      await loadCoursesList();
    } catch (error) {
      console.error('Failed to update course:', error);
      alert('Failed to update course');
    }
  };

  const toggleModulePublish = async (module: any) => {
    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      await modulesApi.updateModule({
        moduleId: module.moduleId,
        moduleUpdate: {
          title: module.title,
          order: module.order,
          isActive: module.isActive,
          isPublished: !module.isPublished
        }
      });
      
      // Refresh modules for expanded course
      if (expandedCourse) {
        const modules = await getModules({ courseId: expandedCourse });
        setCourseModules({ ...courseModules, [expandedCourse]: modules });
      }
    } catch (error) {
      console.error('Failed to update module:', error);
      alert('Failed to update module');
    }
  };

  const getModuleCount = (course: Course) => {
    return course.modules?.length || 0;
  };

  // Modal handlers
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

  const openEditCourseModal = (course: Course) => {
    setCourseFormData({
      courseId: course.courseId,
      title: course.title,
      description: course.description || '',
      isPublished: course.isPublished || false,
    });
    setModalError('');
    setActiveModal('course-edit');
  };

  const openCreateModuleModal = (courseId: number) => {
    // Calculate next order
    const modules = courseModules[courseId] || [];
    const maxOrder = modules.length > 0 ? Math.max(...modules.map((m: any) => m.order)) : 0;
    
    setModuleFormData({
      moduleId: null,
      title: '',
      courseId: courseId,
      order: maxOrder + 1,
    });
    setModalError('');
    setActiveModal('module-create');
  };

  const openEditModuleModal = (module: any) => {
    setModuleFormData({
      moduleId: module.moduleId,
      title: module.title,
      courseId: module.courseId,
      order: module.order || 1,
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
        // Update
        await coursesApi.updateCourse({
          courseId: courseFormData.courseId,
          courseUpdate: {
            title: courseFormData.title,
            description: courseFormData.description,
            isPublished: courseFormData.isPublished,
          }
        });
      } else {
        // Create
        await coursesApi.createCourse({
          courseCreate: {
            title: courseFormData.title,
            description: courseFormData.description,
            isPublished: courseFormData.isPublished,
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
        // Update
        await modulesApi.updateModule({
          moduleId: moduleFormData.moduleId,
          moduleUpdate: {
            title: moduleFormData.title,
            order: moduleFormData.order,
          }
        });
      } else {
        // Create
        await modulesApi.createModule({
          moduleCreate: {
            title: moduleFormData.title,
            courseId: moduleFormData.courseId,
            order: moduleFormData.order,
          }
        });
      }
      
      // Refresh modules for the course
      if (moduleFormData.courseId) {
        const modules = await getModules({ courseId: moduleFormData.courseId });
        setCourseModules({ ...courseModules, [moduleFormData.courseId]: modules });
      }
      
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save module');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 border-b">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Překled kurzů</h2>
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
                  onClick: () => router.push('/admin/courses/upload'),
                },
                {
                  label: 'Pomocí AI',
                  icon: <SimpleBotIcon size={18} />,
                  gradient: true,
                  onClick: () => router.push('/admin/courses/ai-create'),
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
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          course.isPublished 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {course.isPublished ? 'Publikováno' : 'Neaktivní'}
                        </span>
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
                          <button
                            onClick={() => togglePublish(course)}
                            className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                            title={course.isPublished ? 'Skrýt' : 'Publikovat'}
                          >
                            <Eye size={16} />
                          </button>
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
                        <td colSpan={4} className="bg-gray-50 p-0">
                          <div className="p-6">
                            <div className="bg-white rounded-lg shadow-sm">
                              <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-lg font-semibold text-black">Přehled modulů</h3>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditCourseModal(course)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    Editovat kurz
                                  </button>
                                  <button
                                    onClick={() => {
                                      setExpandedCourse(null);
                                      localStorage.removeItem('expandedCourse');
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <X size={20} />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="divide-y">
                                {courseModules[course.courseId]?.map((module: any, index: number) => (
                                  <div key={module.moduleId} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                                    <GripVertical size={20} className="text-gray-400 flex-shrink-0" />
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm text-gray-900">{module.title}</div>
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 w-24 text-center flex-shrink-0">
                                      Modul {index + 1}
                                    </div>
                                    
                                    <div className="w-32 flex-shrink-0">
                                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                                        module.isPublished 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-orange-100 text-orange-800'
                                      }`}>
                                        {module.isPublished ? 'Publikováno' : 'Neaktivní'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        onClick={() => openEditModuleModal(module)}
                                        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                        title="Editovat modul"
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      <button
                                        onClick={() => toggleModulePublish(module)}
                                        className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                                        title={module.isPublished ? 'Skrýt modul' : 'Publikovat modul'}
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setModuleToDelete(module.moduleId);
                                          setShowDeleteConfirm(true);
                                        }}
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
                                  onClick={() => openCreateModuleModal(course.courseId)}
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
              <div key={course.courseId} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{getModuleCount(course)} moduly</p>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-2 ${
                      course.isPublished 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {course.isPublished ? 'Publikováno' : 'Neaktivní'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleCourseExpand(course.courseId)}
                      className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      title="Zobrazit moduly"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => togglePublish(course)}
                      className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                      title={course.isPublished ? 'Skrýt' : 'Publikovat'}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(course.courseId)}
                      className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      title="Smazat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {/* Expanded Module List - Mobile */}
                {expandedCourse === course.courseId && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 text-sm">Moduly</h4>
                      <button
                        onClick={() => {
                          setExpandedCourse(null);
                          localStorage.removeItem('expandedCourse');
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {courseModules[course.courseId]?.map((module: any, index: number) => (
                        <div key={module.moduleId} className="bg-white rounded-md p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{module.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Modul {index + 1}</p>
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${
                                module.isPublished 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {module.isPublished ? 'Publikováno' : 'Neaktivní'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => openEditModuleModal(module)}
                                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                                title="Editovat"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => toggleModulePublish(module)}
                                className="p-1.5 bg-orange-500 text-white rounded hover:bg-orange-600"
                                title={module.isPublished ? 'Skrýt' : 'Publikovat'}
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  setModuleToDelete(module.moduleId);
                                  setShowDeleteConfirm(true);
                                }}
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
                      onClick={() => openCreateModuleModal(course.courseId)}
                      className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm w-full"
                    >
                      <span>Přidat modul</span>
                    </button>
                    <button
                      onClick={() => openEditCourseModal(course)}
                      className="mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm w-full"
                    >
                      Editovat kurz
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Course Create/Edit Modal */}
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

      {/* Module Create/Edit Modal */}
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

      {/* Delete Confirmation Modal */}
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