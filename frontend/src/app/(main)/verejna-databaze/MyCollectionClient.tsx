"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Folder, FolderInput, FolderPlus, Globe, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Material, MaterialFolder } from "@/components/material/types";
import type { PubResource } from "@/api";
import { MaterialCard } from "@/components/material/MaterialCard";
import { FilterMultiSelect, FilterSelect, type FilterOption } from "@/components/ui";
import { FolderNameModal } from "@/components/material/FolderNameModal";
import { FolderAddMaterialModal } from "@/components/material/FolderAddMaterialModal";
import { MaterialCreateModal } from "@/components/material/MaterialCreateModal";
import { MaterialEditModal } from "@/components/material/MaterialEditModal";
import { ConfirmModal, useToast, Button, Input } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  addMaterialToFolder,
  createFolder,
  renameFolder,
  deleteFolder,
  setFolderPublic,
  removeMaterialFromFolder,
  fetchCollectionMaterials,
  fetchMyFolders,
  fetchResourceTargets,
  submitResourceForReview,
  updateResourcePublicState,
  type ResourceTargetOption,
} from "@/components/material/api";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";
import { EDU_LEVEL_LABELS, EDU_LEVEL_ORDER } from "@/lib/edu-level";
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

interface MyCollectionClientProps {
  materials: Material[];
  folders: MaterialFolder[];
  onMaterialCreated?: (resource: PubResource) => void;
  onMaterialUpdated?: (resource: PubResource) => void;
}

// Volby filtrů pocházejí z číselníků/enumů, ne z natvrdo psaných stringů.
// Filtrace v Mojí sbírce je klientská (vlastní malá sada), proto porovnáváme
// podle českých popisků — hodnota selectu = zobrazený popisek.
const DIFFICULTY_FILTER_OPTIONS: FilterOption[] = DIFFICULTY_ORDER.map((d) => ({
  value: DIFFICULTY_LABELS[d],
  label: DIFFICULTY_LABELS[d],
}));
// Úroveň vzdělání je výjimka — je to multivýběr, a ten porovnáváme proti
// `educationLevelValue` (hodnota z backendu), aby výběr nezávisel na popisku.
const EDU_LEVEL_FILTER_OPTIONS: FilterOption[] = EDU_LEVEL_ORDER.map((lvl) => ({
  value: lvl,
  label: EDU_LEVEL_LABELS[lvl],
}));

export function MyCollectionClient({ materials, folders, onMaterialCreated, onMaterialUpdated }: MyCollectionClientProps) {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState("");
  const [targets, setTargets] = useState<ResourceTargetOption[]>([]);
  const [localFolders, setLocalFolders] = useState<MaterialFolder[]>(folders);

  // Obsah aktivní složky (sbírky) — načítá se ze serveru, může obsahovat i cizí uložené materiály.
  const [folderMaterials, setFolderMaterials] = useState<Material[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);

  // Modaly
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<MaterialFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaterialFolder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [addToFolderOpen, setAddToFolderOpen] = useState(false);
  const [editResourceId, setEditResourceId] = useState<number | null>(null);

  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  useEffect(() => {
    let cancelled = false;
    fetchResourceTargets().then((data) => {
      if (!cancelled) setTargets(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFolder = useMemo(
    () => localFolders.find((f) => f.id === activeFolderId) ?? null,
    [localFolders, activeFolderId],
  );

  // Načtení obsahu aktivní složky
  useEffect(() => {
    setAddToFolderOpen(false);
    if (!activeFolderId) {
      setFolderMaterials([]);
      return;
    }
    let cancelled = false;
    setFolderLoading(true);
    fetchCollectionMaterials(activeFolderId)
      .then((data) => {
        if (!cancelled) setFolderMaterials(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setFolderMaterials([]);
          toast.error(err, "Obsah složky se nepodařilo načíst.");
        }
      })
      .finally(() => {
        if (!cancelled) setFolderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFolderId, toast]);

  const refreshFolders = useCallback(async () => {
    try {
      const data = await fetchMyFolders();
      setLocalFolders(data);
    } catch (err) {
      toast.error(err, "Složky se nepodařilo načíst.");
    }
  }, [toast]);

  const targetOptions: FilterOption[] = useMemo(
    () => targets.map((t) => ({ value: t.label, label: t.label })),
    [targets],
  );

  // Zdroj materiálů: ve složce její obsah, jinak vlastní materiály.
  const baseMaterials = activeFolderId ? folderMaterials : materials;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return baseMaterials.filter((material) => {
      if (difficulty && material.difficultyLabel !== difficulty) return false;
      if (targetAudience && material.targetAudience && material.targetAudience !== targetAudience) {
        return false;
      }
      // Obsah složky se načítá odlehčeně (bez úrovně vzdělání), proto materiál
      // bez této informace filtrem projde — jinak by složka vypadala prázdná.
      if (
        educationLevels.length > 0 &&
        material.educationLevelValue &&
        !educationLevels.includes(material.educationLevelValue)
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        material.title.toLowerCase().includes(needle) ||
        material.description.toLowerCase().includes(needle)
      );
    });
  }, [baseMaterials, search, targetAudience, educationLevels, difficulty]);

  // Do složky backend pustí jen schválený materiál; ty už zařazené nenabízíme.
  const addableMaterials = useMemo(() => {
    const inFolder = new Set(folderMaterials.map((m) => m.id));
    return materials.filter((m) => m.status === "approved" && !inFolder.has(m.id));
  }, [materials, folderMaterials]);

  const resetFilters = () => {
    setSearch("");
    setTargetAudience("");
    setEducationLevels([]);
    setDifficulty("");
  };

  const handleFolderSubmit = async (name: string) => {
    const created = await createFolder(name);
    setLocalFolders((prev) =>
      prev.some((f) => f.id === created.id) ? prev : [created, ...prev],
    );
    toast.success(`Složka „${created.name}" byla vytvořena.`);
  };

  const handleCreateFolderFromPicker = async (name: string): Promise<MaterialFolder> => {
    const created = await createFolder(name);
    setLocalFolders((prev) =>
      prev.some((f) => f.id === created.id) ? prev : [created, ...prev],
    );
    return created;
  };

  const handleRenameSubmit = async (name: string) => {
    if (!renameTarget) return;
    await renameFolder(renameTarget.id, name);
    setLocalFolders((prev) =>
      prev.map((f) => (f.id === renameTarget.id ? { ...f, name } : f)),
    );
    toast.success("Složka byla přejmenována.");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFolder(deleteTarget.id);
      setLocalFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      if (activeFolderId === deleteTarget.id) setActiveFolderId(null);
      toast.success("Složka byla smazána.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err, "Složku se nepodařilo smazat.");
    } finally {
      setDeleting(false);
    }
  };

  const handleTogglePublicFolder = async () => {
    if (!activeFolder || togglingPublic) return;
    const next = !activeFolder.isPublic;
    setTogglingPublic(true);
    try {
      await setFolderPublic(activeFolder.id, next);
      setLocalFolders((prev) =>
        prev.map((f) => (f.id === activeFolder.id ? { ...f, isPublic: next } : f)),
      );
      toast.success(next ? "Složka je nyní veřejná." : "Složka je nyní soukromá.");
    } catch (err) {
      toast.error(err, "Viditelnost složky se nepodařilo změnit.");
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleRemoveFromFolder = async (materialId: string) => {
    if (!activeFolderId) return;
    try {
      await removeMaterialFromFolder(materialId, activeFolderId);
      setFolderMaterials((prev) => prev.filter((m) => m.id !== materialId));
      setLocalFolders((prev) =>
        prev.map((f) =>
          f.id === activeFolderId
            ? {
                ...f,
                resourceIds: (f.resourceIds ?? []).filter((id) => id !== materialId),
                itemCount: Math.max(0, (f.itemCount ?? 1) - 1),
              }
            : f,
        ),
      );
      toast.success("Materiál byl odebrán ze složky.");
    } catch (err) {
      toast.error(err, "Materiál se nepodařilo odebrat ze složky.");
    }
  };

  const handleMaterialCreated = (resource: PubResource) => {
    onMaterialCreated?.(resource);
    // Nový materiál vzniká jako koncept a do sbírky smí až po schválení, takže
    // by se v otevřené složce vůbec neobjevil — přepneme na „Vše" a řekneme proč.
    if (activeFolderId) {
      setActiveFolderId(null);
      toast.info(
        "Materiál byl vytvořen jako koncept. Do složky ho zařadíš, až projde schválením.",
      );
    }
  };

  const handleAddExistingToFolder = async (materialId: string) => {
    if (!activeFolderId) return;
    await addMaterialToFolder(materialId, activeFolderId);
    const added = materials.find((m) => m.id === materialId);
    if (added) setFolderMaterials((prev) => [added, ...prev]);
    void refreshFolders();
    toast.success("Materiál byl vložen do složky.");
  };

  const handleSubmitForReview = async (materialId: string) => {
    const updated = await submitResourceForReview(Number(materialId));
    onMaterialUpdated?.(updated);
  };

  const handleEdit = (materialId: string) => {
    const id = Number(materialId);
    if (Number.isFinite(id)) setEditResourceId(id);
  };

  const handleTogglePublic = async (materialId: string, nextIsPublic: boolean) => {
    const updated = await updateResourcePublicState(Number(materialId), nextIsPublic);
    onMaterialUpdated?.(updated);
  };

  // Po přidání materiálu do složky přes picker zaktualizujeme počty/membership.
  const handleMovedToFolder = () => {
    void refreshFolders();
  };

  // Ve složce můžou ležet i cizí veřejné materiály — u nich backend úpravu,
  // odeslání ke schválení ani změnu viditelnosti nepovolí. Mimo složku je
  // seznam z definice vlastní, takže tam kontrolu nepotřebujeme.
  const myUserId = currentUser ? String(currentUser.userId) : null;
  const ownsMaterial = (material: Material) =>
    !activeFolderId || (myUserId !== null && material.ownerId === myUserId);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2">
          <h2 className="text-xl font-bold text-foreground">Moje sbírka materiálů</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tvé uložené a vytvořené materiály. Hotové materiály můžeš odeslat ke schválení
            a sdílet je s ostatními. Pomocí složek si materiály roztřídíš.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <Button
          variant="plain"
          type="button"
          onClick={() => setFolderModalOpen(true)}
          className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-gradient-r/30 text-gradient-r bg-card text-sm font-medium hover:bg-gradient-r/10 transition-colors")}
        >
          <FolderPlus size={16} strokeWidth={1.75} />
          Nová složka
        </Button>
        <Button
          variant="plain"
          type="button"
          onClick={() => setActiveFolderId(null)}
          aria-pressed={activeFolderId === null}
          className={cn(BTN_KEEP_BOX, `inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
            activeFolderId === null
              ? "bg-muted border-border text-foreground"
              : "bg-card border-border text-foreground hover:bg-muted/50"
          }`)}
        >
          Vše
        </Button>
        {localFolders.map((folder) => {
          const isActive = folder.id === activeFolderId;
          return (
            <Button
              variant="plain"
              key={folder.id}
              type="button"
              onClick={() =>
                setActiveFolderId((prev) => (prev === folder.id ? null : folder.id))
              }
              aria-pressed={isActive}
              className={cn(BTN_KEEP_BOX, `inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-r/10 border-gradient-r/30 text-gradient-r"
                  : "bg-card border-border text-foreground hover:bg-muted/50"
              }`)}
            >
              <Folder size={16} strokeWidth={1.75} />
              {folder.name}
              {folder.isPublic && <Globe size={13} strokeWidth={1.75} className="text-success" />}
              {typeof folder.itemCount === "number" && (
                <span className="text-xs text-muted-foreground">({folder.itemCount})</span>
              )}
            </Button>
          );
        })}
      </section>

      {/* Lišta akcí pro aktivní složku */}
      {activeFolder && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">{activeFolder.name}</h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  activeFolder.isPublic
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {activeFolder.isPublic ? "Veřejná" : "Soukromá"}
              </span>
            </div>
            {activeFolder.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{activeFolder.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              type="button"
              onClick={() => setAddToFolderOpen(true)}
              className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50")}
            >
              <FolderInput size={14} strokeWidth={1.75} />
              Vložit materiál
            </Button>
            <Button
              variant="plain"
              type="button"
              onClick={handleTogglePublicFolder}
              disabled={togglingPublic}
              className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-60")}
            >
              {activeFolder.isPublic ? (
                <EyeOff size={14} strokeWidth={1.75} />
              ) : (
                <Globe size={14} strokeWidth={1.75} />
              )}
              {activeFolder.isPublic ? "Skrýt" : "Zveřejnit"}
            </Button>
            <Button
              variant="plain"
              type="button"
              onClick={() => setRenameTarget(activeFolder)}
              className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50")}
            >
              <Pencil size={14} strokeWidth={1.75} />
              Přejmenovat
            </Button>
            <Button
              variant="ghost-destructive"
              type="button"
              onClick={() => setDeleteTarget(activeFolder)}
              className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive/30 bg-card text-sm font-medium")}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Smazat
            </Button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat"
            className={cn("h-auto", "w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30")}
          />
        </div>

        <FilterSelect
          value={targetAudience}
          onChange={setTargetAudience}
          placeholder="Cílová skupina"
          options={targetOptions}
        />
        <FilterMultiSelect
          values={educationLevels}
          onChange={setEducationLevels}
          placeholder="Úroveň vzdělání"
          options={EDU_LEVEL_FILTER_OPTIONS}
        />
        <FilterSelect
          value={difficulty}
          onChange={setDifficulty}
          placeholder="Obtížnost"
          options={DIFFICULTY_FILTER_OPTIONS}
        />

        <Button
          variant="plain"
          type="button"
          onClick={resetFilters}
          className={cn(BTN_KEEP_BOX, "px-3 py-2 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors")}
        >
          Resetovat
        </Button>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CreateMaterialCard onClick={() => setMaterialModalOpen(true)} />
          {filtered.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              showStatus
              showFolderAction
              showBookmarkAction={false}
              variant="compact"
              folders={localFolders}
              isOwner={ownsMaterial(material)}
              onCreateFolder={handleCreateFolderFromPicker}
              onMoved={handleMovedToFolder}
              onRemoveFromFolder={activeFolderId ? handleRemoveFromFolder : undefined}
              onSubmitForReview={handleSubmitForReview}
              onEdit={handleEdit}
              onTogglePublic={handleTogglePublic}
            />
          ))}
        </div>

        {folderLoading && (
          <p className="mt-4 text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
            Načítám obsah složky…
          </p>
        )}

        {!folderLoading && filtered.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
            {activeFolderId
              ? "Tato složka je prázdná nebo neodpovídá zvolenému filtru."
              : "Pro zvolený filtr nebyly nalezeny žádné materiály."}
          </p>
        )}
      </section>

      <FolderNameModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSubmit={handleFolderSubmit}
      />

      <FolderNameModal
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        onSubmit={handleRenameSubmit}
        initialName={renameTarget?.name ?? ""}
        title="Přejmenovat složku"
        submitLabel="Uložit"
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Smazat složku"
        message={`Opravdu chcete smazat složku „${deleteTarget?.name ?? ""}"? Materiály v ní zůstanou zachované, jen se zruší jejich zařazení.`}
        confirmLabel="Smazat"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <FolderAddMaterialModal
        isOpen={addToFolderOpen && activeFolder !== null}
        onClose={() => setAddToFolderOpen(false)}
        folderName={activeFolder?.name ?? ""}
        materials={addableMaterials}
        onConfirm={handleAddExistingToFolder}
      />

      <MaterialCreateModal
        isOpen={materialModalOpen}
        onClose={() => setMaterialModalOpen(false)}
        onCreated={handleMaterialCreated}
      />

      <MaterialEditModal
        isOpen={editResourceId !== null}
        resourceId={editResourceId}
        onClose={() => setEditResourceId(null)}
        onUpdated={(resource) => onMaterialUpdated?.(resource)}
      />
    </div>
  );
}

function CreateMaterialCard({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="plain"
      type="button"
      onClick={onClick}
      className={cn(BTN_KEEP_BOX, "flex items-center justify-center min-h-[260px] bg-gradient-r/10/40 border-2 border-dashed border-gradient-r/30 rounded-lg text-gradient-r hover:bg-gradient-r/10 transition-colors w-full")}
    >
      <div className="flex flex-col items-center gap-2">
        <Plus size={28} strokeWidth={1.5} />
        <span className="text-sm font-medium">Vytvořit nový materiál</span>
      </div>
    </Button>
  );
}
