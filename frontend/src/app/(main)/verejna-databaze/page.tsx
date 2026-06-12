"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  fetchMaterialCategories,
  fetchMyFolders,
  fetchMyMaterials,
  fetchPublicMaterials,
  mapPubResourceToMaterial,
} from "@/components/material/api";
import type { Material, MaterialCategory, MaterialFolder } from "@/components/material/types";
import type { PubResource } from "@/api";
import { TabSwitcher, type DatabaseTab } from "./TabSwitcher";
import { PublicDatabaseClient } from "./PublicDatabaseClient";
import { MyCollectionClient } from "./MyCollectionClient";

export default function PublicDatabasePage() {
  return (
    <Suspense fallback={<PageShell><p className="text-sm text-gray-500">Načítání…</p></PageShell>}>
      <PublicDatabasePageInner />
    </Suspense>
  );
}

function PublicDatabasePageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: DatabaseTab = tabParam === "mine" ? "mine" : "public";

  const [publicMaterials, setPublicMaterials] = useState<Material[]>([]);
  const [myMaterials, setMyMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const tasks: Promise<unknown>[] = [
      fetchMaterialCategories().then((data) => {
        if (!cancelled) setCategories(data);
      }),
    ];

    if (activeTab === "public") {
      tasks.push(
        fetchPublicMaterials().then((data) => {
          if (!cancelled) setPublicMaterials(data);
        }),
      );
    } else {
      tasks.push(
        fetchMyMaterials().then((data) => {
          if (!cancelled) setMyMaterials(data);
        }),
        fetchMyFolders().then((data) => {
          if (!cancelled) setFolders(data);
        }),
      );
    }

    Promise.all(tasks)
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Po vytvoření materiálu ho hned přidáme do sbírky, bez reloadu
  const handleMaterialCreated = useCallback((resource: PubResource) => {
    setMyMaterials((prev) => [mapPubResourceToMaterial(resource), ...prev]);
  }, []);

  // Po změně materiálu (např. odeslání ke schválení) aktualizujeme jeho stav v sbírce
  const handleMaterialUpdated = useCallback((resource: PubResource) => {
    const mapped = mapPubResourceToMaterial(resource);
    setMyMaterials((prev) => prev.map((m) => (m.id === mapped.id ? mapped : m)));
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-gray-500">Načítání…</p>;
    }
    if (error) {
      return (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          Materiály se nepodařilo načíst: {error}
        </p>
      );
    }
    if (activeTab === "public") {
      return <PublicDatabaseClient materials={publicMaterials} categories={categories} />;
    }
    return (
      <MyCollectionClient
        materials={myMaterials}
        folders={folders}
        onMaterialCreated={handleMaterialCreated}
        onMaterialUpdated={handleMaterialUpdated}
      />
    );
  }, [activeTab, categories, error, folders, loading, myMaterials, publicMaterials, handleMaterialCreated, handleMaterialUpdated]);

  return (
    <PageShell>
      <div className="flex justify-end mb-4">
        <TabSwitcher active={activeTab} />
      </div>
      {content}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-8" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: "1440px", width: "100%" }}
      >
        <p className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">
            Home
          </Link>
          {" / "}
          <span className="text-gray-700">Veřejná databáze</span>
        </p>
        {children}
      </div>
    </div>
  );
}
