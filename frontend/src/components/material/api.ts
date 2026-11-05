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
  listMyCollections,
  listPublicCollections,
  getCollection,
  createCollection,
  updateCollection,
  updateCollectionPublicState,
  deleteCollection,
  addResourceToCollection,
  removeResourceFromCollection,
} from "@/lib/api-client";
import type { PubResource, PubResourceBasic, PubCollectionDetail } from "@/api";
import { UpdateResourceStatusNewStatusEnum } from "@/api";
import type { FilterOption } from "@/components/ui";
import { DIFFICULTY_LABELS } from "@/lib/difficulty";
import { EDU_LEVEL_LABELS } from "@/lib/edu-level";

/** Volba do selectu cílové skupiny (z katalogu). */
export interface ResourceTargetOption {
  id: number;
  label: string;
}

/** Volby serverových filtrů EQF úrovně, typu, tematického bloku a zkušenosti s AI (`value` = ID z číselníku). */
export interface ResourceCatalogFilters {
  eqfLevels: FilterOption[];
  courseTypes: FilterOption[];
  blocks: FilterOption[];
  levels: FilterOption[];
}

export const EMPTY_RESOURCE_CATALOG_FILTERS: ResourceCatalogFilters = {
  eqfLevels: [],
  courseTypes: [],
  blocks: [],
  levels: [],
};

/** Serverové filtry seznamu materiálů (`GET /resources`). */
export interface MaterialsFilter {
  textSearch?: string;
  subjectId?: number;
  educationLevel?: string;
  difficultyLevel?: string;
  targetId?: number;
  eqfLevelId?: number;
  courseTypeId?: number;
  blockId?: number;
  levelId?: number;
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
    authorName: resource.authorDisplayName ?? undefined,
    targetAudience: resource.target?.name,
    educationLevel: EDU_LEVEL_LABELS[resource.educationLevel] ?? resource.educationLevel,
    educationLevelValue: resource.educationLevel,
    fileTypes: [
      ...new Set((resource.files ?? []).map((f) => String(f.fileType ?? "other"))),
    ],
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
      ...(resource.eqfLevel
        ? [{ label: "EQF úroveň", value: `${resource.eqfLevel.code} – ${resource.eqfLevel.name}` }]
        : []),
      ...(resource.courseType ? [{ label: "Typ", value: resource.courseType.name }] : []),
      ...(resource.block ? [{ label: "Tematický blok", value: resource.block.name }] : []),
      ...(resource.level ? [{ label: "Zkušenost s AI", value: resource.level.name }] : []),
      ...(resource.authorDisplayName
        ? [{ label: "Autor", value: resource.authorDisplayName }]
        : []),
    ],
    krauuCompetences: resource.krauuCompetences ?? [],
    bloomLevels: resource.bloomLevels ?? [],
    // `filePath` je interní klíč v SeaweedFS, ne odkaz ke stažení — přílohy se
    // stahují přes backend podle resourceId/fileId.
    attachments: (resource.files ?? []).map((f) => ({
      id: String(f.fileId),
      name: attachmentNameFromPath(f.filename, `Soubor ${f.fileId}`),
      format: (f.fileType ?? "file").toString().toUpperCase(),
      sizeLabel: "",
      resourceId: resource.resourceId,
      fileId: f.fileId,
    })),
  };
}

/** Mapuje sbírku z API na frontendovou složku (vč. odvození členství z položek). */
function mapCollectionToFolder(c: PubCollectionDetail): MaterialFolder {
  const items = c.items ?? [];
  return {
    id: String(c.collectionId),
    name: c.title,
    description: c.description ?? undefined,
    isPublic: c.isPublic ?? false,
    resourceIds: items.map((it) => String(it.resource.resourceId)),
    itemCount: items.length,
  };
}

/** Odlehčené mapování položky sbírky (PubResourceBasic) na kartu materiálu.
 * Plná data (hodnocení, soubory, obtížnost) se dotáhnou až na detailu materiálu. */
function mapBasicResourceToMaterial(basic: PubResourceBasic): Material {
  return {
    id: String(basic.resourceId),
    title: basic.title,
    description: basic.description ?? "",
    difficultyLabel: "—",
    fileLabel: "—",
    rating: 0,
    reviewsCount: 0,
    categoryId: "uncategorized",
    status: STATUS_MAP[basic.status] ?? "in_review",
    isPublic: basic.isPublic,
    ownerId: String(basic.authorId),
  };
}

/** Převod filtru na query parametry `listResources` — jedno místo pro obě záložky. */
function listResourcesFilterParams(filter: MaterialsFilter) {
  return {
    textSearch: filter.textSearch || undefined,
    resourceSubjectId: filter.subjectId,
    educationLevel: filter.educationLevel || undefined,
    difficultyLevel: filter.difficultyLevel || undefined,
    resourceTargetId: filter.targetId,
    resourceEqfLevelId: filter.eqfLevelId,
    resourceCourseTypeId: filter.courseTypeId,
    resourceBlockId: filter.blockId,
    resourceLevelId: filter.levelId,
  };
}

/** Má filtr aspoň jednu vyplněnou hodnotu? */
export function hasMaterialsFilter(filter: MaterialsFilter): boolean {
  return Object.values(filter).some((value) => value !== undefined && value !== "");
}

// chyby zde  neodchytáváme — rozlišuje stav „chyba" (btn zkusit znovu) od prázdný výsledek
export async function fetchPublicMaterials(
  filter: MaterialsFilter = {},
): Promise<Material[]> {
  const resources = await listResources({
    isPublished: true,
    status: "approved",
    ...listResourcesFilterParams(filter),
  });
  return resources.map(mapPubResourceToMaterial);
}

/**
 * ID materiálů, které odpovídají filtru — bez ohledu na autora, stav a viditelnost.
 * „Moje sbírka" jimi zužuje vlastní materiály i obsah složky: filtruje backend,
 * frontend dělá jen průnik s tím, co je v daném pohledu vidět (backend neumí
 * filtr podle autora a obsah složky přichází bez detailů materiálu).
 */
export async function fetchMatchingMaterialIds(filter: MaterialsFilter): Promise<Set<string>> {
  // includeInactive stejně jako fetchMyMaterials, aby průnik nic neztratil.
  const resources = await listResources({ includeInactive: true, ...listResourcesFilterParams(filter) });
  return new Set(resources.map((r) => String(r.resourceId)));
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

/** Číselníky pro filtry EQF úroveň / Typ / Tematický blok / Zkušenost s AI. */
export async function fetchResourceCatalogFilters(): Promise<ResourceCatalogFilters> {
  try {
    const [eqfLevels, courseTypes, blocks, levels] = await Promise.all([
      catalogsApi.listCourseEqfLevels(),
      catalogsApi.listCourseTypes(),
      catalogsApi.listCourseBlocks(),
      catalogsApi.listCourseLevels(),
    ]);
    return {
      eqfLevels: eqfLevels.map((l) => ({ value: String(l.eqfLevelId), label: `EQF ${l.code} – ${l.name}` })),
      courseTypes: courseTypes.map((t) => ({ value: String(t.typeId), label: t.name })),
      blocks: blocks.map((b) => ({ value: String(b.blockId), label: b.name })),
      levels: levels.map((l) => ({ value: String(l.levelId), label: l.name })),
    };
  } catch (err) {
    console.error("fetchResourceCatalogFilters failed:", err);
    return EMPTY_RESOURCE_CATALOG_FILTERS;
  }
}

export async function fetchMyFolders(): Promise<MaterialFolder[]> {
  const collections = await listMyCollections();
  return collections.map(mapCollectionToFolder);
}

/** Veřejné sbírky ostatních uživatelů (pro záložku „Veřejné sbírky"). */
export async function fetchPublicCollections(textSearch?: string): Promise<MaterialFolder[]> {
  const collections = await listPublicCollections(textSearch);
  return collections.map(mapCollectionToFolder);
}

/** Materiály v dané sbírce (vlastní i uložené cizí veřejné). */
export async function fetchCollectionMaterials(folderId: string): Promise<Material[]> {
  const detail = await getCollection(Number(folderId));
  return (detail.items ?? []).map((it) => mapBasicResourceToMaterial(it.resource));
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
  const created = await createCollection({ title: name });
  return {
    id: String(created.collectionId),
    name: created.title,
    description: created.description ?? undefined,
    isPublic: created.isPublic ?? false,
    resourceIds: [],
    itemCount: 0,
  };
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  await updateCollection(Number(folderId), { title: name });
}

export async function deleteFolder(folderId: string): Promise<void> {
  await deleteCollection(Number(folderId));
}

/** Zveřejní / skryje sbírku pro ostatní uživatele. */
export async function setFolderPublic(folderId: string, isPublic: boolean): Promise<void> {
  await updateCollectionPublicState(Number(folderId), isPublic);
}

/** Přidá materiál do sbírky (many-to-many) — vrací aktualizovanou složku. */
export async function addMaterialToFolder(
  materialId: string,
  folderId: string,
): Promise<MaterialFolder> {
  const detail = await addResourceToCollection(Number(folderId), Number(materialId));
  return mapCollectionToFolder(detail);
}

/** Odebere materiál ze sbírky. */
export async function removeMaterialFromFolder(
  materialId: string,
  folderId: string,
): Promise<void> {
  await removeResourceFromCollection(Number(folderId), Number(materialId));
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
