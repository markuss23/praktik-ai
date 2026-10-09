'use client';

import { Check, Eye, Loader2, Maximize, Menu, MessageSquare, Minimize, Save } from 'lucide-react';
import type { SaveStatus } from '@/hooks/useAutosave';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { useAdminChrome } from './AdminChromeProvider';

interface CoursePageHeaderProps {
  breadcrumb: string;
  title: string;
  stepLabel?: string;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  // Když je předán, místo tlačítka Uložit se zobrazí informativní indikátor autosave.
  saveStatus?: SaveStatus;
  /** Náhled pro studenta — přepínač mezi editorem a studentským pohledem. */
  preview?: { active: boolean; onToggle: () => void };
 showFullscreenToggle?: boolean;
  showButtons?: boolean;
  onMenuClick?: () => void;
  onCommentsClick?: () => void;
  commentsCount?: number;
}

// indikátor stavu autosave
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const isSaving = status === 'saving' || status === 'pending';

  return (
    <div
      role="status"
      aria-live="polite"
      title="Změny se ukládají automaticky"
      className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-md border text-sm font-medium select-none cursor-default ${
        isSaving
          ? 'bg-tip/10 text-tip border-tip/30'
          : 'bg-success/10 text-success border-success/30 save-status-pop'
      }`}
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
      <span>{isSaving ? 'Ukládám…' : 'Uloženo'}</span>
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
  stepLabel,
  preview,
  showFullscreenToggle = false,
  showButtons = false,
  onMenuClick,
  onCommentsClick,
  commentsCount,
}: CoursePageHeaderProps) {
  const { focusMode, toggleFocusMode } = useAdminChrome();

  return (
    <div className="bg-card border-b">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            {onMenuClick && (
              <Button
                variant="plain"
                type="button"
                onClick={onMenuClick}
                className={cn(BTN_KEEP_BOX, "lg:hidden p-2 -ml-2 mt-0.5 hover:bg-muted rounded-md transition-colors shrink-0")}
                aria-label="Otevřít kroky tvorby a moduly"
              >
                <Menu size={20} />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 truncate">
                {breadcrumb}
              </p>
              <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">{title}</h1>
                {stepLabel && (
                  <span className="shrink-0 text-xs sm:text-sm text-muted-foreground">{stepLabel}</span>
                )}
              </div>
            </div>
            {onCommentsClick && (
              <Button
                variant="plain"
                type="button"
                onClick={onCommentsClick}
                className={cn(BTN_KEEP_BOX, "lg:hidden relative p-2 -mr-2 mt-0.5 hover:bg-muted rounded-md transition-colors shrink-0")}
                aria-label="Zobrazit komentáře"
              >
                <MessageSquare size={20} />
                {commentsCount !== undefined && commentsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-accent text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {commentsCount}
                  </span>
                )}
              </Button>
            )}
          </div>
          {showButtons && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {preview && (
                <Button
                  variant={preview.active ? 'brand-solid' : 'outline'}
                  size="lg"
                  type="button"
                  onClick={preview.onToggle}
                  aria-pressed={preview.active}
                  aria-label={preview.active ? 'Ukončit náhled' : 'Náhled pro studenta'}
                  className="px-3"
                >
                  <Eye data-icon="inline-start" />
                  <span className="hidden sm:inline">
                    {preview.active ? 'Ukončit náhled' : 'Náhled pro studenta'}
                  </span>
                </Button>
              )}
              {showFullscreenToggle && (
                <Button
                  variant="outline"
                  size="lg"
                  type="button"
                  onClick={toggleFocusMode}
                  aria-pressed={focusMode}
                  aria-label={focusMode ? 'Zavřít celou obrazovku' : 'Celá obrazovka'}
                  title={focusMode ? 'Zavřít celou obrazovku (Esc)' : 'Celá obrazovka'}
                  // Mimo fokus režim jen na desktopu (panely, které schovává, jsou
                  // jen tam); v něm vždy — fullscreen může layout zúžit pod lg.
                  className={cn('px-3', focusMode ? 'inline-flex' : 'hidden lg:inline-flex')}
                >
                  {focusMode ? <Minimize data-icon="inline-start" /> : <Maximize data-icon="inline-start" />}
                  <span className="hidden sm:inline">{focusMode ? 'Zavřít celou obrazovku' : 'Celá obrazovka'}</span>
                </Button>
              )}
              {saveStatus !== undefined ? (
                <SaveStatusIndicator status={saveStatus} />
              ) : onSave ? (
                <Button
                  variant="plain"
                  onClick={onSave}
                  disabled={saving}
                  className={cn(BTN_KEEP_BOX, `flex items-center gap-2 px-4 sm:px-5 py-2 rounded-md transition-colors text-sm text-primary-foreground disabled:opacity-70 ${
                    saved ? 'bg-primary hover:bg-primary/80' : 'bg-primary hover:bg-primary/80'
                  }`)}
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : saved ? (
                    <Check size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{saving ? 'Ukládám...' : saved ? 'Uloženo' : 'Uložit'}</span>
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoursePageHeader;
