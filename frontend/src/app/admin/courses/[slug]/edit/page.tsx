'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CoursesApi, Configuration } from '@/api';
import { API_BASE_URL } from '@/lib/constants';
import { getCourses } from '@/lib/api-client';
import { slugify } from '@/lib/utils';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseSlug = params.slug as string;
  
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseId, setCourseId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isPublished: false,
  });

  useEffect(() => {
    async function loadCourse() {
      try {
        // Get all courses and find the one matching the slug
        const courses = await getCourses();
        
        // Check if slug is a numeric ID (for backward compatibility)
        const isNumericId = /^\d+$/.test(courseSlug);
        
        const course = isNumericId 
          ? courses.find(c => c.courseId === Number(courseSlug))
          : courses.find(c => slugify(c.title) === courseSlug);
        
        if (!course) {
          setError('Course not found');
          return;
        }
        
        setCourseId(course.courseId);
        setFormData({
          title: course.title,
          description: course.description || '',
          isPublished: course.isPublished || false,
        });
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Failed to load course data');
      }
    }
    loadCourse();
  }, [courseSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    
    setLoading(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      await coursesApi.updateCourse({
        courseId: courseId,
        courseUpdate: formData
      });
      
      // Navigate to the new slug if title changed
      const newSlug = slugify(formData.title);
      router.push(`/courses/${newSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!courseId) return;
    
    setDeleting(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      await coursesApi.deleteCourse({ courseId: courseId });
      router.push('/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!courseId && !error) {
    return <div className="flex-1 p-4 sm:p-8 text-black">Načítání...</div>;
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-black">Editovat kurz</h1>
      
      {error && (
        <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-6 rounded-lg shadow">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Název kurzu *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm sm:text-base"
            placeholder="např. Kurz promptování - začátečníci"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Popis kurzu
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm sm:text-base"
            placeholder="Stručný popis kurzu..."
            rows={4}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublished"
            checked={formData.isPublished}
            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
            Publikovat kurz
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            {loading ? 'Ukládání...' : 'Uložit změny'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm sm:text-base"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 sm:px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 sm:ml-auto text-sm sm:text-base"
          >
            Smazat kurz
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-black">Potvrdit smazání</h2>
            <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
              Opravdu chcete smazat tento kurz a všechny jeho moduly?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm sm:text-base"
              >
                Zrušit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 sm:px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm sm:text-base"
              >
                {deleting ? 'Mazání...' : 'Ano, smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
