import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { Material } from "./types";
import { StarRating } from "./StarRating";
import { MaterialStatusBadge } from "./MaterialStatusBadge";
import { MaterialCardActions } from "./MaterialCardActions";

interface MaterialCardProps {
  material: Material;
  /** Zobrazit status (Schváleno / Čeká / Neschváleno) v rohu karty (pro Moje sbírka). */
  showStatus?: boolean;
  /** Zobrazit tlačítko „přidat do složky“ (pro veřejnou databázi). */
  showFolderAction?: boolean;
  /** Zobrazit záložku (pro veřejnou databázi). */
  showBookmarkAction?: boolean;
  /** Kompaktnější varianta pro Moje sbírka. */
  variant?: "default" | "compact";
}

export function MaterialCard({
  material,
  showStatus = false,
  showFolderAction = true,
  showBookmarkAction = true,
  variant = "default",
}: MaterialCardProps) {
  const detailHref = `${ROUTES.PUBLIC_DATABASE}/${material.id}`;
  const isCompact = variant === "compact";

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className={`flex flex-col ${isCompact ? "p-4 gap-3" : "p-5 gap-3"} flex-1`}>
        {showStatus && (
          <div>
            <MaterialStatusBadge status={material.status} />
          </div>
        )}

        <h3
          className={`font-semibold text-gray-900 leading-snug line-clamp-2 ${
            isCompact ? "text-base" : "text-lg"
          }`}
          title={material.title}
        >
          {material.title}
        </h3>

        <p className={`text-gray-600 line-clamp-3 ${isCompact ? "text-xs" : "text-sm"}`}>
          {material.description}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
            {material.difficultyLabel}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
            {material.fileLabel}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      <div className={`flex items-center justify-between ${isCompact ? "px-4 py-3" : "px-5 py-4"}`}>
        <StarRating rating={material.rating} reviewsCount={material.reviewsCount} />

        <div className="flex items-center gap-2">
          <MaterialCardActions
            materialId={material.id}
            showFolder={showFolderAction}
            showBookmark={showBookmarkAction}
          />
          <Link
            href={detailHref}
            aria-label={`Otevřít materiál ${material.title}`}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#00C896" }}
          >
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
