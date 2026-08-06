'use client';

import { ReactNode } from 'react';
import { Pencil, Eye, EyeOff, Trash2, CheckCircle, RotateCcw } from 'lucide-react';


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
    <button
      onClick={onClick}
      className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 transition-colors"
      title={title}
    >
      <Pencil size={iconSize} />
    </button>
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
    <button
      onClick={onClick}
      className={`p-2 text-primary-foreground rounded-md transition-colors ${
        isPublished
          ? 'bg-brand-accent hover:bg-brand-accent/80'
          : 'bg-primary hover:bg-primary/80'
      }`}
      title={title ?? (isPublished ? 'Zrušit publikování' : 'Publikovat')}
    >
      {isPublished ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
    </button>
  );
}

/**
 * Delete button
 */
export function DeleteActionButton({ onClick, title = 'Smazat', iconSize = 16 }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-destructive text-primary-foreground rounded-md hover:bg-destructive/80 transition-colors"
      title={title}
    >
      <Trash2 size={iconSize} />
    </button>
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
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`p-2 text-primary-foreground rounded-md transition-colors ${
        isLoading
          ? 'bg-warning cursor-wait'
          : isApproved
            ? 'bg-warning hover:bg-warning/80'
            : 'bg-primary hover:bg-primary/80'
      }`}
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
    </button>
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
