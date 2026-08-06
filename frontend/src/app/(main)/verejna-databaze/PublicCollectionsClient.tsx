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
            <h2 className="text-xl font-bold text-foreground">Veřejné sbírky</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Veřejně sdílené sbírky materiálů – včetně těch tvých. Otevři si je a
              prohlédni jejich obsah.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              type="search"
              placeholder="Hledat sbírku"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <MaterialGridSkeleton count={6} columns={3} />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <p className="text-sm text-destructive mb-3">Sbírky se nepodařilo načíst: {error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            <RotateCcw size={15} strokeWidth={1.75} />
            Zkusit znovu
          </button>
        </div>
      ) : collections.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
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
      className="group text-left bg-card rounded-lg border border-border hover:shadow-md transition-shadow flex flex-col h-full p-5 gap-3"
    >
      <div className="flex items-center gap-2 text-gradient-r">
        <Folder size={18} strokeWidth={1.75} />
        <Globe size={13} strokeWidth={1.75} className="text-success" />
      </div>
      <h3 className="font-semibold text-foreground leading-snug line-clamp-2" title={collection.name}>
        {collection.name}
      </h3>
      {collection.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">{collection.description}</p>
      )}
      <div className="mt-auto pt-2">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground">
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
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Zpět na sbírky
      </button>

      <div>
        <h2 className="text-xl font-bold text-foreground">{heading}</h2>
        {collection.description && (
          <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
        )}
      </div>

      {loading ? (
        <MaterialGridSkeleton count={4} columns={2} />
      ) : error ? (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-6 text-center">
          Obsah sbírky se nepodařilo načíst: {error}
        </p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
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
