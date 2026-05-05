'use client';

import { useEffect } from 'react';

/**
 * Modal dismissal helper for client-side dialogs (BUG-005).
 *
 * - Closes the modal on Escape (the test report flagged that the AI Settings
 *   modal ignored Esc).
 * - Locks the document body scroll so background content doesn't shift while
 *   the modal is open.
 *
 * Usage: call inside a modal component with the same `isOpen` flag and the
 * onClose callback the user clicks "X" with.
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);
}
