import type { Material, MaterialCategory, MaterialFolder } from "./types";
import {
  catalogsApi,
  getMe,
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  uploadResourceFile,
  deleteResourceFile,
  updateResourceStatus,
  updateResourcePublicState,
  createResourceFork,
} from "@/lib/api-client";
import type { PubResource } from "@/api";
import { UpdateResourceStatusNewStatusEnum } from "@/api";
import { DIFFICULTY_LABELS } from "@/lib/difficulty";
import { EDU_LEVEL_LABELS } from "@/lib/edu-level";

/** Volba do selectu cílové skupiny (z katalogu). */
export interface ResourceTargetOption {
  id: number;
  label: string;
}

/** Serverové filtry pro veřejný seznam materiálů. */
export interface PublicMaterialsFilter {
  textSearch?: string;
  subjectId?: number;
  educationLevel?: string;
  difficultyLevel?: string;
  targetId?: number;
}

const STATUS_MAP: Record<string, Material["status"]> = {
  approved: "approved",
  pending_review: "in_review",
  draft: "draft",
  rejected: "rejected",
};

function categoryIdFromSubject(subjectCode: string | undefined, subjectId: number | null | undefined): string {
  if (subjectCode) return subjectCode;
  if (subjectId != null) return String(subjectId);
  return "uncategorized";
}

function fileLabelFor(resource: PubResource): string {
  const file = resource.files?.[0];
  if (!file) {
    return resource.filesCount && resource.filesCount > 0
      ? `${resource.filesCount} souborů`
      : "Bez souboru";
  }
  return (file.fileType ?? "file").toString().toUpperCase();
}

function attachmentNameFromPath(path: string, fallback: string): string {
  if (!path) return fallback;
  const parts = path.split("/");
  return parts[parts.length - 1] || fallback;
}

export function mapPubResourceToMaterial(resource: PubResource): Material {
  return {
    id: String(resource.resourceId),
    title: resource.title,
    description: resource.description ?? "",
    difficultyLabel: resource.difficultyLevel
      ? DIFFICULTY_LABELS[resource.difficultyLevel] ?? resource.difficultyLevel
      : "—",
    fileLabel: fileLabelFor(resource),
    rating: resource.avgRating ?? 0,
    reviewsCount: resource.ratingsCount ?? 0,
    categoryId: categoryIdFromSubject(resource.subject?.code, resource.subjectId),
    status: STATUS_MAP[resource.status] ?? "in_review",
    isPublic: resource.isPublic,
    allowForks: resource.allowForks ?? false,
    isFork: resource.isFork,
    ownerId: String(resource.authorId),
    targetAudience: resource.target?.name,
    educationLevel: EDU_LEVEL_LABELS[resource.educationLevel] ?? resource.educationLevel,
    difficulty: resource.difficultyLevel,
    targets: [
      ...(resource.target ? [{ label: "Cílová skupina", value: resource.target.name }] : []),
      {
        label: "Úroveň vzdělání",
        value: EDU_LEVEL_LABELS[resource.educationLevel] ?? resource.educationLevel,
      },
      ...(resource.difficultyLevel
        ? [{ label: "Obtížnost", value: DIFFICULTY_LABELS[resource.difficultyLevel] ?? resource.difficultyLevel }]
        : []),
      ...(resource.authorDisplayName
        ? [{ label: "Autor", value: resource.authorDisplayName }]
        : []),
    ],
    attachments: (resource.files ?? []).map((f) => ({
      id: String(f.fileId),
      name: attachmentNameFromPath(f.filename, `Soubor ${f.fileId}`),
      format: (f.fileType ?? "file").toString().toUpperCase(),
      sizeLabel: "",
      url: f.filePath,
    })),
  };
}

// chyby zde  neodchytáváme — rozlišuje stav „chyba" (btn zkusit znovu) od prázdný výsledek
export async function fetchPublicMaterials(
  filter: PublicMaterialsFilter = {},
): Promise<Material[]> {
  const resources = await listResources({
    isPublished: true,
    status: "approved",
    textSearch: filter.textSearch || undefined,
    resourceSubjectId: filter.subjectId,
    educationLevel: filter.educationLevel || undefined,
    difficultyLevel: filter.difficultyLevel || undefined,
    resourceTargetId: filter.targetId,
  });
  return resources.map(mapPubResourceToMaterial);
}

// Chyby propagujeme, aby stránka mohla nabídnout „Zkusit znovu".
export async function fetchMyMaterials(): Promise<Material[]> {
  const [me, resources] = await Promise.all([getMe(), listResources({ includeInactive: true })]);
  return resources
    .filter((r) => r.authorId === me.userId)
    .map(mapPubResourceToMaterial);
}

export async function fetchMaterialCategories(): Promise<MaterialCategory[]> {
  try {
    const subjects = await catalogsApi.listCourseSubjects();
    return subjects.map((s) => ({ id: s.code, label: s.name, subjectId: s.subjectId }));
  } catch (err) {
    console.error("fetchMaterialCategories failed:", err);
    return [];
  }
}

/** Cílové skupiny z katalogu pro filtr „Cílová skupina". */
export async function fetchResourceTargets(): Promise<ResourceTargetOption[]> {
  try {
    const targets = await catalogsApi.listCourseTargets();
    return targets.map((t) => ({ id: t.targetId, label: t.name }));
  } catch (err) {
    console.error("fetchResourceTargets failed:", err);
    return [];
  }
}

export async function fetchMyFolders(): Promise<MaterialFolder[]> {
  return [];
}

export async function fetchMaterialById(id: string): Promise<Material | null> {
  const resourceId = Number(id);
  if (!Number.isFinite(resourceId)) return null;
  try {
    const resource = await getResource(resourceId);
    return mapPubResourceToMaterial(resource);
  } catch (err) {
    console.error("fetchMaterialById failed:", err);
    return null;
  }
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
  try {
    const resources = await listResources({ status: "pending_review", includeInactive: true });
    return resources.map(mapPubResourceToMaterial);
  } catch (err) {
    console.error("fetchMaterialsForReview failed:", err);
    return [];
  }
}

// Schválené materiály (veřejné i skryté) – pro správu publikace v přehledu ke schválení.
export async function fetchApprovedMaterials(): Promise<Material[]> {
  try {
    const resources = await listResources({ status: "approved" });
    return resources.map(mapPubResourceToMaterial);
  } catch (err) {
    console.error("fetchApprovedMaterials failed:", err);
    return [];
  }
}

// Odeslání konceptu ke schválení (draft → pending_review)
export async function submitResourceForReview(resourceId: number): Promise<PubResource> {
  return updateResourceStatus(resourceId, UpdateResourceStatusNewStatusEnum.PendingReview);
}

export {
  createResource,
  updateResource,
  deleteResource,
  uploadResourceFile,
  deleteResourceFile,
  updateResourcePublicState,
  createResourceFork,
};
