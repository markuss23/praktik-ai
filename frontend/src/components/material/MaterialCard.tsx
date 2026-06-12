import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send, Pencil, Globe, EyeOff } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { Material, MaterialFolder } from "./types";
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
  /** Dostupné složky pro modal výběru. */
  folders?: MaterialFolder[];
  /** Callback pro vytvoření nové složky uvnitř pickeru. */
  onCreateFolder?: (name: string) => Promise<MaterialFolder>;
  /** Callback po úspěšném přesunu materiálu do složky. */
  onMoved?: (materialId: string, folderId: string) => void;
  /** Callback pro odeslání konceptu ke schválení (zobrazí se jen u draftů/vrácených). */
  onSubmitForReview?: (materialId: string) => Promise<void> | void;
  /** Callback pro úpravu materiálu (zobrazí se jen u draftů/vrácených). */
  onEdit?: (materialId: string) => void;
  /** Callback pro publikaci/skrytí schváleného materiálu (zobrazí se jen u schválených). */
  onTogglePublic?: (materialId: string, nextIsPublic: boolean) => Promise<void> | void;
  /** Přepíše cíl tlačítka šipky (např. odkaz na review detail místo veřejného detailu). */
  detailHref?: string;
}

export function MaterialCard({
  material,
  showStatus = false,
  showFolderAction = true,
  showBookmarkAction = true,
  variant = "default",
  folders,
  onCreateFolder,
  onMoved,
  onSubmitForReview,
  onEdit,
  onTogglePublic,
  detailHref,
}: MaterialCardProps) {
  const resolvedDetailHref = detailHref ?? `${ROUTES.PUBLIC_DATABASE}/${material.id}`;
  const isCompact = variant === "compact";
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Upravit i odeslat ke schválení lze u konceptu i vráceného (k přepracování) materiálu
  const isEditable = material.status === "draft" || material.status === "rejected";
  const canSubmit = isEditable && !!onSubmitForReview;
  const canEdit = isEditable && !!onEdit;
  // Publikovat/skrýt lze jen u schváleného materiálu
  const canTogglePublic = material.status === "approved" && !!onTogglePublic;

  const handleSubmit = async () => {
    if (submitting || !onSubmitForReview) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmitForReview(material.id);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Nepodařilo se odeslat ke schválení.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublic = async () => {
    if (toggling || !onTogglePublic) return;
    setToggling(true);
    setToggleError(null);
    try {
      await onTogglePublic(material.id, !material.isPublic);
    } catch (err) {
      setToggleError(
        err instanceof Error ? err.message : "Nepodařilo se změnit viditelnost.",
      );
    } finally {
      setToggling(false);
    }
  };

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

        {(canEdit || canSubmit) && (
          <div className="mt-1 space-y-1">
            <div className="flex gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit?.(material.id)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 flex-1"
                >
                  <Pencil size={14} strokeWidth={1.75} />
                  Upravit
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex-1"
                >
                  <Send size={14} strokeWidth={1.75} />
                  {submitting ? "Odesílám…" : "Odeslat ke schválení"}
                </button>
              )}
            </div>
            {submitError && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}
          </div>
        )}

        {canTogglePublic && (
          <div className="mt-1 space-y-1">
            <button
              type="button"
              onClick={handleTogglePublic}
              disabled={toggling}
              className={`inline-flex w-full items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-60 ${
                material.isPublic
                  ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {material.isPublic ? (
                <EyeOff size={14} strokeWidth={1.75} />
              ) : (
                <Globe size={14} strokeWidth={1.75} />
              )}
              {toggling
                ? material.isPublic
                  ? "Skrývám…"
                  : "Publikuji…"
                : material.isPublic
                  ? "Skrýt z databáze"
                  : "Publikovat do databáze"}
            </button>
            {toggleError && <p className="text-xs text-red-600">{toggleError}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100" />

      <div className={`flex items-center justify-between ${isCompact ? "px-4 py-3" : "px-5 py-4"}`}>
        <StarRating rating={material.rating} reviewsCount={material.reviewsCount} />

        <div className="flex items-center gap-2">
          <MaterialCardActions
            materialId={material.id}
            showFolder={showFolderAction}
            showBookmark={showBookmarkAction}
            folders={folders}
            onCreateFolder={onCreateFolder}
            onMoved={(folderId) => onMoved?.(material.id, folderId)}
          />
          <Link
            href={resolvedDetailHref}
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
