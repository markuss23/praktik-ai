"use client";

import { Folder, Bookmark } from "lucide-react";
import { useState } from "react";

interface MaterialCardActionsProps {
  materialId: string;
  showFolder?: boolean;
  showBookmark?: boolean;
}

export function MaterialCardActions({
  materialId,
  showFolder = true,
  showBookmark = true,
}: MaterialCardActionsProps) {
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {showFolder && (
        <button
          type="button"
          aria-label="Přidat do složky"
          title="Přidat do složky"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // TODO: napojit volání moveMaterialToFolder(materialId, …) přes modal
            void materialId;
          }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Folder size={16} strokeWidth={1.75} />
        </button>
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
}
