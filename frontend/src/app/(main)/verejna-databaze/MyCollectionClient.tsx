"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Folder, FolderPlus, Plus, Search } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { Material, MaterialFolder } from "@/components/material/types";
import { MaterialCard } from "@/components/material/MaterialCard";

interface MyCollectionClientProps {
  materials: Material[];
  folders: MaterialFolder[];
}

const TARGET_AUDIENCES = ["Student", "Učitel", "Lektor"];
const EDUCATION_LEVELS = ["Základní škola", "Střední škola", "Vysoká škola"];
const DIFFICULTIES = ["Začátečník", "Pokročilý", "Expert"];

export function MyCollectionClient({ materials, folders }: MyCollectionClientProps) {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [difficulty, setDifficulty] = useState("");

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

  const handleCreateFolder = () => {
    // dodelat: otevřít modal pro vytvoření nové složky -> createFolder()
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
          onClick={handleCreateFolder}
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
        {folders.map((folder) => {
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
          <CreateMaterialCard />
          {filtered.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              showStatus
              showFolderAction
              showBookmarkAction={false}
              variant="compact"
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-4 text-sm text-gray-500 bg-white border border-gray-200 rounded-md p-6 text-center">
            Pro zvolený filtr nebyly nalezeny žádné materiály.
          </p>
        )}
      </section>
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

function CreateMaterialCard() {
  return (
    <Link
      href={`${ROUTES.PUBLIC_DATABASE}/novy`}
      className="flex items-center justify-center min-h-[260px] bg-purple-50/40 border-2 border-dashed border-purple-200 rounded-lg text-purple-700 hover:bg-purple-50 transition-colors"
    >
      <div className="flex flex-col items-center gap-2">
        <Plus size={28} strokeWidth={1.5} />
        <span className="text-sm font-medium">Vytvořit nový materiál</span>
      </div>
    </Link>
  );
}
