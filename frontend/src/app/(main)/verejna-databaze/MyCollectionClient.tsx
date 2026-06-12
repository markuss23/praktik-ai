"use client";

import { useMemo, useState } from "react";
import { Folder, FolderPlus, Plus, Search } from "lucide-react";
import type { Material, MaterialFolder } from "@/components/material/types";
import type { PubResource } from "@/api";
import { MaterialCard } from "@/components/material/MaterialCard";
import { FolderNameModal } from "@/components/material/FolderNameModal";
import { MaterialCreateModal } from "@/components/material/MaterialCreateModal";
import { MaterialEditModal } from "@/components/material/MaterialEditModal";
import { createFolder, submitResourceForReview } from "@/components/material/api";

interface MyCollectionClientProps {
  materials: Material[];
  folders: MaterialFolder[];
  onMaterialCreated?: (resource: PubResource) => void;
  onMaterialUpdated?: (resource: PubResource) => void;
}

const TARGET_AUDIENCES = ["Student", "Učitel", "Lektor"];
const EDUCATION_LEVELS = ["Základní škola", "Střední škola", "Vysoká škola"];
const DIFFICULTIES = ["Začátečník", "Pokročilý", "Expert"];

export function MyCollectionClient({ materials, folders, onMaterialCreated, onMaterialUpdated }: MyCollectionClientProps) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [localFolders, setLocalFolders] = useState<MaterialFolder[]>(folders);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editResourceId, setEditResourceId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (activeFolderId && material.folderId !== activeFolderId) return false;
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
  }, [materials, activeFolderId, search, targetAudience, educationLevel, difficulty]);

  const resetFilters = () => {
    setSearch("");
    setTargetAudience("");
    setEducationLevel("");
    setDifficulty("");
  };

  const handleFolderSubmit = async (name: string) => {
    const created = await createFolder(name);
    setLocalFolders((prev) =>
      prev.some((f) => f.id === created.id) ? prev : [...prev, created],
    );
  };

  const handleCreateFolderFromPicker = async (name: string): Promise<MaterialFolder> => {
    const created = await createFolder(name);
    setLocalFolders((prev) =>
      prev.some((f) => f.id === created.id) ? prev : [...prev, created],
    );
    return created;
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

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2">
          <h2 className="text-xl font-bold text-black">Moje sbírka materiálů</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tvé uložené a vytvořené materiály. Hotové materiály můžeš odeslat ke schválení
            a sdílet je s ostatními.
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFolderModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-purple-300 text-purple-700 bg-white text-sm font-medium hover:bg-purple-50 transition-colors"
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
              ? "bg-gray-100 border-gray-300 text-gray-900"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
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
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Folder size={16} strokeWidth={1.75} />
              {folder.name}
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          />
        </div>

        <FilterSelect
          value={targetAudience}
          onChange={setTargetAudience}
          placeholder="Cílová skupina"
          options={TARGET_AUDIENCES}
        />
        <FilterSelect
          value={educationLevel}
          onChange={setEducationLevel}
          placeholder="Úroveň vzdělání"
          options={EDUCATION_LEVELS}
        />
        <FilterSelect
          value={difficulty}
          onChange={setDifficulty}
          placeholder="Obtížnost"
          options={DIFFICULTIES}
        />

        <button
          type="button"
          onClick={resetFilters}
          className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Resetovat
        </button>
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
              onCreateFolder={handleCreateFolderFromPicker}
              onSubmitForReview={handleSubmitForReview}
              onEdit={handleEdit}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-4 text-sm text-gray-500 bg-white border border-gray-200 rounded-md p-6 text-center">
            Pro zvolený filtr nebyly nalezeny žádné materiály.
          </p>
        )}
      </section>

      <FolderNameModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSubmit={handleFolderSubmit}
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function CreateMaterialCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center min-h-[260px] bg-purple-50/40 border-2 border-dashed border-purple-200 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors w-full"
    >
      <div className="flex flex-col items-center gap-2">
        <Plus size={28} strokeWidth={1.5} />
        <span className="text-sm font-medium">Vytvořit nový materiál</span>
      </div>
    </button>
  );
}
