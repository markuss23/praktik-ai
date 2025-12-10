'use client';

import { getCourses, getModules } from "@/lib/api-client";
import { Course, CoursesApi, ModulesApi, Configuration } from "@/api";
import { API_BASE_URL } from "@/lib/constants";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { Home, BookOpen, Users, BarChart3, Settings, Pencil, Eye, Trash2, GripVertical, X } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [courseModules, setCourseModules] = useState<{ [key: number]: any[] }>({});
  const router = useRouter();

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    }
    loadCourses();
  }, []);

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
      
      // Refresh courses list
      const data = await getCourses();
      setCourses(data);
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
    } else {
      setExpandedCourse(courseId);
      
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
      
      // Refresh courses list
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to update course:', error);
      alert('Failed to update course');
    }
  };

  const getModuleCount = (course: Course) => {
    return course.modules?.length || 0;
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">PRAKTIK-AI</h1>
        </div>
        
        <nav className="flex-1 px-4">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-md transition-colors">
            <Home size={20} />
            <span>Home</span>
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-purple-600 rounded-md transition-colors">
            <BookOpen size={20} />
            <span>Kurzy</span>
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-md transition-colors">
            <Users size={20} />
            <span>Uživatelé</span>
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-md transition-colors">
            <BarChart3 size={20} />
            <span>Statistiky</span>
          </Link>
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-md transition-colors">
            <Settings size={20} />
            <span>Natavení</span>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-black">Překled kurzů</h2>
            <Link
              href="/admin/courses/new"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <span>Přidat kurz</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-90">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
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
                  <>
                    <tr key={course.courseId} className="hover:bg-gray-50">
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
                            title="Editovat"
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
                                <button
                                  onClick={() => setExpandedCourse(null)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <X size={20} />
                                </button>
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
                                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                        Publikováno
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Link
                                        href={`/admin/modules/${slugify(module.title)}/edit`}
                                        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                        title="Editovat modul"
                                      >
                                        <Pencil size={16} />
                                      </Link>
                                      <button
                                        className="p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                                        title="Skrýt modul"
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
                                <Link
                                  href={`/admin/modules/new?courseId=${course.courseId}`}
                                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors w-fit"
                                >
                                  <span>Přidat modul</span>
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-90">
                                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-black">Potvrdit smazání</h2>
            <p className="text-gray-700 mb-6">
              {moduleToDelete 
                ? 'Opravdu chcete smazat tento modul? Tato akce je nevratná.'
                : 'Opravdu chcete smazat tento kurz a všechny jeho moduly? Tato akce je nevratná.'
              }
            </p>
            <div className="flex gap-4">
              <button
                onClick={moduleToDelete ? handleDeleteModule : handleDelete}
                disabled={deleting}
                className="flex-1 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {deleting ? 'Mazání...' : 'Ano, smazat'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCourseToDelete(null);
                  setModuleToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
