"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import type { Material, MaterialCategory, MaterialFolder } from "@/components/material/types";
import {
  createFolder,
  fetchMaterialCategories,
  fetchMyFolders,
  fetchPublicMaterials,
  fetchResourceTargets,
  type ResourceTargetOption,
} from "@/components/material/api";
import { MaterialCard } from "@/components/material/MaterialCard";
import { FilterSelect, type FilterOption } from "@/components/material/FilterSelect";
import { MaterialGridSkeleton } from "@/components/ui";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";
import { EDU_LEVEL_LABELS, EDU_LEVEL_ORDER } from "@/lib/edu-level";

const PAGE_SIZE = 8;

type SortKey = "popular" | "rating" | "newest";

const SORT_OPTIONS: FilterOption[] = [
  { value: "popular", label: "Nejpopulárnější" },
  { value: "rating", label: "Nejlépe hodnocené" },
  { value: "newest", label: "Nejnovější" },
];

const DIFFICULTY_OPTIONS: FilterOption[] = DIFFICULTY_ORDER.map((d) => ({
  value: d,
  label: DIFFICULTY_LABELS[d],
}));

const EDU_LEVEL_OPTIONS: FilterOption[] = EDU_LEVEL_ORDER.map((lvl) => ({
  value: lvl,
  label: EDU_LEVEL_LABELS[lvl],
}));

/** Řazení probíhá na klientu nad serverem vyfiltrovanou sadou. */
function sortMaterials(materials: Material[], sort: SortKey): Material[] {
  const copy = [...materials];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
    case "newest":
      return copy.sort((a, b) => Number(b.id) - Number(a.id));
    case "popular":
    default:
      return copy.sort((a, b) => b.reviewsCount - a.reviewsCount || b.rating - a.rating);
  }
}

export function PublicDatabaseClient() {
  // Číselníky pro filtry
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [targets, setTargets] = useState<ResourceTargetOption[]>([]);
  // Vlastní složky uživatele (pro „Přidat do složky" na kartách)
  const [folders, setFolders] = useState<MaterialFolder[]>([]);

  // Stav filtrů
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced verze searchInput
  const [eduLevel, setEduLevel] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [targetId, setTargetId] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [page, setPage] = useState(1);

  // Data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Číselníky a vlastní složky načteme jednou
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMaterialCategories(), fetchResourceTargets()]).then(
      ([cats, tgts]) => {
        if (cancelled) return;
        setCategories(cats);
        setTargets(tgts);
      },
    );
    // Složky jsou jen pro přihlášené – případnou chybu tiše ignorujeme.
    fetchMyFolders()
      .then((data) => {
        if (!cancelled) setFolders(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateFolder = async (name: string): Promise<MaterialFolder> => {
    const created = await createFolder(name);
    setFolders((prev) => (prev.some((f) => f.id === created.id) ? prev : [created, ...prev]));
    return created;
  };

  const handleMovedToFolder = () => {
    fetchMyFolders()
      .then(setFolders)
      .catch(() => {});
  };

  // Debounce hledání (300 ms), ať netlučíme dotaz na každý stisk
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );
  const subjectId = activeCategory?.subjectId;

  // Serverový fetch při změně filtrů (hledání i číselníkové filtry)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicMaterials({
      textSearch: search || undefined,
      subjectId,
      educationLevel: eduLevel || undefined,
      difficultyLevel: difficulty || undefined,
      targetId: targetId ? Number(targetId) : undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setMaterials(data);
        setPage(1);
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
  }, [search, subjectId, eduLevel, difficulty, targetId, reloadKey]);

  const sorted = useMemo(() => sortMaterials(materials, sort), [materials, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );

  const targetOptions: FilterOption[] = useMemo(
    () => targets.map((t) => ({ value: String(t.id), label: t.label })),
    [targets],
  );

  const hasActiveFilters = Boolean(
    search || activeCategoryId || eduLevel || difficulty || targetId,
  );

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setActiveCategoryId(null);
    setEduLevel("");
    setDifficulty("");
    setTargetId("");
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-2">
          <h2 className="text-xl font-bold text-foreground">Procházej kategorie</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vyber si oblast, která tě zajímá. V každé kategorii najdeš studijní materiály
            připravené k procvičení.
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
                    ? "bg-gradient-r/20 border-gradient-r/30 text-gradient-r"
                    : "bg-card border-border text-foreground hover:bg-muted/50"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">
              Materiály{" "}
              <span className="text-muted-foreground font-semibold">
                ({loading ? "…" : sorted.length})
              </span>
            </h2>
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
              />
              <input
                type="search"
                placeholder="Hledat"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <FilterSelect
              value={eduLevel}
              onChange={setEduLevel}
              placeholder="Úroveň vzdělání"
              options={EDU_LEVEL_OPTIONS}
            />
            <FilterSelect
              value={difficulty}
              onChange={setDifficulty}
              placeholder="Obtížnost"
              options={DIFFICULTY_OPTIONS}
            />
            <FilterSelect
              value={targetId}
              onChange={setTargetId}
              placeholder="Cílová skupina"
              options={targetOptions}
            />
            <FilterSelect
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              placeholder="Seřadit"
              options={SORT_OPTIONS}
              includeEmpty={false}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                Resetovat
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <MaterialGridSkeleton count={PAGE_SIZE} columns={2} />
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
            <p className="text-sm text-destructive mb-3">
              Materiály se nepodařilo načíst: {error}
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              <RotateCcw size={15} strokeWidth={1.75} />
              Zkusit znovu
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
            Pro zvolený filtr nebyly nalezeny žádné materiály.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageItems.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  folders={folders}
                  onCreateFolder={handleCreateFolder}
                  onMoved={handleMovedToFolder}
                />
              ))}
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

/** Stránkování (na klientu) — předchozí / čísla / další. Skryje se při 1 stránce. */
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Okno stránek kolem aktuální (max 5 čísel)
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const btnBase =
    "inline-flex items-center justify-center min-size-9 px-2 rounded-md border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <nav
      className="flex items-center justify-center gap-1.5 mt-6"
      aria-label="Stránkování"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Předchozí stránka"
        className={`${btnBase} border-border bg-card text-foreground hover:bg-muted/50`}
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
      </button>

      {start > 1 && <span className="px-1 text-muted-foreground">…</span>}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={`${btnBase} ${
            p === page
              ? "bg-gradient-r/20 border-gradient-r/30 text-gradient-r"
              : "border-border bg-card text-foreground hover:bg-muted/50"
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && <span className="px-1 text-muted-foreground">…</span>}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Další stránka"
        className={`${btnBase} border-border bg-card text-foreground hover:bg-muted/50`}
      >
        <ChevronRight size={16} strokeWidth={1.75} />
      </button>
    </nav>
  );
}
