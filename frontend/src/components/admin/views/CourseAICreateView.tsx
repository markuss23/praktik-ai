'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Loader2, Upload, X, FileText, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createCourse, uploadCourseFile, generateCourseWithAI, getCourseBlocks, getCourseTargets, getCourseSubjects, getCourseGenerationProgress, getActiveCourseGeneration, type CourseGenerationProgress } from '@/lib/api-client';
import { CoursePageHeader } from '@/components/admin';
import { CourseBlock, CourseTarget, CourseSubject, Difficulty } from '@/api';
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from '@/lib/difficulty';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';

// Klíč v localStorage, kterým si pamatujeme rozpracovanou AI generaci.
// Slouží k tomu, aby refresh stránky uprostřed generování nezahodil UI —
// na mountu si přečteme courseId a obnovíme polling progresu.
const ACTIVE_GENERATION_KEY = 'praktik-ai:active-course-generation';

// Tvorba kurzu pomocí AI generování
export function CourseAICreateView() {
  const { goToCourses, goToCourseContent } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'uploading' | 'generating'>('form');
  const [error, setError] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseGenerationProgress | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCourseIdRef = useRef<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    moduleCount: number;
    durationMinutes: string;
    courseBlockId: number;
    courseTargetId: number;
    courseSubjectId: number;
    difficulty: Difficulty;
  }>({
    title: '',
    description: '',
    moduleCount: 3,
    durationMinutes: '',
    courseBlockId: 0,
    courseTargetId: 0,
    courseSubjectId: 0,
    // Default obtížnosti dle požadavku — mírně pokročilý.
    difficulty: Difficulty.SlightlyAdvanced,
  });

  // Zastavení polling timeru při unmountu
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const clearActiveGeneration = useCallback(() => {
    activeCourseIdRef.current = null;
    try {
      localStorage.removeItem(ACTIVE_GENERATION_KEY);
    } catch {
      // localStorage může být nedostupný (private mode) — ignorujeme
    }
  }, []);

  const rememberActiveGeneration = useCallback((courseId: number) => {
    activeCourseIdRef.current = courseId;
    try {
      localStorage.setItem(ACTIVE_GENERATION_KEY, String(courseId));
    } catch {
      // localStorage může být nedostupný — bez persistencí jen ztratíme možnost
      // resume po refreshi, ale generace na backendu beží dál
    }
  }, []);

  const startProgressPolling = useCallback((courseId: number, initialProgress?: CourseGenerationProgress) => {
    stopPolling();
    rememberActiveGeneration(courseId);
    setProgress(initialProgress ?? { step: 0, total: 5, label: 'Spouštění generování', status: 'running', error: null });
    pollTimerRef.current = setInterval(async () => {
      try {
        const p = await getCourseGenerationProgress(courseId);
        setProgress(p);
        if (p.status === 'completed') {
          stopPolling();
          clearActiveGeneration();
          goToCourseContent(courseId);
        } else if (p.status === 'failed') {
          stopPolling();
          clearActiveGeneration();
          setGenerationError(p.error || 'Generování kurzu se nezdařilo. Zkuste to prosím znovu.');
          setProgress(null);
          setStep('form');
          setLoading(false);
        }
      } catch {
        // Ignoruj jednotlivé chyby pollingu — zkusíme to znovu příští tick
      }
    }, 1500);
  }, [stopPolling, rememberActiveGeneration, clearActiveGeneration, goToCourseContent]);

  // Resume po refreshi: na mountu zjistíme, jestli pro nás backend vede
  // běžící generaci kurzu, a pokud ano, znovu se na ni napojíme.
  useEffect(() => {
    let cancelled = false;
    async function resume() {
      let savedId: number | null = null;
      try {
        const raw = localStorage.getItem(ACTIVE_GENERATION_KEY);
        if (raw) {
          const parsed = Number(raw);
          if (Number.isFinite(parsed) && parsed > 0) savedId = parsed;
        }
      } catch {
        // ignore
      }

      // Backend lookup je primárním zdrojem pravdy o tom, co aktuálně běží.
      // localStorage používáme jen jako fallback (offline backend) a k zachycení
      // situace, kdy generace stihla doběhnout dříve, než se uživatel vrátil.
      let backendActive: number | null = null;
      let backendOk = true;
      try {
        backendActive = await getActiveCourseGeneration();
      } catch {
        backendOk = false;
      }

      const activeId = backendActive ?? (backendOk ? savedId : savedId);
      if (cancelled || activeId === null) return;

      try {
        const p = await getCourseGenerationProgress(activeId);
        if (cancelled) return;
        if (p.status === 'completed') {
          clearActiveGeneration();
          goToCourseContent(activeId);
          return;
        }
        if (p.status === 'failed') {
          clearActiveGeneration();
          setGenerationError(p.error || 'Generování kurzu se nezdařilo. Zkuste to prosím znovu.');
          return;
        }
        if (backendActive === null && backendOk && p.status === 'pending') {
          // Backend potvrdil, že nic neběží, a o uloženém kurzu nic neví —
          // localStorage je zastaralý (např. po restartu serveru). Vyčisti.
          clearActiveGeneration();
          return;
        }
        // running (nebo pending s tím, že backend potvrdil běh) — připoj polling
        setStep('generating');
        setLoading(true);
        startProgressPolling(activeId, p);
      } catch {
        // Pokud kurz neexistuje nebo na něj nemáme práva, zapomeň ho
        clearActiveGeneration();
      }
    }
    resume();
    return () => { cancelled = true; };
  }, [startProgressPolling, clearActiveGeneration, goToCourseContent]);

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

    // Validation
    const title = formData.title.trim();
    if (title.length < 3 || title.length > 120) {
      setError('Název kurzu musí mít 3 až 120 znaků.');
      return;
    }
    const desc = formData.description.trim();
    if (desc.length < 3 || desc.length > 500) {
      setError('Popis kurzu musí mít 3 až 500 znaků.');
      return;
    }
    if (formData.moduleCount < 1 || formData.moduleCount > 12) {
      setError('Počet modulů musí být mezi 1 a 12.');
      return;
    }
    const duration = formData.durationMinutes ? parseInt(formData.durationMinutes) : 0;
    if (formData.durationMinutes && (duration < 15 || duration > 300)) {
      setError('Délka kurzu musí být mezi 15 a 300 minutami.');
      return;
    }

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
          durationMinutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : formData.moduleCount * 20,
          courseBlockId: formData.courseBlockId,
          courseTargetId: formData.courseTargetId,
          courseSubjectId: formData.courseSubjectId,
          difficulty: formData.difficulty,
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

      // Generování kurzu pomocí AI — backend ho spustí na pozadí a vrátí se ihned;
      // polling progresu se postará o navigaci po dokončení i o chybové stavy.
      setStep('generating');
      startProgressPolling(course.courseId);
      try {
        await generateCourseWithAI(course.courseId);
      } catch (genErr: unknown) {
        stopPolling();
        clearActiveGeneration();
        let message = 'Generování kurzu se nezdařilo. Zkuste to prosím znovu.';
        if (genErr && typeof genErr === 'object' && 'response' in genErr) {
          const response = (genErr as { response: Response }).response;
          try {
            const data = await response.json();
            message = data.detail || `Chyba serveru: ${response.status}`;
          } catch {
            message = `Chyba serveru: ${response.status}`;
          }
        } else if (genErr instanceof Error && genErr.message) {
          message = genErr.message;
        }
        setGenerationError(message);
        setProgress(null);
        setStep('form');
        setLoading(false);
      }
    } catch (err: unknown) {
      stopPolling();
      clearActiveGeneration();
      setProgress(null);
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
    <div className="flex-1 lg:h-full lg:overflow-hidden flex flex-col">
      <div className="flex-shrink-0">
        <CoursePageHeader
          breadcrumb="Kurzy / Přehled kurzů / Popis kurzu"
          title="Popis kurzu"
          onSave={handleSave}
          showButtons={false}
        />
      </div>

      <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8">
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
                minLength={3}
                maxLength={120}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                placeholder="Výběr zrn kávy"
              />
              <span className="text-xs text-gray-400 mt-1">{formData.title.length}/120</span>
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
                minLength={3}
                maxLength={500}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black resize-none"
                placeholder="V této kapitole se studenti seznámí s hlavními typy kávových zrn..."
              />
              <span className="text-xs text-gray-400 mt-1">{formData.description.length}/500</span>
            </div>

            {/* Počet modulů + Doporučená obtížnost + Délka kurzu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    max="12"
                    value={formData.moduleCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setFormData({ ...formData, moduleCount: Math.min(12, Math.max(1, val)) });
                    }}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, moduleCount: Math.min(12, formData.moduleCount + 1) })}
                    className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-xl text-black"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Doporučená obtížnost
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({ ...formData, difficulty: e.target.value as Difficulty })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black bg-white"
                >
                  {DIFFICULTY_ORDER.map((d: Difficulty) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Délka kurzu (minuty)
                </label>
                <input
                  type="number"
                  min="15"
                  max="300"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
                  placeholder={String(formData.moduleCount * 20)}
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
                disabled={loading || formData.title.trim().length < 3 || formData.description.trim().length < 3}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                <span>{loading ? getStepMessage() : 'Pokračovat'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {step === 'uploading' && (
          <motion.div
            key="progress-upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            >
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="text-purple-600 animate-spin" />
                <h3 className="text-lg font-bold text-gray-900">Nahrávání podkladů</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2">Soubory se nahrávají na server...</p>
            </motion.div>
          </motion.div>
        )}

        {step === 'generating' && progress && progress.status !== 'failed' && (
          <motion.div
            key="progress-generate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
              role="dialog"
              aria-modal="true"
              aria-label="Průběh generování kurzu"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">AI generuje váš kurz</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Toto může trvat několik minut. Prosím neopouštějte stránku.
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Loader2 size={12} className="animate-spin text-purple-600" />
                    {progress.label}
                  </span>
                  <span className="tabular-nums">
                    {Math.min(progress.step, progress.total)} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.round((Math.min(progress.step, progress.total) / progress.total) * 100)}%`,
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Steps list */}
              <ul className="space-y-2 text-sm">
                {[
                  { n: 1, label: 'Načítání kurzu z databáze' },
                  { n: 2, label: 'Načítání podkladů' },
                  { n: 3, label: 'Zpracování podkladů (AI)' },
                  { n: 4, label: 'Plánování modulů (AI)' },
                  { n: 5, label: 'Ukládání kurzu' },
                ].map(({ n, label }) => {
                  const done = progress.step > n || progress.status === 'completed';
                  const active = progress.step === n && progress.status === 'running';
                  return (
                    <li
                      key={n}
                      className={`flex items-center gap-2 ${
                        done ? 'text-gray-500' : active ? 'text-gray-900 font-medium' : 'text-gray-400'
                      }`}
                    >
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {done ? (
                          <Check size={14} className="text-green-600" />
                        ) : active ? (
                          <Loader2 size={14} className="animate-spin text-purple-600" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        )}
                      </span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        )}

        {generationError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
              role="alertdialog"
              aria-modal="true"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Generování kurzu selhalo</h3>
                  <p className="text-sm text-gray-600 mt-1 break-words">{generationError}</p>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setGenerationError(null);
                    goToCourses();
                  }}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  Přejít na kurzy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseAICreateView;
