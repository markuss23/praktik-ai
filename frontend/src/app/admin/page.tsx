'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import Link from "next/link";
import { getCourses } from "@/lib/api-client";
import { Course, CoursesApi, Configuration } from "@/api";
import { API_BASE_URL } from "@/lib/constants";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteClick = (e: React.MouseEvent, courseId: number) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-black">Admin - Správa kurzů</h1>
        <Link 
          href="/admin/courses/new"
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <span className="text-xl font-bold">+</span>
          <span>Nový kurz</span>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course.courseId} className="relative">
            <Link href={`/courses/${slugify(course.title)}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-black">{course.title}</CardTitle>
                  <CardDescription>{course.description || 'No description available'}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <div className="absolute top-2 right-2 flex gap-2">
              <Link
                href={`/admin/courses/${slugify(course.title)}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center text-sm font-bold"
                title="Editovat kurz"
              >
                ✎
              </Link>
              <button
                onClick={(e) => handleDeleteClick(e, course.courseId)}
                className="w-8 h-8 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center text-xl font-bold"
                title="Smazat kurz"
              >
                −
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-black">Potvrdit smazání</h2>
            <p className="text-gray-700 mb-6">
              Opravdu chcete smazat tento kurz a všechny jeho moduly? Tato akce je nevratná.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {deleting ? 'Mazání...' : 'Ano, smazat'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCourseToDelete(null);
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
