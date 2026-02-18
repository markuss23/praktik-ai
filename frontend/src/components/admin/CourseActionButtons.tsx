'use client';

import { ReactNode } from 'react';
import { Pencil, Eye, EyeOff, Trash2 } from 'lucide-react';

// =============================================================================
// Individual action button variants
// =============================================================================

interface ActionButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
  iconSize?: number;
}

/**
 * Edit / expand button (green).
 */
export function EditActionButton({ onClick, title = 'Editovat', iconSize = 16 }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      title={title}
    >
      <Pencil size={iconSize} />
    </button>
  );
}

/**
 * Publish / unpublish toggle button (green ↔ orange).
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
      className={`p-2 text-white rounded-md transition-colors ${
        isPublished
          ? 'bg-orange-500 hover:bg-orange-600'
          : 'bg-green-500 hover:bg-green-600'
      }`}
      title={title ?? (isPublished ? 'Zrušit publikování' : 'Publikovat')}
    >
      {isPublished ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
    </button>
  );
}

/**
 * Delete button (red).
 */
export function DeleteActionButton({ onClick, title = 'Smazat', iconSize = 16 }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      title={title}
    >
      <Trash2 size={iconSize} />
    </button>
  );
}

// =============================================================================
// Generic wrapper – renders a row of action buttons
// =============================================================================

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
