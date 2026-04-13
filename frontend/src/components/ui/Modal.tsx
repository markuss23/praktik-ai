'use client';

import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg p-6 w-full ${maxWidth} mx-4 shadow-xl border border-gray-300`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {children}
        {footer && (
          <div className="flex justify-end gap-3 mt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
