'use client';

import { X } from "lucide-react";
import { Course } from "@/api";

interface CourseModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: {
    courseId: number | null;
    title: string;
    description: string;
    isPublished: boolean;
  };
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: any) => void;
}

export function CourseModal({
  isOpen,
  mode,
  formData,
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
}: CourseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">
            {mode === 'create' ? 'Vytvořit nový kurz' : 'Editovat kurz'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-2">
              Název kurzu *
            </label>
            <input
              type="text"
              id="course-title"
              required
              value={formData.title}
              onChange={(e) => onChange({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="např. Jak komunikovat s AI?"
            />
          </div>

          <div>
            <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 mb-2">
              Popis kurzu
            </label>
            <textarea
              id="course-description"
              rows={4}
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Stručný popis kurzu..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="course-published"
              checked={formData.isPublished}
              onChange={(e) => onChange({ ...formData, isPublished: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="course-published" className="ml-2 text-sm text-gray-700">
              Publikovaný
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Ukládání...' : (mode === 'create' ? 'Vytvořit kurz' : 'Uložit změny')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Zrušit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
