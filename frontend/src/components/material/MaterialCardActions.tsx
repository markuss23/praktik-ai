"use client";

// Pozn.: „Oblíbené" (bookmark) zatím nemá backend, proto se tlačítko nezobrazuje.
// Tlačítko „Přidat do složky" je napojené na sbírky (collections) – přidá materiál
// do vybrané sbírky uživatele.

import { useState } from "react";
import { Folder } from "lucide-react";
import { FolderPickerModal } from "./FolderPickerModal";
import { addMaterialToFolder } from "./api";
import { Button, useToast } from "@/components/ui";
import type { MaterialFolder } from "./types";

interface MaterialCardActionsProps {
  materialId: string;
  showFolder?: boolean;
  /** Ponecháno kvůli zpětné kompatibilitě – bookmark se zatím nezobrazuje. */
  showBookmark?: boolean;
  folders?: MaterialFolder[];
  onCreateFolder?: (name: string) => Promise<MaterialFolder>;
  onMoved?: (folderId: string) => void;
  /** Materiál nelze do sbírky zařadit (backend by akci odmítl) — tlačítko zůstane neaktivní. */
  disabled?: boolean;
  /** Důvod nedostupnosti; zobrazí se jako tooltip nad neaktivním tlačítkem. */
  disabledReason?: string;
}

export function MaterialCardActions({
  materialId,
  showFolder = true,
  folders = [],
  onCreateFolder,
  onMoved,
  disabled = false,
  disabledReason,
}: MaterialCardActionsProps) {
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!showFolder) return null;

  const handleAdd = async (folderId: string) => {
    await addMaterialToFolder(materialId, folderId);
    onMoved?.(folderId);
    const folderName = folders.find((f) => f.id === folderId)?.name;
    toast.success(
      folderName ? `Přidáno do složky „${folderName}".` : "Přidáno do složky.",
    );
  };

  const hint = disabled ? (disabledReason ?? "Materiál teď nelze do složky zařadit.") : "Přidat do složky";

  return (
    <>
      {/* Tooltip drží obalový `span` — neaktivní tlačítko myší události nepropouští. */}
      <span title={hint} className="inline-flex">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={hint}
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setPickerOpen(true);
          }}
        >
          <Folder strokeWidth={1.75} />
        </Button>
      </span>
      <FolderPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folders={folders}
        onConfirm={handleAdd}
        onCreateFolder={onCreateFolder}
      />
    </>
  );
}
