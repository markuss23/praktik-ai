import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send, Pencil, Globe, EyeOff, FolderMinus } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { Button, Card, CardContent, CardFooter } from "@/components/ui";
import { cn } from "@/lib/utils";
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
  /** Callback pro odebrání materiálu z právě otevřené složky (zobrazí ikonu). */
  onRemoveFromFolder?: (materialId: string) => Promise<void> | void;
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
  onRemoveFromFolder,
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
  const [removing, setRemoving] = useState(false);

  const handleRemoveFromFolder = async () => {
    if (removing || !onRemoveFromFolder) return;
    setRemoving(true);
    try {
      await onRemoveFromFolder(material.id);
    } finally {
      setRemoving(false);
    }
  };

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
    <Card size={isCompact ? "sm" : "default"} className="group h-full gap-0 py-0 transition-shadow hover:shadow-md">
      <CardContent className={cn("flex flex-1 flex-col gap-3", isCompact ? "p-4" : "p-5")}>
        {showStatus && (
          <div>
            <MaterialStatusBadge status={material.status} />
          </div>
        )}

        <h3
          className={cn(
            "line-clamp-2 leading-snug font-semibold text-foreground",
            isCompact ? "text-base" : "text-lg",
          )}
          title={material.title}
        >
          {material.title}
        </h3>

        <p className={cn("line-clamp-3 text-muted-foreground", isCompact ? "text-xs" : "text-sm")}>
          {material.description}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
            {material.difficultyLabel}
          </span>
          <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
            {material.fileLabel}
          </span>
        </div>

        {(canEdit || canSubmit) && (
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onEdit?.(material.id)}
                  disabled={submitting}
                  className="flex-1"
                >
                  <Pencil data-icon="inline-start" strokeWidth={1.75} />
                  Upravit
                </Button>
              )}
              {canSubmit && (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1"
                >
                  <Send data-icon="inline-start" strokeWidth={1.75} />
                  {submitting ? "Odesílám…" : "Odeslat ke schválení"}
                </Button>
              )}
            </div>
            {submitError && <p className="text-xs text-destructive">{submitError}</p>}
          </div>
        )}

        {canTogglePublic && (
          <div className="mt-1 flex flex-col gap-1">
            <Button
              type="button"
              variant={material.isPublic ? "outline" : "default"}
              size="lg"
              onClick={handleTogglePublic}
              disabled={toggling}
              className="w-full"
            >
              {material.isPublic ? (
                <EyeOff data-icon="inline-start" strokeWidth={1.75} />
              ) : (
                <Globe data-icon="inline-start" strokeWidth={1.75} />
              )}
              {toggling
                ? material.isPublic
                  ? "Skrývám…"
                  : "Publikuji…"
                : material.isPublic
                  ? "Skrýt z databáze"
                  : "Publikovat do databáze"}
            </Button>
            {toggleError && <p className="text-xs text-destructive">{toggleError}</p>}
          </div>
        )}
      </CardContent>

      <CardFooter
        className={cn("justify-between bg-transparent", isCompact ? "px-4 py-3" : "px-5 py-4")}
      >
        <StarRating rating={material.rating} reviewsCount={material.reviewsCount} />

        <div className="flex items-center gap-2">
          {onRemoveFromFolder && (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={handleRemoveFromFolder}
              disabled={removing}
              aria-label="Odebrat ze složky"
              title="Odebrat ze složky"
              className="hover:text-destructive"
            >
              <FolderMinus strokeWidth={1.75} />
            </Button>
          )}
          <MaterialCardActions
            materialId={material.id}
            showFolder={showFolderAction}
            showBookmark={showBookmarkAction}
            folders={folders}
            onCreateFolder={onCreateFolder}
            onMoved={(folderId) => onMoved?.(material.id, folderId)}
          />
          <Button
            render={<Link href={resolvedDetailHref} />}
            nativeButton={false}
            size="icon-lg"
            aria-label={`Otevřít materiál ${material.title}`}
          >
            <ArrowRight strokeWidth={2} />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
