'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { createCourse, uploadCourseFile } from '@/lib/api-client';

export default function UploadCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

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
      
      // Also allow by extension for markdown files
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
      // Step 1: Create course
      const course = await createCourse({
        title: formData.title,
        description: formData.description || undefined,
      });
      
      // Step 2: Upload file to course
      await uploadCourseFile(course.courseId, file);
      
      // Redirect to course edit page
      router.push(`/admin/courses/${course.courseId}/edit`);
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
          <Link 
            href="/admin"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
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
              onClick={() => router.push('/admin')}
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
