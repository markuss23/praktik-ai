'use client';

import { ReactNode } from 'react';
import { Pencil, Eye, EyeOff, Trash2, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

// Ikony mají volitelnou velikost (16/14/12 px podle hustoty tabulky), takže
// místo pevného `size="icon"` necháváme rozměr určit padding + ikona.
const ICON_BTN = cn(BTN_KEEP_BOX, 'p-2 rounded-md');

interface ActionButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  iconSize?: number;
}

/**
 * Edit / expand button
 */
export function EditActionButton({ onClick, title = 'Editovat', iconSize = 16 }: ActionButtonProps) {
  return (
    <Button size="icon" onClick={onClick} className={ICON_BTN} title={title}>
      <Pencil size={iconSize} />
    </Button>
  );
}

/**
 * Publish / unpublish toggle button
 */
export function PublishActionButton({
  onClick,
  isPublished,
  title,
  iconSize = 16,
}: ActionButtonProps & { isPublished: boolean }) {
  return (
    <Button
      size="icon"
      onClick={onClick}
      className={cn(
        ICON_BTN,
        isPublished && 'bg-brand-accent hover:bg-brand-accent/80',
      )}
      title={title ?? (isPublished ? 'Zrušit publikování' : 'Publikovat')}
    >
      {isPublished ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
    </Button>
  );
}

/**
 * Delete button
 */
export function DeleteActionButton({ onClick, title = 'Smazat', iconSize = 16 }: ActionButtonProps) {
  return (
    <Button
      size="icon"
      onClick={onClick}
      className={cn(ICON_BTN, 'bg-destructive text-primary-foreground hover:bg-destructive/80')}
      title={title}
    >
      <Trash2 size={iconSize} />
    </Button>
  );
}

/**
 * Approve / unapprove toggle button.
 */
export function ApproveActionButton({
  onClick,
  isApproved,
  disabled,
  isLoading,
  iconSize = 16,
}: ActionButtonProps & { isApproved: boolean; isLoading?: boolean }) {
  return (
    <Button
      size="icon"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        ICON_BTN,
        isLoading
          ? 'bg-warning cursor-wait'
          : isApproved
            ? 'bg-warning hover:bg-warning/80'
            : '',
      )}
      title={isApproved ? 'Zrušit schválení (zpět na Vygenerováno)' : 'Schválit kurz a generovat embeddingy'}
    >
      {isLoading ? (
        <div
          className="border-2 border-white border-t-transparent rounded-full animate-spin"
          style={{ width: iconSize - 2, height: iconSize - 2 }}
        />
      ) : isApproved ? (
        <RotateCcw size={iconSize} />
      ) : (
        <CheckCircle size={iconSize} />
      )}
    </Button>
  );
}

// Generic wrapper – renders a row of action buttons

interface CourseActionButtonsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Container that lays out action buttons in a horizontal row with gap.
 */
export function CourseActionButtons({ children, className = '' }: CourseActionButtonsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

export default CourseActionButtons;
