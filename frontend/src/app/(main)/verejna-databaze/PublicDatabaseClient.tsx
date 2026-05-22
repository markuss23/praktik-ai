"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Material, MaterialCategory } from "@/components/material/types";
import { MaterialCard } from "@/components/material/MaterialCard";

interface PublicDatabaseClientProps {
  materials: Material[];
  categories: MaterialCategory[];
}

export function PublicDatabaseClient({ materials, categories }: PublicDatabaseClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredMaterials = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (activeCategoryId && material.categoryId !== activeCategoryId) return false;
      if (!needle) return true;
      return (
        material.title.toLowerCase().includes(needle) ||
        material.description.toLowerCase().includes(needle)
      );
    });
  }, [materials, activeCategoryId, search]);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-2">
          <h2 className="text-xl font-bold text-black">Procházej kategorie</h2>
          <p className="text-sm text-gray-500 mt-1">
            Vyber si oblast, která tě zajímá. V každé kategorii najdeš studijní materiály,
            kolekce a interaktivní úlohy připravené k procvičení.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setActiveCategoryId((prev) => (prev === category.id ? null : category.id))
                }
                aria-pressed={isActive}
                className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                  isActive
                    ? "bg-purple-100 border-purple-200 text-purple-700"
                    : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-black">Nejpopulárnější materiály</h2>
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              strokeWidth={1.75}
            />
            <input
              type="search"
              placeholder="Hledat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-md p-6 text-center">
            Pro zvolený filtr nebyly nalezeny žádné materiály.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMaterials.map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
