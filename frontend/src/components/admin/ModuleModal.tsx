'use client';

import { X } from "lucide-react";
import { Course } from "@/api";

interface ModuleModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: {
    moduleId: number | null;
    title: string;
    courseId: number;
    position: number;
  };
  courses: Course[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: any) => void;
}

export function ModuleModal({
  isOpen,
  mode,
  formData,
  courses,
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
}: ModuleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">
            {mode === 'create' ? 'Vytvořit nový modul' : 'Editovat modul'}
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
            <label htmlFor="module-course" className="block text-sm font-medium text-gray-700 mb-2">
              Kurz *
            </label>
            <select
              id="module-course"
              required
              value={formData.courseId}
              onChange={(e) => onChange({ ...formData, courseId: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              disabled={mode === 'create'}
            >
              <option value={0}>Vyberte kurz</option>
              {courses.map((course) => (
                <option key={course.courseId} value={course.courseId}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="module-title" className="block text-sm font-medium text-gray-700 mb-2">
              Název modulu *
            </label>
            <input
              type="text"
              id="module-title"
              required
              value={formData.title}
              onChange={(e) => onChange({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="např. Co je prompt a jak funguje AI"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || formData.courseId === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Ukládání...' : (mode === 'create' ? 'Vytvořit modul' : 'Uložit změny')}
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
