'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Loader2, Upload, X, FileText } from 'lucide-react';
import { createCourse, uploadCourseFile, generateCourseWithAI, getCourseBlocks, getCourseTargets, getCourseSubjects } from '@/lib/api-client';
import { CoursePageHeader } from '@/components/admin';
import { CourseBlock, CourseTarget, CourseSubject } from '@/api';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';

// Tvorba kurzu pomocí AI generování
export function CourseAICreateView() {
  const { goToCourses, goToCourseContent } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'uploading' | 'generating'>('form');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    moduleCount: 3,
    durationMinutes: '',
    courseBlockId: 0,
    courseTargetId: 0,
    courseSubjectId: 0,
  });

  // Načtení katalogů při mountu
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [b, t, s] = await Promise.all([
          getCourseBlocks(),
          getCourseTargets(),
          getCourseSubjects(),
        ]);
        setBlocks(b);
        setTargets(t);
        setSubjects(s);
        setFormData(prev => ({
          ...prev,
          courseBlockId: b.length > 0 ? b[0].blockId : 0,
          courseTargetId: t.length > 0 ? t[0].targetId : 0,
          courseSubjectId: s.length > 0 ? s[0].subjectId : 0,
        }));
      } catch (err) {
        console.error('Failed to load catalogs:', err);
        setError('Nepodařilo se načíst katalogy');
      } finally {
        setCatalogsLoading(false);
      }
    }
    loadCatalogs();
  }, []);

  const ACCEPTED_TYPES = '.md,.docx';
  const ACCEPTED_EXTENSIONS = ['md', 'docx'];
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      return ACCEPTED_EXTENSIONS.includes(ext);
    });
    if (valid.length === 0) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
    setError('');
  }, []);

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
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
      
      if (formData.courseBlockId === 0 || formData.courseTargetId === 0 || formData.courseSubjectId === 0) {
        throw new Error('Prosím vyplňte všechny katalogové údaje');
      }

      let course;
      try {
        course = await createCourse({
          title: formData.title,
          description: formData.description || undefined,
          modulesCountAiGenerated: formData.moduleCount,
          durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : undefined,
          courseBlockId: formData.courseBlockId,
          courseTargetId: formData.courseTargetId,
          courseSubjectId: formData.courseSubjectId,
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

            {/* Katalogové údaje */}
            {catalogsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Načítám katalogy...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Tematický blok
                  </label>
                  <select
                    required
                    value={formData.courseBlockId}
                    onChange={(e) => setFormData({ ...formData, courseBlockId: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black bg-white"
                  >
                    <option value={0} disabled>Vyberte blok...</option>
                    {blocks.map((b) => (
                      <option key={b.blockId} value={b.blockId}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Cílová skupina
                  </label>
                  <select
                    required
                    value={formData.courseTargetId}
                    onChange={(e) => setFormData({ ...formData, courseTargetId: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black bg-white"
                  >
                    <option value={0} disabled>Vyberte skupinu...</option>
                    {targets.map((t) => (
                      <option key={t.targetId} value={t.targetId}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Obor
                  </label>
                  <select
                    required
                    value={formData.courseSubjectId}
                    onChange={(e) => setFormData({ ...formData, courseSubjectId: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black bg-white"
                  >
                    <option value={0} disabled>Vyberte obor...</option>
                    {subjects.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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

            {/* Počet modulů + Délka kurzu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Délka kurzu (minuty)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  className="w-32 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                  placeholder="60"
                />
              </div>
            </div>


            {/* Nahrát podklady */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">
                Nahrát podklady
              </label>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <Upload className={`mx-auto mb-3 ${dragActive ? 'text-purple-500' : 'text-gray-400'}`} size={32} />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Přetáhněte soubory sem nebo klikněte pro výběr
                </p>
                <p className="text-xs text-gray-500">
                  Markdown (.md) a Word (.docx) — lze vybrat více souborů najednou
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-700 truncate">{f.name}</span>
                        <span className="text-gray-400 flex-shrink-0">
                          ({(f.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        title="Odebrat soubor"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
