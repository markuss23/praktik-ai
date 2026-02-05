'use client';

import { useState, useEffect } from 'react';
import { ModulesApi, Configuration } from '@/api';
import { API_BASE_URL } from '@/lib/constants';
import { getModules } from '@/lib/api-client';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { LoadingState, ErrorState } from '@/components/admin';

interface ModuleEditViewProps {
  moduleId: number;
  courseId?: number;
}

// Formulář pro editaci modulu
export function ModuleEditView({ moduleId, courseId: propsCourseId }: ModuleEditViewProps) {
  const { goToCourses, goBack } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseId, setCourseId] = useState<number | undefined>(propsCourseId);
  
  const [formData, setFormData] = useState({
    title: '',
    position: 1,
  });

  useEffect(() => {
    async function loadModule() {
      try {
        // Načtení modulů pro daný kurz
        if (propsCourseId) {
          const modules = await getModules({ courseId: propsCourseId });
          const module = modules.find(m => m.moduleId === moduleId);
          
          if (!module) {
            setError('Modul nebyl nalezen');
            return;
          }
          
          setCourseId(module.courseId);
          setFormData({
            title: module.title,
            position: module.position || 1,
          });
        } else {
          // Záložní stav - courseId by mělo být vždy k dispozici
          setError('Chybí ID kurzu');
        }
      } catch (err) {
        console.error('Failed to load module:', err);
        setError('Nepodařilo se načíst data modulu');
      } finally {
        setInitialLoading(false);
      }
    }
    loadModule();
  }, [moduleId, propsCourseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const modulesApi = new ModulesApi(config);
      
      await modulesApi.updateModule({
        moduleId: moduleId,
        moduleUpdate: {
          title: formData.title,
          position: formData.position,
        }
      });
      
      goToCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se aktualizovat modul');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingState />;
  }

  if (error && !formData.title) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-black">Editovat modul</h1>
        
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-6 rounded-lg shadow">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm sm:text-base"
              placeholder="Název modulu"
            />
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
              Pozice
            </label>
            <input
              type="number"
              id="position"
              min="1"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm sm:text-base"
            />
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
              onClick={goBack}
              className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm sm:text-base"
            >
              Zpět
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModuleEditView;
