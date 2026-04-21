'use client';

import { useState } from "react";
import { X } from "lucide-react";
import type { CourseBlock } from "@/api";

interface CourseModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: {
    courseId: number | null;
    title: string;
    description: string;
    courseBlockId?: number;
  };
  blocks?: CourseBlock[];
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
  blocks = [],
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
}: CourseModalProps) {
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = formData.title.trim();
    const desc = formData.description.trim();

    if (title.length < 3 || title.length > 120) {
      setValidationError('Název kurzu musí mít 3 až 120 znaků.');
      return;
    }
    if (desc.length < 3 || desc.length > 500) {
      setValidationError('Popis kurzu musí mít 3 až 500 znaků.');
      return;
    }
    if (mode === 'create' && blocks.length > 0 && !formData.courseBlockId) {
      setValidationError('Vyberte tematický blok.');
      return;
    }

    setValidationError('');
    onSubmit(e);
  };

  const displayError = validationError || error;

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

        {displayError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-2">
              Název kurzu *
            </label>
            <input
              type="text"
              id="course-title"
              required
              minLength={3}
              maxLength={120}
              value={formData.title}
              onChange={(e) => onChange({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="např. Jak komunikovat s AI?"
            />
            <span className="text-xs text-gray-400 mt-1">{formData.title.length}/120</span>
          </div>

          <div>
            <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 mb-2">
              Popis kurzu *
            </label>
            <textarea
              id="course-description"
              required
              rows={4}
              minLength={3}
              maxLength={500}
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Stručný popis kurzu..."
            />
            <span className="text-xs text-gray-400 mt-1">{formData.description.length}/500</span>
          </div>

          {/* Block selection */}
          {blocks.length > 0 && (
            <div>
              <label htmlFor="course-block" className="block text-sm font-medium text-gray-700 mb-2">
                Tematický blok *
              </label>
              <select
                id="course-block"
                required
                value={formData.courseBlockId ?? 0}
                onChange={(e) => onChange({ ...formData, courseBlockId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
              >
                <option value={0} disabled>Vyberte blok...</option>
                {blocks.map((b) => (
                  <option key={b.blockId} value={b.blockId}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || formData.title.trim().length < 3 || formData.description.trim().length < 3}
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
