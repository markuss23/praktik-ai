"use client";

import { useEffect, useState } from "react";
import { Folder, FolderPlus, X } from "lucide-react";
import { useModalDismiss } from "@/hooks/useModalDismiss";
import type { MaterialFolder } from "./types";
import { FolderNameModal } from "./FolderNameModal";

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: MaterialFolder[];
  /** Volá se po potvrzení výběru existující složky. */
  onConfirm: (folderId: string) => Promise<void> | void;
  /** Volitelně volá se při vytvoření nové složky — vrácená složka je rovnou vybraná. */
  onCreateFolder?: (name: string) => Promise<MaterialFolder>;
  initialFolderId?: string | null;
}

export function FolderPickerModal({
  isOpen,
  onClose,
  folders,
  onConfirm,
  onCreateFolder,
  initialFolderId = null,
}: FolderPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialFolderId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameModalOpen, setNameModalOpen] = useState(false);

  useModalDismiss(isOpen, () => {
    if (!submitting && !nameModalOpen) onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedId(initialFolderId);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, initialFolderId]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedId) {
      setError("Vyberte složku.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Akci se nepodařilo provést.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNewFolder = async (name: string) => {
    if (!onCreateFolder) return;
    const created = await onCreateFolder(name);
    setSelectedId(created.id);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">Vyberte složku</h3>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
              aria-label="Zavřít"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {onCreateFolder && (
              <button
                type="button"
                onClick={() => setNameModalOpen(true)}
                disabled={submitting}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-purple-300 text-purple-700 bg-purple-50/40 text-sm font-medium hover:bg-purple-50 transition-colors disabled:opacity-60"
              >
                <FolderPlus size={16} strokeWidth={1.75} />
                Nová složka
              </button>
            )}

            {folders.length === 0 ? (
              <p className="text-xs text-gray-500 px-1 py-2">
                Zatím nemáš žádné složky.
              </p>
            ) : (
              folders.map((folder) => {
                const isActive = folder.id === selectedId;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedId(folder.id)}
                    aria-pressed={isActive}
                    disabled={submitting}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors disabled:opacity-60 ${
                      isActive
                        ? "bg-purple-50 border-purple-300 text-purple-800"
                        : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Folder size={16} strokeWidth={1.75} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

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
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !selectedId}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Ukládání…" : "Přesunout"}
            </button>
          </div>
        </div>
      </div>

      {onCreateFolder && (
        <FolderNameModal
          isOpen={nameModalOpen}
          onClose={() => setNameModalOpen(false)}
          onSubmit={handleCreateNewFolder}
        />
      )}
    </>
  );
}
