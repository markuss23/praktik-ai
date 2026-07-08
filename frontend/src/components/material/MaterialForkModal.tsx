"use client";

import { useEffect, useState } from "react";
import { useModalDismiss } from "@/hooks/useModalDismiss";
import { createResourceFork } from "@/components/material/api";
import { apiErrorDetail } from "@/lib/api-client";

interface MaterialForkModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: number;
  defaultTitle: string;
  defaultDescription?: string;
  /** Zavolá se po úspěšném vytvoření kopie (předá ID nového draftu). */
  onForked?: (newResourceId: number) => void;
}

/**
 * Modal pro vytvoření kopie (forku) veřejného materiálu do vlastní sbírky.
 * Vznikne nový materiál ve stavu draft; soubory a hodnocení se nekopírují.
 */
export function MaterialForkModal({
  isOpen,
  onClose,
  resourceId,
  defaultTitle,
  defaultDescription = "",
  onForked,
}: MaterialForkModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalDismiss(isOpen, () => {
    if (!submitting) onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, defaultTitle, defaultDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 1) {
      setError("Zadej název kopie.");
      return;
    }
    if (trimmed.length > 255) {
      setError("Název může mít maximálně 255 znaků.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createResourceFork(resourceId, {
        title: trimmed,
        description: description.trim() || null,
      });
      onForked?.(created.resourceId);
      onClose();
    } catch (err) {
      setError(await apiErrorDetail(err, "Kopii se nepodařilo vytvořit."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-black mb-1">Vytvořit kopii materiálu</h3>
        <p className="text-sm text-gray-500 mb-4">
          Vznikne nový materiál ve tvé sbírce (jako koncept), který můžeš upravit. Soubory
          a hodnocení se nekopírují.
        </p>

        <label className="block text-xs font-medium text-gray-600 mb-1">Název kopie</label>
        <input
          type="text"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název materiálu"
          maxLength={255}
          disabled={submitting}
          className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
        />

        <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">
          Popis (nepovinný)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Popis"
          rows={3}
          disabled={submitting}
          className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
        />

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="flex justify-between items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={submitting || title.trim().length < 1}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Vytvářím…" : "Vytvořit kopii"}
          </button>
        </div>
      </form>
    </div>
  );
}
