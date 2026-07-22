"use client";

// Pozn.: „Oblíbené" (bookmark) zatím nemá backend, proto se tlačítko nezobrazuje.
// Tlačítko „Přidat do složky" je napojené na sbírky (collections) – přidá materiál
// do vybrané sbírky uživatele.

import { useState } from "react";
import { Folder } from "lucide-react";
import { FolderPickerModal } from "./FolderPickerModal";
import { addMaterialToFolder } from "./api";
import { useToast } from "@/components/ui";
import type { MaterialFolder } from "./types";

interface MaterialCardActionsProps {
  materialId: string;
  showFolder?: boolean;
  /** Ponecháno kvůli zpětné kompatibilitě – bookmark se zatím nezobrazuje. */
  showBookmark?: boolean;
  folders?: MaterialFolder[];
  onCreateFolder?: (name: string) => Promise<MaterialFolder>;
  onMoved?: (folderId: string) => void;
}

export function MaterialCardActions({
  materialId,
  showFolder = true,
  folders = [],
  onCreateFolder,
  onMoved,
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

  return (
    <>
      <button
        type="button"
        aria-label="Přidat do složky"
        title="Přidat do složky"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPickerOpen(true);
        }}
        className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Folder size={16} strokeWidth={1.75} />
      </button>
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
