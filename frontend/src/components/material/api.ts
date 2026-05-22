import type { Material, MaterialCategory, MaterialFolder } from "./types";
import {
  MOCK_CATEGORIES,
  MOCK_FOLDERS,
  MOCK_MY_MATERIALS,
  MOCK_PUBLIC_MATERIALS,
  getMockMaterialById,
} from "./mockData";

/**
 * Tyto funkce jsou zatím napojené na mock data. Před napojením na backend
 * je nahraď voláním přes `@/lib/api-client` (zachovej stejný tvar návratu).
 */

export async function fetchPublicMaterials(): Promise<Material[]> {
  return MOCK_PUBLIC_MATERIALS;
}

export async function fetchMyMaterials(): Promise<Material[]> {
  return MOCK_MY_MATERIALS;
}

export async function fetchMaterialCategories(): Promise<MaterialCategory[]> {
  return MOCK_CATEGORIES;
}

export async function fetchMyFolders(): Promise<MaterialFolder[]> {
  return MOCK_FOLDERS;
}

export async function fetchMaterialById(id: string): Promise<Material | null> {
  return getMockMaterialById(id) ?? null;
}

export async function createFolder(name: string): Promise<MaterialFolder> {
  return { id: name.toLowerCase().replace(/\s+/g, "_"), name };
}

export async function deleteFolder(folderId: string): Promise<void> {
  void folderId;
}

export async function moveMaterialToFolder(
  materialId: string,
  folderId: string | null,
): Promise<void> {
  void materialId;
  void folderId;
}

export async function toggleBookmark(materialId: string): Promise<void> {
  void materialId;
}

export async function fetchMaterialsForReview(): Promise<Material[]> {
  return MOCK_MY_MATERIALS.filter((m) => m.status === "in_review");
}
