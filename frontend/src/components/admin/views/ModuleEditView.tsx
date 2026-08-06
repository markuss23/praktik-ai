'use client';

import { useState, useEffect } from 'react';
import { getModules, modulesApi } from '@/lib/api-client';
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
      await modulesApi.updateModule({
        moduleId: moduleId,
        moduleUpdate: {
          title: formData.title,
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
    <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Editovat modul</h1>
        
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-card p-4 sm:p-6 rounded-lg shadow">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Název modulu *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tip/30 text-foreground text-sm sm:text-base"
              placeholder="Název modulu"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-2 bg-tip text-primary-foreground rounded-md hover:bg-tip/80 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Ukládání...' : 'Uložit změny'}
            </button>
            <button
              type="button"
              onClick={goBack}
              className="px-4 sm:px-6 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 text-sm sm:text-base"
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
