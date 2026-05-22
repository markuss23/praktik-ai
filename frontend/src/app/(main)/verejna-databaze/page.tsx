import Link from "next/link";
import {
  fetchMaterialCategories,
  fetchMyFolders,
  fetchMyMaterials,
  fetchPublicMaterials,
} from "@/components/material/api";
import { TabSwitcher, type DatabaseTab } from "./TabSwitcher";
import { PublicDatabaseClient } from "./PublicDatabaseClient";
import { MyCollectionClient } from "./MyCollectionClient";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function PublicDatabasePage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  const activeTab: DatabaseTab = tab === "mine" ? "mine" : "public";

  const [publicMaterials, categories, myMaterials, folders] = await Promise.all([
    activeTab === "public" ? fetchPublicMaterials() : Promise.resolve([]),
    fetchMaterialCategories(),
    activeTab === "mine" ? fetchMyMaterials() : Promise.resolve([]),
    activeTab === "mine" ? fetchMyFolders() : Promise.resolve([]),
  ]);

  return (
    <div className="py-8" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: "1440px", width: "100%" }}>
        <p className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          {" / "}
          <span className="text-gray-700">Veřejná databáze</span>
        </p>

        <div className="flex justify-end mb-4">
          <TabSwitcher active={activeTab} />
        </div>

        {activeTab === "public" ? (
          <PublicDatabaseClient materials={publicMaterials} categories={categories} />
        ) : (
          <MyCollectionClient materials={myMaterials} folders={folders} />
        )}
      </div>
    </div>
  );
}
