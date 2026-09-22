"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import type { Material } from "./types";

interface FolderAddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Název složky, do které se vkládá — jen pro popisek. */
  folderName: string;
  /** Materiály, které lze do složky vložit (schválené a zatím nezařazené). */
  materials: Material[];
  onConfirm: (materialId: string) => Promise<void> | void;
}

/**
 * Výběr existujícího materiálu pro vložení do otevřené složky.
 * Protikus k `FolderPickerModal` — ten vybírá složku ke kartě materiálu,
 * tenhle materiál k otevřené složce.
 */
export function FolderAddMaterialModal({
  isOpen,
  onClose,
  folderName,
  materials,
  onConfirm,
}: FolderAddMaterialModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedId) {
      setError("Vyberte materiál.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Materiál se nepodařilo vložit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={`Vložit materiál do složky „${folderName}"`}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
            Zrušit akci
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={submitting || !selectedId}
            onClick={handleConfirm}
          >
            {submitting ? "Ukládání…" : "Vložit do složky"}
          </Button>
        </>
      }
    >
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {materials.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            Do složky lze zařadit jen schválené materiály. Žádný takový zatím nemáš mimo tuto
            složku — koncepty do ní půjdou vložit, až projdou schválením.
          </p>
        ) : (
          materials.map((material) => {
            const isActive = material.id === selectedId;
            return (
              <Button
                key={material.id}
                type="button"
                variant={isActive ? "secondary" : "outline"}
                size="lg"
                aria-pressed={isActive}
                disabled={submitting}
                onClick={() => setSelectedId(material.id)}
                className="w-full justify-start"
              >
                <FileText data-icon="inline-start" strokeWidth={1.75} />
                <span className="truncate">{material.title}</span>
              </Button>
            );
          })
        )}
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </Modal>
  );
}
