'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ModulesApi, CoursesApi, Configuration } from '@/api';
import { API_BASE_URL } from '@/lib/constants';
import { slugify } from '@/lib/utils';

export default function NewModulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [nextOrder, setNextOrder] = useState<number>(1);
  
  const [formData, setFormData] = useState({
    title: '',
    courseId: courseIdParam ? Number(courseIdParam) : 0,
    order: 1,
  });

  useEffect(() => {
    async function loadCourses() {
      try {
        const config = new Configuration({ basePath: API_BASE_URL });
        const coursesApi = new CoursesApi(config);
        const data = await coursesApi.listCourses({});
        setCourses(data);
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    }
    loadCourses();
  }, []);

  useEffect(() => {
    async function loadModules() {
      if (formData.courseId === 0) {
        setNextOrder(1);
        setFormData(prev => ({ ...prev, order: 1 }));
        return;
      }

      try {
        const config = new Configuration({ basePath: API_BASE_URL });
        const modulesApi = new ModulesApi(config);
        const modules = await modulesApi.listModules({ courseId: formData.courseId });
        
        // Calculate next order number
        const maxOrder = modules.length > 0 ? Math.max(...modules.map((m: any) => m.order)) : 0;
        const next = maxOrder + 1;
        setNextOrder(next);
        setFormData(prev => ({ ...prev, order: next }));
      } catch (err) {
        console.error('Failed to load modules:', err);
      }
    }
    loadModules();
  }, [formData.courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      const module = await modulesApi.createModule({
        moduleCreate: formData
      });
      console.log('Module created:', module);
      
      // Navigate back to admin page
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create module');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-black">Vytvořit nový modul</h1>
      
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

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || formData.courseId === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Vytváření...' : 'Vytvořit modul'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Zrušit
          </button>
        </div>
      </form>
    </div>
  );
}
