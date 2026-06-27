"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Folder, Globe, RotateCcw, Search } from "lucide-react";
import type { Material, MaterialFolder } from "@/components/material/types";
import {
  fetchCollectionMaterials,
  fetchPublicCollections,
} from "@/components/material/api";
import { MaterialCard } from "@/components/material/MaterialCard";
import { MaterialGridSkeleton } from "@/components/ui";

export function PublicCollectionsClient() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [collections, setCollections] = useState<MaterialFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<MaterialFolder | null>(null);

  // Debounce hledání (300 ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicCollections(search || undefined)
      .then((data) => {
        if (!cancelled) setCollections(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setCollections([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, reloadKey]);

  if (selected) {
    return <CollectionDetail collection={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-black">Veřejné sbírky</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sbírky materiálů, které sdílejí ostatní uživatelé. Otevři si je a
              prohlédni jejich obsah.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              strokeWidth={1.75}
            />
            <input
              type="search"
              placeholder="Hledat sbírku"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <MaterialGridSkeleton count={6} columns={3} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-sm text-red-700 mb-3">Sbírky se nepodařilo načíst: {error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <RotateCcw size={15} strokeWidth={1.75} />
            Zkusit znovu
          </button>
        </div>
      ) : collections.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-md p-6 text-center">
          Zatím tu nejsou žádné veřejné sbírky.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onOpen={() => setSelected(collection)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  onOpen,
}: {
  collection: MaterialFolder;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full p-5 gap-3"
    >
      <div className="flex items-center gap-2 text-purple-700">
        <Folder size={18} strokeWidth={1.75} />
        <Globe size={13} strokeWidth={1.75} className="text-emerald-600" />
      </div>
      <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2" title={collection.name}>
        {collection.name}
      </h3>
      {collection.description && (
        <p className="text-sm text-gray-600 line-clamp-3">{collection.description}</p>
      )}
      <div className="mt-auto pt-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
          {collection.itemCount ?? 0} materiálů
        </span>
      </div>
    </button>
  );
}

function CollectionDetail({
  collection,
  onBack,
}: {
  collection: MaterialFolder;
  onBack: () => void;
}) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCollectionMaterials(collection.id)
      .then((data) => {
        if (!cancelled) setMaterials(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setMaterials([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collection.id]);

  const heading = useMemo(() => collection.name, [collection.name]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Zpět na sbírky
      </button>

      <div>
        <h2 className="text-xl font-bold text-black">{heading}</h2>
        {collection.description && (
          <p className="text-sm text-gray-500 mt-1">{collection.description}</p>
        )}
      </div>

      {loading ? (
        <MaterialGridSkeleton count={4} columns={2} />
      ) : error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-6 text-center">
          Obsah sbírky se nepodařilo načíst: {error}
        </p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-md p-6 text-center">
          Tato sbírka je prázdná.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              showFolderAction={false}
              showBookmarkAction={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
