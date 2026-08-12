"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Folder, FolderPlus, Globe, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Material, MaterialFolder } from "@/components/material/types";
import type { PubResource } from "@/api";
import { MaterialCard } from "@/components/material/MaterialCard";
import { FilterSelect, type FilterOption } from "@/components/material/FilterSelect";
import { FolderNameModal } from "@/components/material/FolderNameModal";
import { MaterialCreateModal } from "@/components/material/MaterialCreateModal";
import { MaterialEditModal } from "@/components/material/MaterialEditModal";
import { ConfirmModal, useToast } from "@/components/ui";
import {
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
const EDU_LEVEL_FILTER_OPTIONS: FilterOption[] = EDU_LEVEL_ORDER.map((lvl) => ({
  value: EDU_LEVEL_LABELS[lvl],
  label: EDU_LEVEL_LABELS[lvl],
}));

export function MyCollectionClient({ materials, folders, onMaterialCreated, onMaterialUpdated }: MyCollectionClientProps) {
  const toast = useToast();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
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
      if (educationLevel && material.educationLevel && material.educationLevel !== educationLevel) {
        return false;
      }
      if (!needle) return true;
      return (
        material.title.toLowerCase().includes(needle) ||
        material.description.toLowerCase().includes(needle)
      );
    });
  }, [baseMaterials, search, targetAudience, educationLevel, difficulty]);

  const resetFilters = () => {
    setSearch("");
    setTargetAudience("");
    setEducationLevel("");
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
        <button
          type="button"
          onClick={() => setFolderModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-gradient-r/30 text-gradient-r bg-card text-sm font-medium hover:bg-gradient-r/10 transition-colors"
        >
          <FolderPlus size={16} strokeWidth={1.75} />
          Nová složka
        </button>
        <button
          type="button"
          onClick={() => setActiveFolderId(null)}
          aria-pressed={activeFolderId === null}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
            activeFolderId === null
              ? "bg-muted border-border text-foreground"
              : "bg-card border-border text-foreground hover:bg-muted/50"
          }`}
        >
          Vše
        </button>
        {localFolders.map((folder) => {
          const isActive = folder.id === activeFolderId;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() =>
                setActiveFolderId((prev) => (prev === folder.id ? null : folder.id))
              }
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gradient-r/10 border-gradient-r/30 text-gradient-r"
                  : "bg-card border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <Folder size={16} strokeWidth={1.75} />
              {folder.name}
              {folder.isPublic && <Globe size={13} strokeWidth={1.75} className="text-success" />}
              {typeof folder.itemCount === "number" && (
                <span className="text-xs text-muted-foreground">({folder.itemCount})</span>
              )}
            </button>
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
            <button
              type="button"
              onClick={handleTogglePublicFolder}
              disabled={togglingPublic}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-60"
            >
              {activeFolder.isPublic ? (
                <EyeOff size={14} strokeWidth={1.75} />
              ) : (
                <Globe size={14} strokeWidth={1.75} />
              )}
              {activeFolder.isPublic ? "Skrýt" : "Zveřejnit"}
            </button>
            <button
              type="button"
              onClick={() => setRenameTarget(activeFolder)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50"
            >
              <Pencil size={14} strokeWidth={1.75} />
              Přejmenovat
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(activeFolder)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive/30 bg-card text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Smazat
            </button>
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
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30"
          />
        </div>

        <FilterSelect
          value={targetAudience}
          onChange={setTargetAudience}
          placeholder="Cílová skupina"
          options={targetOptions}
        />
        <FilterSelect
          value={educationLevel}
          onChange={setEducationLevel}
          placeholder="Úroveň vzdělání"
          options={EDU_LEVEL_FILTER_OPTIONS}
        />
        <FilterSelect
          value={difficulty}
          onChange={setDifficulty}
          placeholder="Obtížnost"
          options={DIFFICULTY_FILTER_OPTIONS}
        />

        <button
          type="button"
          onClick={resetFilters}
          className="px-3 py-2 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          Resetovat
        </button>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!activeFolderId && <CreateMaterialCard onClick={() => setMaterialModalOpen(true)} />}
          {filtered.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              showStatus
              showFolderAction
              showBookmarkAction={false}
              variant="compact"
              folders={localFolders}
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
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center min-h-[260px] bg-gradient-r/10/40 border-2 border-dashed border-gradient-r/30 rounded-lg text-gradient-r hover:bg-gradient-r/10 transition-colors w-full"
    >
      <div className="flex flex-col items-center gap-2">
        <Plus size={28} strokeWidth={1.5} />
        <span className="text-sm font-medium">Vytvořit nový materiál</span>
      </div>
    </button>
  );
}
