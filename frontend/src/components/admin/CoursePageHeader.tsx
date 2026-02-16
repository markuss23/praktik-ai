'use client';

import { ArrowRight } from 'lucide-react';

interface CoursePageHeaderProps {
  breadcrumb: string;
  title: string;
  onSave?: () => void;
  onPreview?: () => void;
  showButtons?: boolean;
}

/**
 * Reusable header component for course admin pages
 * Contains breadcrumb, title, and optional action buttons
 */
export function CoursePageHeader({
  breadcrumb,
  title,
  onSave,
  onPreview,
  showButtons = false,
}: CoursePageHeaderProps) {
  return (
    <div className="bg-white border-b">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">
              {breadcrumb}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-black">{title}</h1>
          </div>
          {/* Header buttons commented out as requested */}
          {showButtons && (
            <div className="flex items-center gap-2 sm:gap-3">
              {onPreview && (
                <button
                  type="button"
                  onClick={onPreview}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Živý náhled kurzu
                </button>
              )}
              {onSave && (
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <ArrowRight size={16} />
                  <span>Uložit</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoursePageHeader;
