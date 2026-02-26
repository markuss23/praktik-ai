'use client';

import { useState, useEffect } from 'react';
import { CoursesApi, Configuration, Module } from '@/api';
import { API_BASE_URL } from '@/lib/constants';
import { getCourse, updateModule, deleteCourse } from '@/lib/api-client';
import { ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { LoadingState, ErrorState } from '@/components/admin';

interface CourseEditViewProps {
  courseId: number;
}

// Formulář pro editaci kurzu a jeho modulů
export function CourseEditView({ courseId }: CourseEditViewProps) {
  const { goToCourses, goBack } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [editingModule, setEditingModule] = useState<number | null>(null);
  const [editModuleData, setEditModuleData] = useState({ title: '' });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    async function loadCourse() {
      try {
        const course = await getCourse(courseId);
        
        setCategoryId(course.categoryId);
        setModules(course.modules || []);
        setFormData({
          title: course.title,
          description: course.description || '',
        });
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Nepodařilo se načíst data kurzu');
      } finally {
        setInitialLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const startEditingModule = (module: Module) => {
    setEditingModule(module.moduleId);
    setEditModuleData({ title: module.title });
  };

  const cancelEditingModule = () => {
    setEditingModule(null);
    setEditModuleData({ title: '' });
  };

  const saveModuleEdit = async (module: Module) => {
    try {
      await updateModule(module.moduleId, {
        title: editModuleData.title,
        position: module.position,
      });
      setModules(prev => prev.map(m => 
        m.moduleId === module.moduleId 
          ? { ...m, title: editModuleData.title }
          : m
      ));
      setEditingModule(null);
    } catch (err) {
      setError('Nepodařilo se uložit modul');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      
      const updateData = {
        title: formData.title,
        description: formData.description || undefined,
        modulesCount: modules.length || 3,
        categoryId: categoryId,
      };
      
      await coursesApi.updateCourse({
        courseId: courseId,
        courseUpdate: updateData
      });
      
      goToCourses();
    } catch (err) {
      console.error('Update error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Nepodařilo se aktualizovat kurz');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await deleteCourse(courseId);
      goToCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se smazat kurz');
      setDeleting(false);
      setShowDeleteConfirm(false);
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

        {/* Modules Section */}
        {modules.length > 0 && (
          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold text-black mb-4">Moduly kurzu ({modules.length})</h2>
            <div className="space-y-3">
              {modules.map((module, index) => (
                <div key={module.moduleId} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleModule(module.moduleId)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      {editingModule === module.moduleId ? (
                        <input
                          type="text"
                          value={editModuleData.title}
                          onChange={(e) => setEditModuleData({ title: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border border-gray-300 rounded text-black text-sm"
                        />
                      ) : (
                        <span className="font-medium text-black">{module.title}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingModule === module.moduleId ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); saveModuleEdit(module); }}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelEditingModule(); }}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditingModule(module); }}
                          className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {expandedModules.has(module.moduleId) ? (
                        <ChevronUp size={20} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                  {expandedModules.has(module.moduleId) && (
                    <div className="p-4 bg-white border-t space-y-4">
                      {/* Learn Blocks */}
                      {module.learnBlocks && module.learnBlocks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Učební bloky ({module.learnBlocks.length})</h4>
                          <div className="space-y-2">
                            {module.learnBlocks.map((block, bIndex) => (
                              <div key={bIndex} className="p-3 bg-blue-50 rounded border border-blue-100">
                                <div className="text-xs text-blue-600 mb-1">Blok #{block.position || bIndex + 1}</div>
                                <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                  {block.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Questions */}
                      {module.practiceQuestions && module.practiceQuestions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Otázky ({module.practiceQuestions.length})</h4>
                          <div className="space-y-2">
                            {module.practiceQuestions.map((q, qIndex) => (
                              <div key={qIndex} className="p-3 bg-green-50 rounded border border-green-100">
                                <div className="text-sm text-gray-700">
                                  <div className="font-medium">{qIndex + 1}. {q.question}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Typ: {q.questionType === 'closed' ? 'Uzavřená' : 'Otevřená'}
                                  </div>
                                  {q.questionType === 'closed' && q.closedOptions && (
                                    <div className="mt-1 text-xs text-gray-600">
                                      {q.closedOptions.map((opt, oIndex) => (
                                        <div key={oIndex} className={opt.text === q.correctAnswer ? 'text-green-600 font-medium' : ''}>
                                          {String.fromCharCode(65 + oIndex)}. {opt.text}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {q.questionType === 'open' && q.exampleAnswer && (
                                    <div className="mt-1 text-xs text-gray-600">
                                      Příklad odpovědi: {q.exampleAnswer}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {(!module.learnBlocks || module.learnBlocks.length === 0) && 
                       (!module.practiceQuestions || module.practiceQuestions.length === 0) && (
                        <p className="text-sm text-gray-500 italic">Tento modul nemá žádný obsah.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 sm:px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 sm:ml-auto text-sm sm:text-base"
          >
            Smazat kurz
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal - udelt do komponenty */}
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

export default CourseEditView;
