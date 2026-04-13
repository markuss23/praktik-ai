'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { createCourse, uploadCourseFile, getCourseBlocks, getCourseTargets, getCourseSubjects } from '@/lib/api-client';
import { CourseBlock, CourseTarget, CourseSubject } from '@/api';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';

// Nahrání souboru pro vytvoření kurzu
export function CourseUploadView() {
  const { goToCourses, goToCourseEdit } = useAdminNavigation();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseBlockId: 0,
    courseTargetId: 0,
    courseSubjectId: 0,
  });

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
      } finally {
        setCatalogsLoading(false);
      }
    }
    loadCatalogs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/markdown',
        'text/plain',
      ];
      
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.md', '.txt'];
      const fileExt = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (allowedTypes.includes(selectedFile.type) || allowedExtensions.includes(fileExt)) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Nepodporovaný formát souboru. Povolené formáty: PDF, Word, Excel, Markdown');
        setFile(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Vyberte prosím soubor');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const course = await createCourse({
        title: formData.title,
        description: formData.description || undefined,
        courseBlockId: formData.courseBlockId,
        courseTargetId: formData.courseTargetId,
        courseSubjectId: formData.courseSubjectId,
      });
      
      await uploadCourseFile(course.courseId, file);
      
      // Přechod na editaci kurzu
      goToCourseEdit(course.courseId);
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
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    return '📁';
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <button 
            onClick={goToCourses}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-black flex items-center gap-2">
              <Upload className="text-blue-600 flex-shrink-0" size={20} />
              <span className="truncate">Nahrát soubor kurzu</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
              Kurz / Přehled kurzů / Nahrát soubor
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Název kurzu */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">Název kurzu</h2>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm sm:text-base"
              placeholder="např. Jak komunikovat s AI?"
            />
          </div>

          {/* Popis kurzu */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">Popis kurzu</h2>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black resize-none text-sm sm:text-base"
              placeholder="Stručný popis kurzu..."
            />
          </div>

          {/* Katalogové údaje */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">Zařazení kurzu</h2>
            {catalogsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Načítám katalogy...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tematický blok</label>
                  <select
                    required
                    value={formData.courseBlockId}
                    onChange={(e) => setFormData({ ...formData, courseBlockId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white text-sm"
                  >
                    {blocks.map((b) => (
                      <option key={b.blockId} value={b.blockId}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cílová skupina</label>
                  <select
                    required
                    value={formData.courseTargetId}
                    onChange={(e) => setFormData({ ...formData, courseTargetId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white text-sm"
                  >
                    {targets.map((t) => (
                      <option key={t.targetId} value={t.targetId}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Obor</label>
                  <select
                    required
                    value={formData.courseSubjectId}
                    onChange={(e) => setFormData({ ...formData, courseSubjectId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-white text-sm"
                  >
                    {subjects.map((s) => (
                      <option key={s.subjectId} value={s.subjectId}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Upload souboru */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">Nahrát soubor</h2>
            
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Upload className="mx-auto mb-3 sm:mb-4 text-gray-400" size={36} />
                <p className="text-gray-700 font-medium mb-2 text-sm sm:text-base">
                  Klikněte pro výběr souboru
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  PDF, Word, Excel, Markdown
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.md,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="text-2xl sm:text-3xl flex-shrink-0">{getFileIcon(file.type)}</span>
                  <div className="min-w-0">
                    <p className="text-black font-medium text-sm sm:text-base truncate">{file.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            )}
          </div>

          {/* Tlačítka */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={goToCourses}
              className="px-4 sm:px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-sm sm:text-base"
            >
              Zpět
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {loading ? 'Vytváření...' : 'Vytvořit kurz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourseUploadView;
