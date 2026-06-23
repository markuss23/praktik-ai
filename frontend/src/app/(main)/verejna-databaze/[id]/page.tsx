"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Copy, LogIn } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { fetchMaterialById, fetchMaterialCategories } from "@/components/material/api";
import {
  MaterialCategoryBadge,
  MaterialStatusBadge,
} from "@/components/material/MaterialStatusBadge";
import { MaterialAttachments } from "@/components/material/MaterialAttachments";
import { MaterialForkModal } from "@/components/material/MaterialForkModal";
import { RatingsSection } from "@/components/material/RatingsSection";
import { MaterialDetailSkeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import type { Material, MaterialCategory } from "@/components/material/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MaterialDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMaterialById(id), fetchMaterialCategories()])
      .then(([m, cats]) => {
        if (cancelled) return;
        if (!m) {
          setMissing(true);
          return;
        }
        setMaterial(m);
        setCategories(cats);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, authLoading]);

  if (missing) notFound();

  // Detail materiálu je dostupný jen přihlášeným (endpoint vyžaduje login)
  const showLoginPrompt = !authLoading && !isAuthenticated;

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
          <Link href={ROUTES.PUBLIC_DATABASE} className="hover:text-gray-700">
            Veřejná databáze
          </Link>
        </p>

        {showLoginPrompt ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center view-fade-in">
            <p className="text-sm text-gray-600 mb-4">
              Pro zobrazení detailu materiálu se nejprve přihlas.
            </p>
            <button
              type="button"
              onClick={login}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <LogIn size={15} strokeWidth={1.75} />
              Přihlásit se
            </button>
          </div>
        ) : loading || !material ? (
          <MaterialDetailSkeleton />
        ) : (
          <div className="view-fade-in">
            <MaterialDetail material={material} categories={categories} />
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialDetail({
  material,
  categories,
}: {
  material: Material;
  categories: MaterialCategory[];
}) {
  const router = useRouter();
  const category = categories.find((c) => c.id === material.categoryId);
  const [forkOpen, setForkOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {category && <MaterialCategoryBadge label={category.label} />}
          <MaterialStatusBadge status={material.status} />
        </div>
        {material.allowForks && material.isPublic && (
          <button
            type="button"
            onClick={() => setForkOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy size={14} strokeWidth={1.75} />
            Vytvořit kopii
          </button>
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">{material.title}</h1>
      <p className="text-sm text-gray-600 max-w-3xl mb-6">{material.description}</p>

      <MaterialForkModal
        isOpen={forkOpen}
        onClose={() => setForkOpen(false)}
        resourceId={Number(material.id)}
        defaultTitle={`Kopie: ${material.title}`}
        defaultDescription={material.description}
        onForked={() => router.push(`${ROUTES.PUBLIC_DATABASE}?tab=mine`)}
      />

      {material.targets && material.targets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {material.targets.map((target, index) => (
              <div key={`${target.label}-${index}`} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">{target.label}</span>
                <span className="text-sm font-semibold text-gray-900">{target.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MaterialAttachments attachments={material.attachments ?? []} title={material.title} />

      <RatingsSection resourceId={Number(material.id)} />
    </>
  );
}
