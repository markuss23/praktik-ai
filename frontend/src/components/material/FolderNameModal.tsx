"use client";

import { useEffect, useState } from "react";
import { useModalDismiss } from "@/hooks/useModalDismiss";

interface FolderNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  initialName?: string;
  title?: string;
  submitLabel?: string;
}

export function FolderNameModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = "",
  title = "Pojemnujte novou složku",
  submitLabel = "Vytvořit složku",
}: FolderNameModalProps) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalDismiss(isOpen, () => {
    if (!submitting) onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError("Zadejte název složky.");
      return;
    }
    if (trimmed.length > 60) {
      setError("Název složky může mít maximálně 60 znaků.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Složku se nepodařilo vytvořit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-black mb-4">{title}</h3>

        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nová složka"
          maxLength={60}
          className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
        />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="flex justify-between items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          >
            Zrušit akci
          </button>
          <button
            type="submit"
            disabled={submitting || name.trim().length < 1}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Ukládání…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
