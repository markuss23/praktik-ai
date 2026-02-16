'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { createCourse, uploadCourseFile, generateCourseWithAI, getCategories } from '@/lib/api-client';
import { CoursePageHeader } from '@/components/admin';
import { Category } from '@/api';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';

// Tvorba kurzu pomocí AI generování
export function CourseAICreateView() {
  const { goToCourses, goToCourseContent } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'uploading' | 'generating'>('form');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    moduleCount: 3,
    categoryId: 0,
  });

  // Načtení kategorií při mountu
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        setCategories(cats);
        if (cats.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: cats[0].categoryId }));
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
        setError('Nepodařilo se načíst kategorie');
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Prosím nahrajte alespoň jeden soubor s podklady');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setStep('uploading');
      
      if (formData.categoryId === 0) {
        throw new Error('Prosím vyberte kategorii kurzu');
      }
      
      let course;
      try {
        course = await createCourse({
          title: formData.title,
          description: formData.description || undefined,
          modulesCount: formData.moduleCount,
          categoryId: formData.categoryId,
        });
      } catch (createErr: unknown) {
        if (createErr && typeof createErr === 'object' && 'response' in createErr) {
          const response = (createErr as { response: Response }).response;
          if (response.status === 400) {
            const data = await response.json();
            throw new Error(data.detail || 'Kurz s tímto názvem již existuje');
          }
        }
        throw createErr;
      }

      // Nahrání všech souborů
      for (const file of files) {
        await uploadCourseFile(course.courseId, file);
      }

      // Generování kurzu pomocí AI
      setStep('generating');
      await generateCourseWithAI(course.courseId);

      // Přechod na editor obsahu kurzu
      goToCourseContent(course.courseId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: Response }).response;
        try {
          const data = await response.json();
          setError(data.detail || 'Nepodařilo se vytvořit kurz');
        } catch {
          setError(`Chyba serveru: ${response.status}`);
        }
      } else {
        setError('Nepodařilo se vytvořit kurz');
      }
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleSubmit(fakeEvent);
  };

  const getStepMessage = () => {
    switch (step) {
      case 'uploading':
        return 'Nahrávám podklady...';
      case 'generating':
        return 'AI generuje kurz... Toto může trvat několik minut.';
      default:
        return 'Pokračovat';
    }
  };

  return (
    <div className="flex-1">
      <CoursePageHeader
        breadcrumb="Kurzy / Přehled kurzů / Popis kurzu"
        title="Popis kurzu"
        onSave={handleSave}
        showButtons={false}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Název kurzu */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Název kurzu
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                placeholder="Výběr zrn kávy"
              />
            </div>

            {/* Kategorie kurzu */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Kategorie kurzu
              </label>
              {categoriesLoading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Načítám kategorie...</span>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-red-500">Žádné kategorie nejsou k dispozici. Nejprve vytvořte kategorii.</p>
              ) : (
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black bg-white"
                >
                  <option value={0} disabled>Vyberte kategorii...</option>
                  {categories.map((cat) => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Popis kurzu */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Popis kurzu
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black resize-none"
                placeholder="V této kapitole se studenti seznámí s hlavními typy kávových zrn..."
              />
            </div>

            {/* Počet modulů */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Počet modulů
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, moduleCount: Math.max(1, formData.moduleCount - 1) })}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xl text-black"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.moduleCount}
                  onChange={(e) => setFormData({ ...formData, moduleCount: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, moduleCount: Math.min(20, formData.moduleCount + 1) })}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xl text-black"
                >
                  +
                </button>
              </div>
            </div>

            {/* Nahrát podklady */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Nahrát podklady
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
                >
                  Nahrát podklady
                </button>
                <span className="text-sm text-gray-500">
                  {files.length > 0 ? `${files.length} soubor(ů) vybráno: ${files.map(f => f.name).join(', ')}` : 'Žádné soubory vybrány'}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Tlačítka */}
            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={goToCourses}
                disabled={loading}
                className="text-gray-600 hover:text-gray-800 transition-colors text-sm disabled:opacity-50"
              >
                Zpět
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !formData.title}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                <span>{loading ? getStepMessage() : 'Pokračovat'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CourseAICreateView;
