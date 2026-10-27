"use client";

import { useEffect, useState } from "react";
import { Folder, FolderPlus } from "lucide-react";

import { Button, Modal } from "@/components/ui";
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

  useEffect(() => {
    if (isOpen) {
      setSelectedId(initialFolderId);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, initialFolderId]);

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
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!submitting && !nameModalOpen) onClose();
        }}
        title="Vyberte složku"
        maxWidth="max-w-sm"
        footer={
          <>
            <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
              Zrušit akci
            </Button>
            <Button type="button" size="lg" disabled={submitting || !selectedId} onClick={handleConfirm}>
              {submitting ? "Ukládání…" : "Přidat do složky"}
            </Button>
          </>
        }
      >
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {onCreateFolder && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={submitting}
              onClick={() => setNameModalOpen(true)}
              className="w-full justify-start border-dashed"
            >
              <FolderPlus data-icon="inline-start" strokeWidth={1.75} />
              Nová složka
            </Button>
          )}

          {folders.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted-foreground">Zatím nemáš žádné složky.</p>
          ) : (
            folders.map((folder) => {
              const isActive = folder.id === selectedId;
              return (
                <Button
                  key={folder.id}
                  type="button"
                  variant={isActive ? "secondary" : "outline"}
                  size="lg"
                  aria-pressed={isActive}
                  disabled={submitting}
                  onClick={() => setSelectedId(folder.id)}
                  className="w-full justify-start"
                >
                  <Folder data-icon="inline-start" strokeWidth={1.75} />
                  <span className="truncate">{folder.name}</span>
                </Button>
              );
            })
          )}
        </div>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </Modal>

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
