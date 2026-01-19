'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { createCourse, uploadCourseFile, generateCourseWithAI } from '@/lib/api-client';
import { CoursePageHeader } from '@/components/admin';

export default function AICreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'uploading' | 'generating'>('form');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    moduleCount: 3,
  });

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
      // Step 1: Create course
      setStep('uploading');
      let course;
      try {
        course = await createCourse({
          title: formData.title,
          description: formData.description || undefined,
          modulesCount: formData.moduleCount,
        });
      } catch (createErr: unknown) {
        // Check if it's a 400 error (course already exists)
        if (createErr && typeof createErr === 'object' && 'response' in createErr) {
          const response = (createErr as { response: Response }).response;
          if (response.status === 400) {
            const data = await response.json();
            throw new Error(data.detail || 'Kurz s tímto názvem již existuje');
          }
        }
        throw createErr;
      }

      // Step 2: Upload all files to course
      for (const file of files) {
        await uploadCourseFile(course.courseId, file);
      }

      // Step 3: Generate course with AI
      setStep('generating');
      await generateCourseWithAI(course.courseId);

      // Redirect to course content creation page
      router.push(`/admin/courses/${course.courseId}/content`);
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
    // handleSave now uses handleSubmit logic
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
      {/* Header - buttons disabled via showButtons=false */}
      <CoursePageHeader
        breadcrumb="Kurzy / Přehled kurzů / Popis kurzu"
        title="Popis kurzu"
        onSave={handleSave}
        showButtons={false}
      />

      {/* Main Content */}
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
                placeholder="V této kapitole se studenti seznámí s hlavními typy kávových zrn, konkrétně s Arabica a Robustou. Arabica je považována za kvalitnější a jemnější variantu, s komplexními chutovými profily, ovocnými a květinovými tóny, a s vysoce výraznou kyselostí. Naopak Robusta se vyznačuje silnější a hořkou chutí, nízká kyselostí, a vyšším obsahem kofeinu, což ji činí ideální pro espresso směsi. Důležitým aspektem je posouzení osobních preferencí spotřebitelů při výběru druhu kávových zrn."
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
                onClick={() => router.push('/admin')}
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
