"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import {
  fetchMyFolders,
  fetchMyMaterials,
  mapPubResourceToMaterial,
} from "@/components/material/api";
import type { Material, MaterialFolder } from "@/components/material/types";
import type { PubResource } from "@/api";
import { MaterialGridSkeleton } from "@/components/ui";
import { TabSwitcher, type DatabaseTab } from "./TabSwitcher";
import { PublicDatabaseClient } from "./PublicDatabaseClient";
import { MyCollectionClient } from "./MyCollectionClient";

export default function PublicDatabasePage() {
  return (
    <Suspense fallback={<PageShell><MaterialGridSkeleton count={6} columns={3} /></PageShell>}>
      <PublicDatabasePageInner />
    </Suspense>
  );
}

function PublicDatabasePageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: DatabaseTab = tabParam === "mine" ? "mine" : "public";

  const [myMaterials, setMyMaterials] = useState<Material[]>([]);
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Data načítáme jen pro záložku „Moje sbírka". Veřejná databáze si data
  // (vč. filtrů, řazení a stránkování) řeší sama v PublicDatabaseClient.
  useEffect(() => {
    if (activeTab !== "mine") return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchMyMaterials().then((data) => {
        if (!cancelled) setMyMaterials(data);
      }),
      fetchMyFolders().then((data) => {
        if (!cancelled) setFolders(data);
      }),
    ])
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, reloadKey]);

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
    if (activeTab === "public") {
      return <PublicDatabaseClient />;
    }
    if (loading) {
      return <MaterialGridSkeleton count={6} columns={3} />;
    }
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-sm text-red-700 mb-3">Materiály se nepodařilo načíst: {error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <RotateCcw size={15} strokeWidth={1.75} />
            Zkusit znovu
          </button>
        </div>
      );
    }
    return (
      <MyCollectionClient
        materials={myMaterials}
        folders={folders}
        onMaterialCreated={handleMaterialCreated}
        onMaterialUpdated={handleMaterialUpdated}
      />
    );
  }, [activeTab, error, folders, loading, myMaterials, handleMaterialCreated, handleMaterialUpdated]);

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
