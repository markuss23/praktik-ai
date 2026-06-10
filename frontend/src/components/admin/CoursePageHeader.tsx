'use client';

import { Check, Cloud, Loader2, Menu, MessageSquare, Save } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutosave';

interface CoursePageHeaderProps {
  breadcrumb: string;
  title: string;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  // Když je předán, místo tlačítka Uložit se zobrazí informativní indikátor autosave.
  saveStatus?: SaveStatus;
  onPreview?: () => void;
  showButtons?: boolean;
  onMenuClick?: () => void;
  onCommentsClick?: () => void;
  commentsCount?: number;
}

// Neklikatelný indikátor stavu autosave.
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const isSaving = status === 'saving';
  const isPending = status === 'pending';

  const styles = isPending
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : isSaving
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div
      role="status"
      aria-live="polite"
      title="Změny se ukládají automaticky"
      className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-md border text-sm font-medium select-none cursor-default ${styles} ${
        status === 'saving' || status === 'saved' ? 'save-status-pop' : ''
      }`}
    >
      {isSaving ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isPending ? (
        <Cloud size={16} />
      ) : (
        <Check size={16} />
      )}
      <span>{isSaving ? 'Ukládám…' : isPending ? 'Neuložené změny…' : 'Uloženo'}</span>
    </div>
  );
}

/**
 * Reusable header component for course admin pages
 * Contains breadcrumb, title, and optional action buttons
 */
export function CoursePageHeader({
  breadcrumb,
  title,
  onSave,
  saving = false,
  saved = false,
  saveStatus,
  onPreview,
  showButtons = false,
  onMenuClick,
  onCommentsClick,
  commentsCount,
}: CoursePageHeaderProps) {
  return (
    <div className="bg-white border-b">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            {onMenuClick && (
              <button
                type="button"
                onClick={onMenuClick}
                className="lg:hidden p-2 -ml-2 mt-0.5 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                aria-label="Otevřít osnovu"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1 truncate">
                {breadcrumb}
              </p>
              <h1 className="text-lg sm:text-2xl font-bold text-black truncate">{title}</h1>
            </div>
            {onCommentsClick && (
              <button
                type="button"
                onClick={onCommentsClick}
                className="lg:hidden relative p-2 -mr-2 mt-0.5 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                aria-label="Zobrazit komentáře"
              >
                <MessageSquare size={20} />
                {commentsCount !== undefined && commentsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {commentsCount}
                  </span>
                )}
              </button>
            )}
          </div>
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
              {saveStatus !== undefined ? (
                <SaveStatusIndicator status={saveStatus} />
              ) : onSave ? (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-md transition-colors text-sm text-white disabled:opacity-70 ${
                    saved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : saved ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? 'Ukládám...' : saved ? 'Uloženo' : 'Uložit'}</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoursePageHeader;
