"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { fetchMaterialById, fetchMaterialCategories } from "@/components/material/api";
import {
  MaterialCategoryBadge,
  MaterialStatusBadge,
} from "@/components/material/MaterialStatusBadge";
import type { Material, MaterialCategory } from "@/components/material/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MaterialDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [material, setMaterial] = useState<Material | null>(null);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
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
  }, [id]);

  if (missing) notFound();

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

        {loading || !material ? (
          <p className="text-sm text-gray-500">Načítání materiálu…</p>
        ) : (
          <MaterialDetail material={material} categories={categories} />
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
  const category = categories.find((c) => c.id === material.categoryId);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {category && <MaterialCategoryBadge label={category.label} />}
        <MaterialStatusBadge status={material.status} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">{material.title}</h1>
      <p className="text-sm text-gray-600 max-w-3xl mb-6">{material.description}</p>

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

      {material.attachments && material.attachments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-black">Přílohy</h2>
          </div>

          <ul className="space-y-2">
            {material.attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 text-gray-700">
                    <FolderIcon />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {attachment.format}
                    {attachment.sizeLabel ? ` ${attachment.sizeLabel}` : ""}
                  </span>
                  {attachment.url ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Download size={14} strokeWidth={1.75} />
                      Stáhnout
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-400 cursor-not-allowed"
                    >
                      <Download size={14} strokeWidth={1.75} />
                      Stáhnout
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function FolderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7a2 2 0 0 1 2-2h3.5l2 2H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    </svg>
  );
}
