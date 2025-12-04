'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ModulesApi, CoursesApi, Configuration } from '@/api';
import { API_BASE_URL } from '@/lib/constants';

export default function EditModulePage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    courseId: 0,
    order: 1,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const config = new Configuration({ basePath: API_BASE_URL });
        const modulesApi = new ModulesApi(config);
        const coursesApi = new CoursesApi(config);
        
        // Load module data
        const module = await modulesApi.getModule({ moduleId: Number(moduleId) });
        setFormData({
          title: module.title,
          courseId: module.courseId,
          order: module.order || 1,
        });
        
        // Load courses
        const coursesData = await coursesApi.listCourses({});
        setCourses(coursesData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load module data');
      }
    }
    loadData();
  }, [moduleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      await modulesApi.updateModule({
        moduleId: Number(moduleId),
        moduleCreate: formData
      });
      router.push(`/courses/${formData.courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update module');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      await modulesApi.deleteModule({ moduleId: Number(moduleId) });
      router.push(`/courses/${formData.courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete module');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-black">Editovat modul</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-2">
            Kurz *
          </label>
          <select
            id="courseId"
            required
            value={formData.courseId}
            onChange={(e) => setFormData({ ...formData, courseId: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          >
            <option value={0}>Vyberte kurz</option>
            {courses.map((course) => (
              <option key={course.courseId} value={course.courseId}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Název modulu *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            placeholder="např. Co je prompt a jak funguje AI"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pořadí
          </label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black">
            {formData.order}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Pořadí nelze měnit po vytvoření modulu
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || formData.courseId === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Ukládání...' : 'Uložit změny'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ml-auto"
          >
            Smazat modul
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-black">Potvrdit smazání</h2>
            <p className="text-gray-700 mb-6">
              Opravdu chcete smazat tento modul? Tato akce je nevratná.
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
                onClick={() => setShowDeleteConfirm(false)}
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
