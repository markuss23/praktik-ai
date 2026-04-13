'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Potvrdit',
  cancelLabel = 'Zrušit',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onCancel}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <AlertTriangle size={20} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600 mt-1">{message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
