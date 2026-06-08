'use client';

import { useModalDismiss } from '@/hooks/useModalDismiss';

export type ConfirmVariant = 'primary' | 'danger' | 'warning';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantClasses: Record<ConfirmVariant, string> = {
  primary: 'bg-indigo-600 hover:bg-indigo-700',
  danger: 'bg-red-600 hover:bg-red-700',
  warning: 'bg-amber-500 hover:bg-amber-600',
};

/**
 * Reusable confirmation modal for significant / hard-to-reverse actions.
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Potvrdit',
  cancelLabel = 'Zrušit',
  loading = false,
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useModalDismiss(isOpen, onCancel);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-black break-words">{title}</h2>
        <p className="text-gray-700 mb-6 break-words">{message}</p>
        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-6 py-2 text-white rounded-md transition-colors disabled:bg-gray-400 ${variantClasses[variant]}`}
          >
            {loading ? 'Zpracovávám...' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
