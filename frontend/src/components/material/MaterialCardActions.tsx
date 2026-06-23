"use client";

// Pozn.: Ikony „Přidat do složky" a „Oblíbené" jsou dočasně skryté.
// Backend pro složky ani oblíbené zatím neexistuje (viz prázdné implementace
// moveMaterialToFolder/toggleBookmark v ./api), takže by tlačítka slibovala
// funkce, které nic nedělají. Až bude backend hotový, stačí odkomentovat
// importy níže a tělo komponenty (a vrátit zpět původní `return`).

// import { Folder, Bookmark } from "lucide-react";
// import { useState } from "react";
// import { FolderPickerModal } from "./FolderPickerModal";
// import { moveMaterialToFolder } from "./api";
import type { MaterialFolder } from "./types";

interface MaterialCardActionsProps {
  materialId: string;
  showFolder?: boolean;
  showBookmark?: boolean;
  folders?: MaterialFolder[];
  onCreateFolder?: (name: string) => Promise<MaterialFolder>;
  onMoved?: (folderId: string) => void;
}

export function MaterialCardActions(props: MaterialCardActionsProps) {
  void props; // props zatím nevyužité — viz poznámka nahoře
  return null;

  /* PŮVODNÍ OBSAH — znovu zapnout po napojení backendu složek/oblíbených:

  const {
    materialId,
    showFolder = true,
    showBookmark = true,
    folders = [],
    onCreateFolder,
    onMoved,
  } = props;
  const [bookmarked, setBookmarked] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleMove = async (folderId: string) => {
    await moveMaterialToFolder(materialId, folderId);
    onMoved?.(folderId);
  };

  return (
    <div className="flex items-center gap-2">
      {showFolder && (
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
            onConfirm={handleMove}
            onCreateFolder={onCreateFolder}
          />
        </>
      )}
      {showBookmark && (
        <button
          type="button"
          aria-label={bookmarked ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
          title={bookmarked ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
          aria-pressed={bookmarked}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setBookmarked((v) => !v);
            // TODO: napojit volání toggleBookmark(materialId)
            void materialId;
          }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Bookmark
            size={16}
            strokeWidth={1.75}
            fill={bookmarked ? "currentColor" : "none"}
            className={bookmarked ? "text-purple-600" : ""}
          />
        </button>
      )}
    </div>
  );
  */
}
