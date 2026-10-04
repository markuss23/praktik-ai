'use client';

import { getCourses, getModules, updateCoursePublished, generateCourseEmbeddings, generateCourseWithAI, updateCourseStatus, createModule, coursesApi as sharedCoursesApi, modulesApi as sharedModulesApi } from "@/lib/api-client";
import { Course, Difficulty, Status, Module, UpdateCourseStatusStatusEnum } from "@/api";
import React, { useState, useEffect, useCallback, useMemo, useRef, useId } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, BicepsFlexed, Upload, RotateCcw, RefreshCw, Archive, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { ModuleModal, EditActionButton, PublishActionButton, DeleteActionButton, CourseActionButtons, ApproveActionButton } from "@/components/admin";
import { CourseFilters, DEFAULT_COURSE_FILTERS, type CourseFilterState } from "@/components/admin/CourseFilters";
import { compareCourses, DEFAULT_COURSE_SORT, isCourseSortOrder, type CourseSortOrder } from "@/lib/course-sort";
import { REVIEW_COUNT_EVENT } from "@/components/admin/AdminSidebar";
import { StatusBadge, PublishBadge, ModuleActiveBadge, GeneratingBadge } from "@/components/ui/Badge";
import { useCourseGeneration, COURSE_GENERATION_FINISHED_EVENT } from "@/components/admin/CourseGenerationProvider";
import { Dropdown, SimpleBotIcon } from "@/components/ui/Dropdown";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import { useRole } from "@/hooks/useRole";
import { useCatalogData } from "@/hooks/useCatalogData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebounce } from "@/hooks/useDebounce";
import { Button, CatalogSelect, useToast, ConfirmModal, type ConfirmVariant, Input, Skeleton, Tooltip, TooltipTrigger, TooltipContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";
import { BTN_KEEP_BOX, cn, czechPlural } from "@/lib/utils";
import {
  courseToUpdate, crossSubjectIdsFor, crossSubjectsRule, moduleCategoryValues, moduleToUpdate,
  validateCourseCategories, validateModuleCategories,
} from "@/lib/course-categories";
import { readApiErrorDetail } from "@/lib/api-error";

const PAGE_SIZE = 10;

// Seznam si pamatuje, kde uživatel skončil, aby se po návratu z editace (nebo
// přes „Kurzy" v menu) otevřel na stejném místě:
//   - stránka: v URL (`?page=N`, jednička se vynechává) — funguje Zpět i sdílení
//     odkazu; sessionStorage drží poslední stránku pro vstupy bez parametru
//     (menu „Kurzy", „Dokončit" v editaci)
//   - filtry a rozbalený kurz: sessionStorage (žijí jen v záložce, aby filtr
//     nezůstal „zaseklý" druhý den)
//   - řazení: localStorage (trvalá předvolba)
// Hodnoty se čtou v inicializátoru stavu, ne v efektu — efekt by ve StrictMode
// běžel dvakrát a s „reset na první stránku" níže by se pral.
const SESSION_PAGE_KEY = 'coursesList.page';
const SESSION_FILTERS_KEY = 'coursesList.filters';
const SESSION_EXPANDED_KEY = 'coursesList.expandedCourse';
const LOCAL_SORT_KEY = 'coursesList.sort';

type StorageKind = 'session' | 'local';

function getStorage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(kind: StorageKind, key: string): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(kind: StorageKind, key: string, value: string | null) {
  try {
    const storage = getStorage(kind);
    if (!storage) return;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Soukromý režim / plné úložiště — bez paměti seznam funguje dál.
  }
}

function parsePositiveInt(raw: string | null): number | null {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readStoredSort(): CourseSortOrder {
  const raw = readStorage('local', LOCAL_SORT_KEY);
  return isCourseSortOrder(raw) ? raw : DEFAULT_COURSE_SORT;
}

function readStoredExpandedCourse(): number | null {
  return parsePositiveInt(readStorage('session', SESSION_EXPANDED_KEY));
}

function readStoredFilters(): CourseFilterState {
  const raw = readStorage('session', SESSION_FILTERS_KEY);
  if (!raw) return DEFAULT_COURSE_FILTERS;
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof CourseFilterState, unknown>>;
    const d = DEFAULT_COURSE_FILTERS;
    const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
    const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
    // Bere jen známé klíče se správným typem — starý/poškozený záznam nesmí seznam rozbít.
    return {
      onlyMine: typeof p.onlyMine === 'boolean' ? p.onlyMine : d.onlyMine,
      difficulty: str(p.difficulty, d.difficulty) as CourseFilterState['difficulty'],
      status: str(p.status, d.status) as CourseFilterState['status'],
      published: (['all', 'yes', 'no'] as const).find((v) => v === p.published) ?? d.published,
      blockId: num(p.blockId, d.blockId),
      targetId: num(p.targetId, d.targetId),
      subjectId: num(p.subjectId, d.subjectId),
      search: str(p.search, d.search),
    };
  } catch {
    return DEFAULT_COURSE_FILTERS;
  }
}

type ModalType = 'course-create' | 'course-edit' | 'module-create' | 'module-edit' | null;

// Rychlé úpravy v řádku kurzu: vedle názvu a zařazení i vstupy, které čte AI
// generátor (popis, délka) a obtížnost. Stejné limity jako ve formuláři AI
// tvorby (CourseAICreateView), ať se kurz chová všude stejně.
const QUICK_EDIT_INPUT_CLASS =
  'px-2 py-1.5 border border-gradient-r/30 rounded-md text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-gradient-r/30';
const QUICK_EDIT_SELECT_CLASS = `${QUICK_EDIT_INPUT_CLASS} data-[size=default]:h-auto`;
const QUICK_EDIT_DIFFICULTY_ITEMS = DIFFICULTY_ORDER.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }));

interface QuickEditData {
  title: string;
  description: string;
  courseBlockId: number;
  courseTargetId: number;
  courseSubjectId: number;
  /** Číslo drží jako text, aby šlo pole vymazat a přepsat bez skoku na 0 */
  durationMinutes: string;
  difficulty: Difficulty;
}

const EMPTY_QUICK_EDIT: QuickEditData = {
  title: '', description: '', courseBlockId: 0, courseTargetId: 0, courseSubjectId: 0,
  durationMinutes: '', difficulty: Difficulty.SlightlyAdvanced,
};

/** editaci jen ve stavech koncept/vygenerovaný/editovaný */
function getCourseEditLockReason(course: Course): string | null {
  const status = course.status as string;
  if (status === Status.Draft || status === Status.Generated || status === Status.Edited) return null;
  if (status === Status.Failed) return 'Generování kurzu selhalo. Spusťte ho znovu tlačítkem „Spustit znovu".';
  if (status === Status.InReview) return 'Kurz čeká na schválení. Během schvalování ho nelze upravovat.';
  if (status === Status.Archived) return 'Kurz je archivovaný, proto ho nelze upravovat.';
  if (course.isPublished) return 'Kurz je schválený a publikovaný, proto ho nelze upravovat.';
  return 'Kurz je schválený, proto ho nelze upravovat. Upravit ho půjde až po vrácení do úprav.';
}

// Hlavní dashboard admin sekce - seznam kurzů s rozbalitelnými moduly
export function CoursesListView() {
  const { goToCourseContent, goToCourseUpload, goToAICreate } = useAdminNavigation();
  const { isSuperAdmin } = useRole();
  const { blocks, targets, subjects, neuroPrinciples } = useCatalogData();
  const { isOwner, currentUser } = useCurrentUser();
  const toast = useToast();
  // Průběh AI generování (polling drží CourseGenerationProvider v admin layoutu)
  const generation = useCourseGeneration();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(readStoredExpandedCourse);
  // `undefined` = moduly kurzu se ještě nenačetly (panel ukazuje kostru)
  const [courseModules, setCourseModules] = useState<{ [key: number]: Module[] }>({});
  // Kurzy, u kterých načtení modulů selhalo — panel místo kostry nabídne „Zkusit znovu"
  const [moduleLoadErrors, setModuleLoadErrors] = useState<Set<number>>(() => new Set());

  // Filtry, řazení a stránkování (klientské, nad načteným seznamem)
  const [filters, setFilters] = useState<CourseFilterState>(readStoredFilters);
  const debouncedSearch = useDebounce(filters.search, 300);
  const [sortOrder, setSortOrder] = useState<CourseSortOrder>(readStoredSort);

  // Stránka: URL je zdroj pravdy; bez parametru platí poslední stránka ze
  // sessionStorage, přečtená jednou při mountu (viz komentář u SESSION_* výše).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlPage = parsePositiveInt(searchParams.get('page'));
  const fallbackPage = useRef<number | null>(null);
  if (fallbackPage.current === null) {
    fallbackPage.current = parsePositiveInt(readStorage('session', SESSION_PAGE_KEY)) ?? 1;
  }
  const page = urlPage ?? fallbackPage.current;

  const pageHref = useCallback((n: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (n > 1) params.set('page', String(n));
    else params.delete('page');
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  // Jediná cesta ke změně stránky: zapíše ji do URL (push → funguje Zpět) i do
  // sessionStorage. `replace` pro automatické přesuny (reset filtrem, oříznutí),
  // ať neplní historii.
  const setPage = useCallback((n: number, { replace = false }: { replace?: boolean } = {}) => {
    if (n === page) return;
    fallbackPage.current = n;
    writeStorage('session', SESSION_PAGE_KEY, String(n));
    const href = pageHref(n);
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [page, pageHref, router]);

  // Po mountu bez parametru doplň obnovenou stránku do URL (jen kvůli sdílení
  // a obnovení stránky; zobrazení už jede z `fallbackPage`).
  const urlSynced = useRef(false);
  useEffect(() => {
    if (urlSynced.current) return;
    urlSynced.current = true;
    if (urlPage === null && page > 1) router.replace(pageHref(page), { scroll: false });
  }, [urlPage, page, pageHref, router]);

  // Zavře rozbalené moduly i rychlé úpravy
  const closeAllExpanded = useCallback(() => {
    setExpandedCourse(null);
    writeStorage('session', SESSION_EXPANDED_KEY, null);
    setQuickEditCourseId(null);
  }, []);

  // Embedding generation state
  const [embeddingLoading, setEmbeddingLoading] = useState<number | null>(null);
  const [embeddingDone, setEmbeddingDone] = useState<Set<number>>(new Set());

  // Status change loading
  const [statusLoading, setStatusLoading] = useState<number | null>(null);

  // Potvrzovací modal pro významné akce (odeslat ke schválení, archivovat, …)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: ConfirmVariant;
    action: () => Promise<void> | void;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const runConfirm = async () => {
    if (!confirmConfig) return;
    setConfirmLoading(true);
    try {
      await confirmConfig.action();
    } finally {
      setConfirmLoading(false);
      setConfirmConfig(null);
    }
  };

  // Quick edit state (inline accordion)
  const [quickEditCourseId, setQuickEditCourseId] = useState<number | null>(null);
  const [quickEditData, setQuickEditData] = useState<QuickEditData>(EMPTY_QUICK_EDIT);
  const [quickEditLoading, setQuickEditLoading] = useState(false);

  // Stavy modálních oken
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Rychlé vytvoření kurzu přes modal („Manuální zadání") je vypnuté: kurz dnes
  // potřebuje KRAUU kompetence, Bloomovu taxonomii a průřezové obory, které
  // modal nemá a rozumný výchozí stav pro ně neexistuje. Kurz se zakládá přes
  // AI formulář. Při obnovení vrátit i importy `createCourse` a `CourseModal`.
  // const [courseFormData, setCourseFormData] = useState({
  //   courseId: null as number | null,
  //   title: '',
  //   description: '',
  //   isPublished: false,
  //   courseBlockId: 0,
  // });

  // Data formuláře modulu
  const [moduleFormData, setModuleFormData] = useState({
    moduleId: null as number | null,
    title: '',
    courseId: 0,
  });

  //  Permissions helpers 

  /** Can the current user edit this course? (owner or superadmin) */
  const canEditCourse = (course: Course) => isSuperAdmin || isOwner(course.ownerId);

  /** Can the current user publish this course? (owner or superadmin) */
  const canPublishCourse = (course: Course) => isSuperAdmin || isOwner(course.ownerId);

  /** Can the current user delete this course?
   *  Superadmin: always. Owner: when kurz je ve stavu draft, generated, edited (rozpracováno) nebo failed. */
  const canDeleteCourse = (course: Course) => {
    if (isSuperAdmin) return true;
    if (!isOwner(course.ownerId)) return false;
    const status = course.status as string;
    return status === Status.Draft || status === Status.Generated || status === Status.Edited || status === Status.Failed;
  };

  /** Generování lze spustit znovu u selhaného kurzu a u konceptu bez modulů
   *  (generování ho nedokončilo, typicky po restartu serveru). Backend povolí
   *  jen stavy draft/failed. */
  const canRetryGeneration = (course: Course) => {
    if (!canEditCourse(course) || generation.isGenerating(course.courseId)) return false;
    const status = course.status as string;
    return status === Status.Failed || (status === Status.Draft && (course.modulesCount ?? 0) === 0);
  };

  // Data loading

  // Načtení modulů rozbaleného kurzu. Jediné místo, které moduly stahuje —
  // běží i po obnovení rozbaleného kurzu z localStorage. Ve StrictMode se
  // efekt spouští dvakrát, proto rozpracované požadavky hlídá `modulesInFlight`
  // (dřív se při rozbalení posílaly dva stejné requesty: z efektu i z klik handleru).
  const modulesInFlight = useRef(new Set<number>());
  useEffect(() => {
    const courseId = expandedCourse;
    if (courseId === null) return;
    if (courseModules[courseId] !== undefined || moduleLoadErrors.has(courseId)) return;
    if (modulesInFlight.current.has(courseId)) return;

    modulesInFlight.current.add(courseId);
    getModules({ courseId })
      .then((modules) => {
        setCourseModules(prev => ({ ...prev, [courseId]: modules }));
      })
      .catch((error) => {
        console.error('Failed to load modules:', error);
        setModuleLoadErrors(prev => new Set(prev).add(courseId));
      })
      .finally(() => {
        modulesInFlight.current.delete(courseId);
      });
  }, [expandedCourse, courseModules, moduleLoadErrors]);

  // „Zkusit znovu": smazání chyby nechá efekt výše moduly stáhnout znovu
  const retryLoadModules = useCallback((courseId: number) => {
    setModuleLoadErrors(prev => {
      if (!prev.has(courseId)) return prev;
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
  }, []);

  const loadCoursesList = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setCoursesError('Nepodařilo se načíst seznam kurzů.');
      toast.error(error, 'Nepodařilo se načíst seznam kurzů.');
    } finally {
      setCoursesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCoursesList();
  }, [loadCoursesList]);

  // Dokončené/selhané generování na pozadí změnilo stav kurzu → obnovit seznam
  useEffect(() => {
    const handler = () => { void loadCoursesList(); };
    window.addEventListener(COURSE_GENERATION_FINISHED_EVENT, handler);
    return () => window.removeEventListener(COURSE_GENERATION_FINISHED_EVENT, handler);
  }, [loadCoursesList]);

  // Filtrování a stránkování

  const filteredCourses = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const result = courses.filter((c) => {
      if (filters.onlyMine && c.ownerId !== currentUser?.userId) return false;
      if (filters.difficulty && c.difficulty !== filters.difficulty) return false;
      if (filters.status && (c.status as string) !== filters.status) return false;
      if (filters.published === 'yes' && !c.isPublished) return false;
      if (filters.published === 'no' && c.isPublished) return false;
      if (filters.blockId && c.courseBlockId !== filters.blockId) return false;
      if (filters.targetId && c.courseTargetId !== filters.targetId) return false;
      if (filters.subjectId && (c.courseSubjectId ?? 0) !== filters.subjectId) return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
    result.sort((a, b) => compareCourses(a, b, sortOrder));
    return result;
  }, [
    courses, currentUser?.userId, debouncedSearch, sortOrder,
    filters.onlyMine, filters.difficulty, filters.status, filters.published,
    filters.blockId, filters.targetId, filters.subjectId,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const pagedCourses = filteredCourses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Po změně filtrů zpět na první stránku. Porovnává se otisk naposledy
  // použitých filtrů, ne „první běh" efektu — ten by ve StrictMode (dvojí
  // spuštění efektů ve vývoji) obnovenou stránku hned přepsal jedničkou.
  const filterSignature = JSON.stringify([
    debouncedSearch, filters.onlyMine, filters.difficulty, filters.status,
    filters.published, filters.blockId, filters.targetId, filters.subjectId,
  ]);
  const appliedFilterSignature = useRef(filterSignature);
  useEffect(() => {
    if (appliedFilterSignature.current === filterSignature) return;
    appliedFilterSignature.current = filterSignature;
    setPage(1, { replace: true });
  }, [filterSignature, setPage]);

  // Drž stránku v platném rozsahu (až po načtení, ať neoříznutí obnovenou stránku)
  useEffect(() => {
    if (!coursesLoading && page > totalPages) setPage(totalPages, { replace: true });
  }, [page, totalPages, coursesLoading, setPage]);

  // Stránku z URL (Zpět/Vpřed, ruční úprava adresy) drž i v sessionStorage,
  // filtry a řazení taky — pro příští návrat na seznam.
  useEffect(() => {
    writeStorage('session', SESSION_PAGE_KEY, String(page));
  }, [page]);
  useEffect(() => {
    writeStorage('session', SESSION_FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);
  useEffect(() => {
    writeStorage('local', LOCAL_SORT_KEY, sortOrder);
  }, [sortOrder]);

  // Zavři rozbalené sekce při kliknutí mimo ně nebo klávesou Escape
  useEffect(() => {
    if (expandedCourse === null && quickEditCourseId === null) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Klik uvnitř otevřené sekce nebo na její spouštěč nech být
      if (target?.closest('[data-accordion-panel]')) return;
      if (target?.closest('[data-accordion-keep]')) return;
      closeAllExpanded();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllExpanded();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [expandedCourse, quickEditCourseId, closeAllExpanded]);

  // Přechod na jinou stránku přes paginaci: nejdřív přejdi, pak na pozadí zavři sekce.
  // (Voláno z klik handleru, ne z efektu na `page`, aby obnova stránky sekce nezavírala.)
  const handlePageChange = (next: number) => {
    setPage(next);
    closeAllExpanded();
  };

  // Změna řazení přeskládá stránky, proto zpět na první (jako přechod stránky)
  const handleSortChange = (next: CourseSortOrder) => {
    setSortOrder(next);
    setPage(1, { replace: true });
    closeAllExpanded();
  };

  //  Course actions

  const handleDeleteClick = (courseId: number) => {
    setCourseToDelete(courseId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;

    setDeleting(true);
    try {
      await sharedCoursesApi.deleteCourse({ courseId: courseToDelete });
      await loadCoursesList();
      toast.success('Kurz byl smazán.');
      setShowDeleteConfirm(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error(error, 'Nepodařilo se smazat kurz.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    toast.info('Mazání modulů není momentálně podporováno.');
    setShowDeleteConfirm(false);
    setModuleToDelete(null);
  };

  // Moduly rozbaleného kurzu stahuje efekt výše — tady se jen přepíná stav
  const toggleCourseExpand = (courseId: number) => {
    setQuickEditCourseId(null);
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      writeStorage('session', SESSION_EXPANDED_KEY, null);
    } else {
      setExpandedCourse(courseId);
      writeStorage('session', SESSION_EXPANDED_KEY, String(courseId));
    }
  };

  const togglePublish = async (course: Course) => {
    if (!canPublishCourse(course)) return;
    try {
      const newPublishState = !course.isPublished;
      await updateCoursePublished(course.courseId, newPublishState);
      await loadCoursesList();
    } catch (error) {
      console.error('Failed to update publish status:', error);
      toast.error(error, 'Nepodařilo se změnit stav publikování.');
    }
  };

  const toggleModuleActive = async (_module: Module) => {
    console.warn('Module activation toggle not supported by current API');
    toast.info('Změna stavu modulu není momentálně podporována.');
  };

  const getModuleCount = (course: Course) => {
    return course.modulesCount || 0;
  };

  // Status flow

  /** Owner submits course for review: edited/draft/generated → in_review */
  const handleSubmitForReview = async (course: Course) => {
    setStatusLoading(course.courseId);
    try {
      await updateCourseStatus(course.courseId, UpdateCourseStatusStatusEnum.InReview);
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
      await loadCoursesList();
      toast.success('Kurz byl odeslán ke schválení.');
    } catch (error) {
      console.error('Failed to submit for review:', error);
      toast.error(error, 'Nepodařilo se odeslat ke schválení.');
    } finally {
      setStatusLoading(null);
    }
  };

  /** Superadmin reverts approved course back to editing (unpublishes too) */
  const handleRevertToEditing = async (course: Course) => {
    setStatusLoading(course.courseId);
    try {
      await updateCourseStatus(course.courseId, UpdateCourseStatusStatusEnum.Edited);
      window.dispatchEvent(new CustomEvent(REVIEW_COUNT_EVENT));
      await loadCoursesList();
      toast.info('Kurz byl vrácen do úprav.');
    } catch (error) {
      console.error('Failed to revert course:', error);
      toast.error(error, 'Nepodařilo se vrátit kurz do úprav.');
    } finally {
      setStatusLoading(null);
    }
  };

  /** Archive a published course */
  const handleArchive = async (course: Course) => {
    setStatusLoading(course.courseId);
    try {
      await updateCourseStatus(course.courseId, UpdateCourseStatusStatusEnum.Archived);
      await loadCoursesList();
      toast.success('Kurz byl archivován.');
    } catch (error) {
      console.error('Failed to archive course:', error);
      toast.error(error, 'Nepodařilo se archivovat kurz.');
    } finally {
      setStatusLoading(null);
    }
  };

  /** Spustí AI generování znovu; průběh pak sleduje provider a řádek ukáže „Generuje se" */
  const handleRetryGeneration = async (course: Course) => {
    setStatusLoading(course.courseId);
    try {
      await generateCourseWithAI(course.courseId);
      generation.track(course.courseId, course.title);
      toast.info('Můžete stránku opustit, generování běží na serveru.', 'Generování kurzu bylo spuštěno');
    } catch (error) {
      console.error('Failed to restart generation:', error);
      toast.error((await readApiErrorDetail(error)) ?? error, 'Nepodařilo se spustit generování.');
    } finally {
      setStatusLoading(null);
    }
  };

  // Potvrzovací – otevřou modal, samotnou akci spustí až po potvrzení

  const requestRetryGeneration = (course: Course) => setConfirmConfig({
    title: 'Spustit generování znovu',
    message: `Kurz „${course.title}" se vygeneruje znovu z nahraných podkladů. Může to trvat několik minut, mezitím můžete pracovat dál.`,
    confirmLabel: 'Spustit',
    variant: 'primary',
    action: () => handleRetryGeneration(course),
  });

  const requestSubmitForReview = (course: Course) => setConfirmConfig({
    title: 'Odeslat ke schválení',
    message: `Opravdu chcete odeslat kurz „${course.title}" ke schválení? Dokud nebude zkontrolován, nebudete ho moci upravovat.`,
    confirmLabel: 'Odeslat',
    variant: 'primary',
    action: () => handleSubmitForReview(course),
  });

  const requestArchive = (course: Course) => setConfirmConfig({
    title: 'Archivovat kurz',
    message: `Opravdu chcete archivovat kurz „${course.title}"? Přestane být dostupný studentům.`,
    confirmLabel: 'Archivovat',
    variant: 'warning',
    action: () => handleArchive(course),
  });

  const requestRevertToEditing = (course: Course) => setConfirmConfig({
    title: 'Vrátit do úprav',
    message: `Opravdu chcete vrátit kurz „${course.title}" zpět do úprav? Pokud je publikovaný, bude zároveň zrušeno jeho publikování.`,
    confirmLabel: 'Vrátit do úprav',
    variant: 'warning',
    action: () => handleRevertToEditing(course),
  });

  const requestTogglePublish = (course: Course) => setConfirmConfig({
    title: course.isPublished ? 'Zrušit publikování' : 'Publikovat kurz',
    message: course.isPublished
      ? `Opravdu chcete zrušit publikování kurzu „${course.title}"? Přestane být dostupný studentům.`
      : `Opravdu chcete publikovat kurz „${course.title}"? Stane se dostupným studentům.`,
    confirmLabel: course.isPublished ? 'Zrušit publikování' : 'Publikovat',
    variant: course.isPublished ? 'warning' : 'primary',
    action: () => togglePublish(course),
  });

  // Modal handlers

  // Rychlé vytvoření kurzu — vypnuto, viz `courseFormData` výše.
  // const openCreateCourseModal = () => {
  //   setCourseFormData({ courseId: null, title: '', description: '', isPublished: false, courseBlockId: 0 });
  //   setModalError('');
  //   setActiveModal('course-create');
  // };

  const openCreateModuleModal = (courseId: number) => {
    setModuleFormData({ moduleId: null, title: '', courseId: courseId });
    setModalError('');
    setActiveModal('module-create');
  };

  const openEditModuleModal = (module: Module) => {
    setModuleFormData({ moduleId: module.moduleId, title: module.title, courseId: module.courseId });
    setModalError('');
    setActiveModal('module-edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalError('');
  };

  // Rychlé vytvoření kurzu — vypnuto, viz `courseFormData` výše.
  // const handleCourseSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setModalLoading(true);
  //   setModalError('');
  //
  //   try {
  //     if (courseFormData.courseId) {
  //       // Update existing course
  //       const existingCourse = courses.find(c => c.courseId === courseFormData.courseId);
  //       await sharedCoursesApi.updateCourse({
  //         courseId: courseFormData.courseId,
  //         courseUpdate: {
  //           title: courseFormData.title,
  //           description: courseFormData.description,
  //           courseBlockId: courseFormData.courseBlockId || (existingCourse?.courseBlockId ?? 1),
  //           courseTargetId: existingCourse?.courseTargetId ?? 1,
  //           courseSubjectId: existingCourse?.courseSubjectId ?? 1,
  //           courseEqfLevelId: existingCourse?.courseEqfLevelId ?? 1,
  //           courseTypeId: existingCourse?.courseTypeId ?? 1,
  //         }
  //       });
  //     } else {
  //       // Create new course
  //       if (!courseFormData.courseBlockId) {
  //         setModalError('Vyberte tematický blok.');
  //         setModalLoading(false);
  //         return;
  //       }
  //       // Use first available target, subject, EQF level and type as defaults
  //       const defaultTargetId = targets.length > 0 ? targets[0].targetId : 1;
  //       const defaultSubjectId = subjects.length > 0 ? subjects[0].subjectId : 1;
  //       const defaultEqfLevelId = eqfLevels.length > 0 ? eqfLevels[0].eqfLevelId : 1;
  //       const defaultTypeId = types.length > 0 ? types[0].typeId : 1;
  //       await createCourse({
  //         title: courseFormData.title,
  //         description: courseFormData.description || undefined,
  //         courseBlockId: courseFormData.courseBlockId,
  //         courseTargetId: defaultTargetId,
  //         courseSubjectId: defaultSubjectId,
  //         courseEqfLevelId: defaultEqfLevelId,
  //         courseTypeId: defaultTypeId,
  //       });
  //     }
  //     await loadCoursesList();
  //     closeModal();
  //   } catch (err) {
  //     setModalError(err instanceof Error ? err.message : 'Failed to save course');
  //   } finally {
  //     setModalLoading(false);
  //   }
  // };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    try {
      const course = courses.find(c => c.courseId === moduleFormData.courseId) ?? null;
      if (moduleFormData.moduleId) {
        const existingModule = (courseModules[moduleFormData.courseId] ?? [])
          .find(m => m.moduleId === moduleFormData.moduleId);
        if (!existingModule) {
          setModalError('Modul se nepodařilo najít. Obnovte stránku a zkuste to znovu.');
          return;
        }
        const categories = moduleCategoryValues(existingModule, course, neuroPrinciples);
        const categoryError = validateModuleCategories(categories);
        if (categoryError) {
          setModalError(`${categoryError} Doplňte je u modulu v editoru obsahu kurzu.`);
          return;
        }
        await sharedModulesApi.updateModule({
          moduleId: moduleFormData.moduleId,
          moduleUpdate: moduleToUpdate(existingModule, categories, { title: moduleFormData.title }),
        });
        if (moduleFormData.courseId) {
          const modules = await getModules({ courseId: moduleFormData.courseId });
          setCourseModules(prev => ({ ...prev, [moduleFormData.courseId]: modules }));
        }
        closeModal();
      } else {
        if (!moduleFormData.courseId) {
          setModalError('Chybí kurz pro nový modul.');
          return;
        }
        // Nový modul dědí KRAUU a Bloom z kurzu, princip je výchozí NP-01 —
        // upravit je jde v editoru obsahu kurzu.
        const categories = moduleCategoryValues(null, course, neuroPrinciples);
        const categoryError = validateModuleCategories(categories);
        if (categoryError) {
          setModalError('Kurz nemá vyplněné KRAUU kompetence a Bloomovu taxonomii, které nový modul přebírá. Doplňte je v souhrnu kurzu.');
          return;
        }
        await createModule({ courseId: moduleFormData.courseId, title: moduleFormData.title, ...categories });
        const modules = await getModules({ courseId: moduleFormData.courseId });
        setCourseModules(prev => ({ ...prev, [moduleFormData.courseId]: modules }));
        await loadCoursesList();
        toast.success('Modul byl vytvořen.');
        closeModal();
      }
    } catch (err) {
      setModalError((await readApiErrorDetail(err)) ?? (err instanceof Error ? err.message : 'Nepodařilo se uložit modul'));
    } finally {
      setModalLoading(false);
    }
  };

  const closeCourseExpand = () => {
    setExpandedCourse(null);
    writeStorage('session', SESSION_EXPANDED_KEY, null);
  };

  const handleGenerateEmbeddings = async (courseId: number) => {
    setEmbeddingLoading(courseId);
    try {
      await generateCourseEmbeddings(courseId);
      setEmbeddingDone(prev => new Set(prev).add(courseId));
      toast.success('Embeddingy byly vygenerovány.');
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      toast.error(
        error,
        'Nepodařilo se vygenerovat embeddingy. Zkontrolujte, zda je kurz ve stavu „Schváleno".',
      );
    } finally {
      setEmbeddingLoading(null);
    }
  };

  // Quick edit

  const openQuickEdit = (course: Course) => {
    if (quickEditCourseId === course.courseId) {
      setQuickEditCourseId(null);
      return;
    }
    setExpandedCourse(null);
    writeStorage('session', SESSION_EXPANDED_KEY, null);
    setQuickEditCourseId(course.courseId);
    setQuickEditData({
      title: course.title,
      description: course.description ?? '',
      courseBlockId: course.courseBlockId ?? 0,
      courseTargetId: course.courseTargetId ?? 0,
      courseSubjectId: course.courseSubjectId ?? 0,
      durationMinutes: course.durationMinutes != null ? String(course.durationMinutes) : '',
      difficulty: course.difficulty ?? Difficulty.SlightlyAdvanced,
    });
  };

  const closeQuickEdit = () => { setQuickEditCourseId(null); };

  const saveQuickEdit = async () => {
    if (!quickEditCourseId) return;
    const existingCourse = courses.find(c => c.courseId === quickEditCourseId);
    if (!existingCourse) return;
    // Stejná pravidla jako ve formuláři AI tvorby
    const title = quickEditData.title.trim();
    if (title.length < 3 || title.length > 120) {
      toast.error('Název kurzu musí mít 3 až 120 znaků.');
      return;
    }
    const description = quickEditData.description.trim();
    if (description.length > 500) {
      toast.error('Popis kurzu může mít nejvýše 500 znaků.');
      return;
    }
    const durationRaw = quickEditData.durationMinutes.trim();
    const durationMinutes = durationRaw ? Number(durationRaw) : null;
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 300)) {
      toast.error('Délka kurzu musí být mezi 15 a 300 minutami.');
      return;
    }

    // Změna bloku mění pravidlo pro průřezové obory (A/B povinné, C zakázané).
    const rule = crossSubjectsRule(blocks, quickEditData.courseBlockId || null);
    const update = courseToUpdate(existingCourse, {
      title,
      description: description || null,
      // 0 = „Neurčeno" — blok i obor jsou volitelné.
      courseBlockId: quickEditData.courseBlockId || null,
      courseTargetId: quickEditData.courseTargetId,
      courseSubjectId: quickEditData.courseSubjectId || null,
      durationMinutes,
      difficulty: quickEditData.difficulty,
    });
    update.crossSubjectIds = crossSubjectIdsFor(rule, update.crossSubjectIds ?? []);
    const categoryError = validateCourseCategories(
      { krauuCompetenceIds: update.krauuCompetenceIds, bloomLevelIds: update.bloomLevelIds, crossSubjectIds: update.crossSubjectIds },
      rule,
    );
    if (categoryError) {
      toast.error(`${categoryError} Doplňte je v souhrnu kurzu.`);
      return;
    }
    setQuickEditLoading(true);
    try {
      await sharedCoursesApi.updateCourse({
        courseId: quickEditCourseId,
        courseUpdate: update,
      });
      await loadCoursesList();
      toast.success('Rychlé úpravy uloženy.');
    } catch (error) {
      console.error('Failed to quick save course:', error);
      toast.error((await readApiErrorDetail(error)) ?? error, 'Nepodařilo se uložit rychlé úpravy.');
    } finally {
      setQuickEditLoading(false);
    }
  };

  const canSubmitForReview = (course: Course) => {
    const editableStatuses: string[] = [Status.Draft, Status.Generated, Status.Edited];
    return canEditCourse(course) && editableStatuses.includes(course.status as string);
  };

  //  Render

  return (
    <>
      {/* Od lg karta vyplní výšku obrazovky (hlavička, filtry a stránkování
          zůstávají na místě), roluje jen tabulka. Pod lg stránka roluje normálně. */}
      <div className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 flex flex-col lg:min-h-0 lg:overflow-hidden">
        <div className="bg-card rounded-lg shadow-sm overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
          {/* Header */}
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-6 border-b">
            <h2 className="text-lg sm:text-2xl font-bold text-foreground">Přehled kurzů</h2>
            <Dropdown
              trigger={<span>Přidat kurz</span>}
              items={[
                { label: 'Pomocí AI', icon: <SimpleBotIcon size={18} />, gradient: true, onClick: goToAICreate },
              ]}
            />
          </div>
            {/*
          { label: 'Manuální zadání', icon: <BicepsFlexed size={18} />, onClick: openCreateCourseModal },
          { label: 'Nahrát soubor', icon: <Upload size={18} />, onClick: goToCourseUpload },
          */}

          {/* Filtry — zůstávají vykreslené i během reloadu (po akcích jako
              publikování/smazání), aby lišta nemizela a seznam neposkakoval */}
          {courses.length > 0 && (
            <CourseFilters
              value={filters}
              onChange={setFilters}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              blocks={blocks}
              targets={targets}
              subjects={subjects}
              totalCount={courses.length}
              filteredCount={filteredCourses.length}
            />
          )}

          {/* Table - Desktop. Min. výška drží pevné hranice seznamu,
              aby se blok nezkracoval při filtrování na méně řádků. */}
          <div className="hidden md:block overflow-auto min-h-[480px] lg:flex-1 lg:min-h-0">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground bg-muted/50 shadow-[inset_0_-1px_0_0_var(--border)]">Název kurzu</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground bg-muted/50 shadow-[inset_0_-1px_0_0_var(--border)]">Vlastník</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground bg-muted/50 shadow-[inset_0_-1px_0_0_var(--border)]">Počet modulů</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground bg-muted/50 shadow-[inset_0_-1px_0_0_var(--border)]">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground bg-muted/50 shadow-[inset_0_-1px_0_0_var(--border)]">Publikováno</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-foreground bg-muted/50 shadow-[inset_0_-1px_0_0_var(--border)]">Akce</th>
                </tr>
              </thead>
              {/* Klíč = stránka + řazení: po přepnutí se řádky znovu postupně objeví */}
              <tbody key={`page-${page}-${sortOrder}`} className="divide-y divide-border">
                {coursesLoading && courses.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-muted rounded w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !coursesLoading && courses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      {coursesError ?? 'Zatím nejsou žádné kurzy. Vytvořte první přes „Přidat kurz".'}
                    </td>
                  </tr>
                ) : filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Žádné kurzy neodpovídají zvoleným filtrům.
                    </td>
                  </tr>
                ) : pagedCourses.map((course, pageIndex) => {
                  const editable = canEditCourse(course);
                  const statusStr = course.status as string;
                  const generating = generation.getProgress(course.courseId);
                  const handleRowClick = () => {
                    if (generating) return; // během generování nemá rozbalení co ukázat
                    if (editable) {
                      toggleCourseExpand(course.courseId);
                    } else {
                      goToCourseContent(course.courseId);
                    }
                  };
                  return (
                    <React.Fragment key={`${page}-${course.courseId}`}>
                      <tr
                        data-accordion-keep
                        className="hover:bg-muted/50 cursor-pointer row-fade-in"
                        style={{ animationDelay: `${pageIndex * 30}ms` }}
                        onClick={handleRowClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick();
                          }
                        }}
                      >
                        <td className="px-6 py-4 text-sm text-foreground">{course.title}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{course.ownerDisplayName ?? '—'}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{getModuleCount(course)} {czechPlural(getModuleCount(course), 'modul', 'moduly', 'modulů')}</td>
                        <td className="px-6 py-4">
                          {generating ? <GeneratingBadge progress={generating} /> : <StatusBadge status={course.status} />}
                        </td>
                        <td className="px-6 py-4">
                          <PublishBadge status={course.status} isPublished={course.isPublished} />
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 text-xs flex-wrap">
                            {generating ? (
                              <span className="text-muted-foreground" title={generating.label}>Probíhá generování…</span>
                            ) : statusStr === Status.Archived ? (
                              <>
                                {/* Archived: only publish/unpublish toggle (+ delete for superadmin) */}
                                {canPublishCourse(course) && (
                                  <Button
                                    onClick={() => requestTogglePublish(course)}
                                    size="pill" variant="soft-accent"
                                  >
                                    {course.isPublished ? 'Zrušit publikování' : 'Publikovat'}
                                  </Button>
                                )}
                                {canDeleteCourse(course) && (
                                  <Button
                                    onClick={() => handleDeleteClick(course.courseId)}
                                    size="pill" variant="destructive"
                                  >
                                    Smazat
                                  </Button>
                                )}
                              </>
                            ) : course.isPublished ? (
                              <>
                                {/* Published (non-archived): archive (+ delete for superadmin) */}
                                <Button
                                  onClick={() => requestArchive(course)}
                                  disabled={statusLoading === course.courseId}
                                  size="pill" variant="soft-accent"
                                >
                                  {statusLoading === course.courseId ? 'Archivování...' : 'Archivovat'}
                                </Button>
                                {canDeleteCourse(course) && (
                                  <Button
                                    onClick={() => handleDeleteClick(course.courseId)}
                                    size="pill" variant="destructive"
                                  >
                                    Smazat
                                  </Button>
                                )}
                              </>
                            ) : (
                              <>
                                {/* Edit actions - only in editable statuses (draft/generated/edited) */}
                                {editable && statusStr !== Status.InReview && statusStr !== Status.Approved && statusStr !== Status.Failed && (
                                  <>
                                    <Button
                                      onClick={() => toggleCourseExpand(course.courseId)}
                                      size="pill" variant="soft-tip"
                                    >
                                      Úpravy
                                    </Button>
                                    <Button
                                      onClick={() => openQuickEdit(course)}
                                      size="pill" variant="soft-success"
                                    >
                                      Rychlé úpravy
                                    </Button>
                                  </>
                                )}

                                {/* Restart generování - selhaný kurz nebo koncept bez modulů */}
                                {canRetryGeneration(course) && (
                                  <Button
                                    onClick={() => requestRetryGeneration(course)}
                                    disabled={statusLoading === course.courseId}
                                    size="pill" variant="soft-tip"
                                  >
                                    <RefreshCw className="size-3" />
                                    {statusLoading === course.courseId ? 'Spouštím...' : 'Spustit znovu'}
                                  </Button>
                                )}

                                {/* Submit for review - owner can submit when in editable status */}
                                {canSubmitForReview(course) && (
                                  <Button
                                    onClick={() => requestSubmitForReview(course)}
                                    disabled={statusLoading === course.courseId}
                                    size="pill" variant="soft-tip"
                                  >
                                    {statusLoading === course.courseId ? 'Odesílání...' : 'Odeslat ke schválení'}
                                  </Button>
                                )}

                                {/* Publish - only when approved and not yet published */}
                                {canPublishCourse(course) && course.status === Status.Approved && (
                                  <Button
                                    onClick={() => requestTogglePublish(course)}
                                    size="pill" variant="soft-accent"
                                  >
                                    Publikovat
                                  </Button>
                                )}

                                {/* Revert to editing - superadmin only, when approved */}
                                {isSuperAdmin && course.status === Status.Approved && (
                                  <Button
                                    onClick={() => requestRevertToEditing(course)}
                                    disabled={statusLoading === course.courseId}
                                    size="pill" variant="soft-warning"
                                  >
                                    {statusLoading === course.courseId ? 'Zpracovávám...' : 'Vrátit do úprav'}
                                  </Button>
                                )}

                                {/* Delete - superadmin always; owner only when draft/generated */}
                                {canDeleteCourse(course) && (
                                  <Button
                                    onClick={() => handleDeleteClick(course.courseId)}
                                    size="pill" variant="destructive"
                                  >
                                    Smazat
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Quick Edit Accordion */}
                      {quickEditCourseId === course.courseId && (
                        <tr data-accordion-panel>
                          <td colSpan={6} className="bg-gradient-r/10 p-0 border-b border-gradient-r/30">
                            <div className="px-4 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gradient-r whitespace-nowrap">Rychlé úpravy:</span>
                                <Input
                                  type="text"
                                  value={quickEditData.title}
                                  onChange={(e) => setQuickEditData(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Název kurzu"
                                  maxLength={120}
                                  aria-label="Název kurzu"
                                  className={cn("h-auto", "w-44", QUICK_EDIT_INPUT_CLASS)}
                                />
                                <Input
                                  type="text"
                                  value={quickEditData.description}
                                  onChange={(e) => setQuickEditData(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Popis kurzu (vstup pro AI)"
                                  maxLength={500}
                                  aria-label="Popis kurzu"
                                  title={quickEditData.description}
                                  className={cn("h-auto", "w-56", QUICK_EDIT_INPUT_CLASS)}
                                />
                                <CatalogSelect
                                  value={quickEditData.courseBlockId}
                                  onValueChange={(next) => setQuickEditData(prev => ({ ...prev, courseBlockId: next }))}
                                  options={blocks.map((b) => ({ value: b.blockId, label: b.name }))}
                                  emptyLabel="Bez bloku"
                                  aria-label="Tematický blok"
                                  className={QUICK_EDIT_SELECT_CLASS}
                                />
                                <CatalogSelect
                                  value={quickEditData.courseTargetId}
                                  onValueChange={(next) => setQuickEditData(prev => ({ ...prev, courseTargetId: next }))}
                                  options={targets.map((t) => ({ value: t.targetId, label: t.name }))}
                                  aria-label="Cílová skupina"
                                  className={QUICK_EDIT_SELECT_CLASS}
                                />
                                <CatalogSelect
                                  value={quickEditData.courseSubjectId}
                                  onValueChange={(next) => setQuickEditData(prev => ({ ...prev, courseSubjectId: next }))}
                                  options={subjects.map((s) => ({ value: s.subjectId, label: s.name }))}
                                  emptyLabel="Bez oboru"
                                  aria-label="Předmět"
                                  className={QUICK_EDIT_SELECT_CLASS}
                                />
                                {/* Délka kurzu je vstup generátoru; popisek je součástí labelu, ať je číslo srozumitelné */}
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                  Minut
                                  <Input
                                    type="number"
                                    inputMode="numeric"
                                    min={15}
                                    max={300}
                                    step={5}
                                    value={quickEditData.durationMinutes}
                                    onChange={(e) => setQuickEditData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                                    placeholder="—"
                                    aria-label="Délka kurzu v minutách"
                                    className={cn("h-auto", "w-20", QUICK_EDIT_INPUT_CLASS)}
                                  />
                                </label>
                                <Select
                                  items={QUICK_EDIT_DIFFICULTY_ITEMS}
                                  value={quickEditData.difficulty}
                                  onValueChange={(v) => setQuickEditData(prev => ({ ...prev, difficulty: v as Difficulty }))}
                                >
                                  <SelectTrigger className={QUICK_EDIT_SELECT_CLASS} aria-label="Obtížnost">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {QUICK_EDIT_DIFFICULTY_ITEMS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={saveQuickEdit}
                                    disabled={quickEditLoading}
                                    variant="plain" className="px-3 bg-gradient-r text-primary-foreground rounded-md hover:bg-gradient-r/80"
                                  >
                                    {quickEditLoading ? 'Ukládání...' : 'Uložit'}
                                  </Button>
                                  <Button
                                    onClick={closeQuickEdit}
                                    variant="plain" className="px-3 bg-muted text-foreground rounded-md hover:bg-muted/80"
                                  >
                                    Zrušit
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expanded Module List */}
                      {expandedCourse === course.courseId && (
                        <tr data-accordion-panel>
                          <td colSpan={6} className="bg-muted/50 p-0">
                            <ExpandedModuleList
                              course={course}
                              modules={courseModules[course.courseId] || []}
                              modulesLoading={courseModules[course.courseId] === undefined && !moduleLoadErrors.has(course.courseId)}
                              modulesError={moduleLoadErrors.has(course.courseId)}
                              onRetryModules={() => retryLoadModules(course.courseId)}
                              onEditCourse={() => goToCourseContent(course.courseId)}
                              onClose={closeCourseExpand}
                              onEditModuleContent={(module) => goToCourseContent(course.courseId, module.moduleId)}
                              onEditModuleName={openEditModuleModal}
                              onToggleModuleActive={toggleModuleActive}
                              onDeleteModule={(moduleId) => {
                                setModuleToDelete(moduleId);
                                setShowDeleteConfirm(true);
                              }}
                              onAddModule={() => openCreateModuleModal(course.courseId)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div key={`mobile-page-${page}-${sortOrder}`} className="md:hidden divide-y divide-border min-h-[320px]">
            {!coursesLoading && courses.length > 0 && filteredCourses.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                Žádné kurzy neodpovídají zvoleným filtrům.
              </div>
            )}
            {pagedCourses.map((course, pageIndex) => (
              <div key={`${page}-${course.courseId}`} className="row-fade-in" style={{ animationDelay: `${pageIndex * 30}ms` }}>
              <MobileCourseCard
                course={course}
                isExpanded={expandedCourse === course.courseId}
                generating={generation.getProgress(course.courseId)}
                canRetryGeneration={canRetryGeneration(course)}
                onRetryGeneration={() => requestRetryGeneration(course)}
                modules={courseModules[course.courseId] || []}
                modulesLoading={courseModules[course.courseId] === undefined && !moduleLoadErrors.has(course.courseId)}
                modulesError={moduleLoadErrors.has(course.courseId)}
                onRetryModules={() => retryLoadModules(course.courseId)}
                onToggleExpand={() => toggleCourseExpand(course.courseId)}
                onTogglePublish={() => requestTogglePublish(course)}
                onDelete={() => handleDeleteClick(course.courseId)}
                onEditCourse={() => goToCourseContent(course.courseId)}
                onCloseExpand={closeCourseExpand}
                onEditModule={openEditModuleModal}
                onToggleModuleActive={toggleModuleActive}
                onDeleteModule={(moduleId) => {
                  setModuleToDelete(moduleId);
                  setShowDeleteConfirm(true);
                }}
                onAddModule={() => openCreateModuleModal(course.courseId)}
                onGenerateEmbeddings={() => handleGenerateEmbeddings(course.courseId)}
                embeddingGenerating={embeddingLoading === course.courseId}
                embeddingGenerated={embeddingDone.has(course.courseId)}
                canEdit={canEditCourse(course)}
                canPublish={canPublishCourse(course)}
                canDelete={canDeleteCourse(course)}
                onSubmitForReview={() => requestSubmitForReview(course)}
                canSubmitReview={canSubmitForReview(course)}
                onRevertToEditing={() => requestRevertToEditing(course)}
                onArchive={() => requestArchive(course)}
                statusLoading={statusLoading === course.courseId}
              />
              </div>
            ))}
          </div>

          {/* Paginace — viditelnost se řídí celkovým počtem kurzů (ne filtrovaným),
              aby lišta nemizela při filtrování ani během reloadu a layout držel. */}
          {courses.length > PAGE_SIZE && (
            <CoursePagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Rychlé vytvoření kurzu — vypnuto, viz `courseFormData` výše.
      <CourseModal
        isOpen={activeModal === 'course-create' || activeModal === 'course-edit'}
        mode={activeModal === 'course-create' ? 'create' : 'edit'}
        formData={courseFormData}
        blocks={blocks}
        loading={modalLoading}
        error={modalError}
        onClose={closeModal}
        onSubmit={handleCourseSubmit}
        onChange={setCourseFormData}
      />
      */}

      <ModuleModal
        isOpen={activeModal === 'module-create' || activeModal === 'module-edit'}
        mode={activeModal === 'module-create' ? 'create' : 'edit'}
        formData={moduleFormData}
        courses={courses}
        loading={modalLoading}
        error={modalError}
        onClose={closeModal}
        onSubmit={handleModuleSubmit}
        onChange={setModuleFormData}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        variant="danger"
        title="Potvrdit smazání"
        message={
          moduleToDelete
            ? 'Opravdu chcete smazat tento modul? Tato akce je nevratná.'
            : 'Opravdu chcete smazat tento kurz a všechny jeho moduly? Tato akce je nevratná.'
        }
        confirmLabel="Ano, smazat"
        loading={deleting}
        onConfirm={moduleToDelete ? handleDeleteModule : handleDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setCourseToDelete(null);
          setModuleToDelete(null);
        }}
      />

      <ConfirmModal
        isOpen={confirmConfig !== null}
        title={confirmConfig?.title ?? ''}
        message={confirmConfig?.message ?? ''}
        confirmLabel={confirmConfig?.confirmLabel}
        variant={confirmConfig?.variant}
        loading={confirmLoading}
        onConfirm={runConfirm}
        onCancel={() => setConfirmConfig(null)}
      />
    </>
  );
}

// Pomocné komponenty

// Stránkovací ovládání
function CoursePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  // Čísla stránek s výpustkami, ať ovládání není příliš dlouhé
  const pages: (number | 'ellipsis')[] = [];
  const pushRange = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pages.push(i);
  };
  if (totalPages <= 7) {
    pushRange(1, totalPages);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    pushRange(Math.max(2, page - 1), Math.min(totalPages - 1, page + 1));
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const btnBase =
    'min-w-[34px] h-[34px] px-2 flex items-center justify-center rounded-md text-sm font-medium transition-colors';

  return (
    <div data-accordion-keep className="shrink-0 flex items-center justify-between gap-3 px-3 sm:px-6 py-3 border-t bg-card">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Stránka {page} z {totalPages}
      </span>
      <nav className="flex items-center gap-1" aria-label="Stránkování">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          variant="plain" className={`${btnBase} text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Předchozí stránka"
        >
          <ChevronLeft size={16} />
        </Button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-muted-foreground select-none">…</span>
          ) : (
            <Button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              variant="plain" className={`${btnBase} ${
                p === page
                  ? 'bg-tip text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          variant="plain" className={`${btnBase} text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Další stránka"
        >
          <ChevronRight size={16} />
        </Button>
      </nav>
    </div>
  );
}

// Kostra řádků modulů během načítání. Počet řádků odhadne z `modulesCount`,
// aby panel po načtení pokud možno neposkočil.
function skeletonRowCount(course: Course) {
  return Math.min(Math.max(course.modulesCount ?? 0, 2), 6);
}

function ModuleListSkeleton({ rows, compact = false }: { rows: number; compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={compact ? 'space-y-2' : 'divide-y'}>
      <span className="sr-only">Načítám moduly…</span>
      {Array.from({ length: rows }).map((_, i) =>
        compact ? (
          <div key={i} className="bg-card rounded-md p-3 row-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-14 mt-1.5" />
            <Skeleton className="h-5 w-16 rounded-full mt-2" />
          </div>
        ) : (
          <div key={i} className="p-4 flex items-center gap-4 row-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex-1 min-w-0">
              {/* Různě dlouhé „názvy", ať kostra nepůsobí jako mřížka */}
              <Skeleton className="h-4" style={{ width: `${60 - (i % 3) * 12}%` }} />
            </div>
            <div className="w-24 shrink-0 flex justify-center">
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="w-32 shrink-0">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function ModuleListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="p-6 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-destructive">Moduly se nepodařilo načíst.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw data-icon="inline-start" />
        Zkusit znovu
      </Button>
    </div>
  );
}

function LockedEditCourseButton({ reason, className }: { reason: string; className?: string }) {
  const reasonId = useId();
  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        closeOnClick={false}
        render={
          // focusableWhenDisabled: aria-disabled místo disabled, aby hover i fokus tooltip otevřely
          <Button
            disabled
            focusableWhenDisabled
            aria-describedby={reasonId}
            variant="plain" size="lg"
            className={cn("gap-2 bg-muted text-muted-foreground rounded-md cursor-not-allowed", className)}
          />
        }
      >
        <Lock size={16} />
        Editovat kurz
        <span id={reasonId} className="sr-only">{reason}</span>
      </TooltipTrigger>
      {/* Popup je v portálu mimo panel — bez data-accordion-keep by klik do něj panel zavřel */}
      <TooltipContent data-accordion-keep>{reason}</TooltipContent>
    </Tooltip>
  );
}

interface ExpandedModuleListProps {
  course: Course;
  modules: Module[];
  modulesLoading: boolean;
  modulesError: boolean;
  onRetryModules: () => void;
  onEditCourse: () => void;
  onClose: () => void;
  onEditModuleContent: (module: Module) => void;
  onEditModuleName: (module: Module) => void;
  onToggleModuleActive: (module: Module) => void;
  onDeleteModule: (moduleId: number) => void;
  onAddModule: () => void;
}

function ExpandedModuleList({
  course,
  modules,
  modulesLoading,
  modulesError,
  onRetryModules,
  onEditCourse,
  onClose,
  onEditModuleContent,
  onEditModuleName,
  onToggleModuleActive,
  onDeleteModule,
  // onAddModule, // možnost "Přidat modul" dočasně skryta
}: ExpandedModuleListProps) {
  const lockReason = getCourseEditLockReason(course);
  return (
    <div className="p-6 view-fade-in">
      <div className="bg-card rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-foreground">Přehled modulů</h3>
          <div className="flex items-center gap-2">
            {lockReason ? (
              <LockedEditCourseButton reason={lockReason} className="px-4" />
            ) : (
              <Button
                onClick={onEditCourse}
                variant="plain" size="lg" className="px-4 bg-tip text-primary-foreground rounded-md hover:bg-tip/80"
              >
                Editovat kurz
              </Button>
            )}
            <Button onClick={onClose} variant="plain" className={cn(BTN_KEEP_BOX, "p-0 text-muted-foreground hover:text-foreground")}>
              <X size={20} />
            </Button>
          </div>
        </div>

        {modulesLoading ? (
          <ModuleListSkeleton rows={skeletonRowCount(course)} />
        ) : modulesError ? (
          <ModuleListError onRetry={onRetryModules} />
        ) : modules.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Kurz zatím nemá žádné moduly.</p>
        ) : (
        <div className="divide-y">
          {modules.map((module, index) => (
            <div
              key={module.moduleId}
              className="p-4 flex items-center gap-4 hover:bg-muted/50 row-fade-in"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground">{module.title}</div>
              </div>
              <div className="text-sm text-muted-foreground w-24 text-center shrink-0">
                Modul {index + 1}
              </div>
              <div className="w-32 shrink-0">
                <ModuleActiveBadge isActive={module.isActive} />
              </div>
              {/* Zamčený kurz: backend úpravy modulů odmítne, důvod ukazuje tlačítko nahoře */}
              {!lockReason && (
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <Button onClick={() => onEditModuleContent(module)} size="pill" variant="soft-tip">Upravit</Button>
                  <Button onClick={() => onEditModuleName(module)} size="pill" variant="soft-success">Upravit název</Button>
                  <Button onClick={() => onToggleModuleActive(module)} size="pill" variant="soft-accent">
                    {module.isActive ? 'Deaktivovat' : 'Aktivovat'}
                  </Button>
                  <Button onClick={() => onDeleteModule(module.moduleId)} size="pill" variant="destructive">Smazat</Button>
                </div>
              )}
            </div>
          ))}
        </div>
        )}

        {/* Možnost "Přidat modul" dočasně skryta
        <div className="p-4 border-t">
          <button
            onClick={onAddModule}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/80 transition-colors w-fit"
          >
            <span>Přidat modul</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-90">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        */}
      </div>
    </div>
  );
}

interface MobileCourseCardProps {
  course: Course;
  isExpanded: boolean;
  /** Průběh běžícího AI generování; null = negeneruje se */
  generating: { step: number; total: number; label: string } | null;
  canRetryGeneration: boolean;
  onRetryGeneration: () => void;
  modules: Module[];
  modulesLoading: boolean;
  modulesError: boolean;
  onRetryModules: () => void;
  onToggleExpand: () => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onEditCourse: () => void;
  onCloseExpand: () => void;
  onEditModule: (module: Module) => void;
  onToggleModuleActive: (module: Module) => void;
  onDeleteModule: (moduleId: number) => void;
  onAddModule: () => void;
  onGenerateEmbeddings: () => void;
  embeddingGenerating: boolean;
  embeddingGenerated: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onSubmitForReview: () => void;
  canSubmitReview: boolean;
  onRevertToEditing: () => void;
  onArchive: () => void;
  statusLoading: boolean;
}

function MobileCourseCard({
  course,
  isExpanded,
  generating,
  canRetryGeneration,
  onRetryGeneration,
  modules,
  modulesLoading,
  modulesError,
  onRetryModules,
  onToggleExpand,
  onTogglePublish,
  onDelete,
  onEditCourse,
  onCloseExpand,
  onEditModule,
  onToggleModuleActive,
  onDeleteModule,
  // onAddModule, // možnost "Přidat modul" dočasně skryta
  canEdit,
  canPublish,
  canDelete,
  onSubmitForReview,
  canSubmitReview,
  onRevertToEditing,
  onArchive,
  statusLoading,
}: MobileCourseCardProps) {
  const moduleCount = course.modulesCount || 0;
  const statusStr = course.status as string;
  const lockReason = getCourseEditLockReason(course);

  return (
    <div className="p-3 min-w-0">
      <div className="min-w-0">
        <h3 className="font-medium text-foreground truncate">{course.title}</h3>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {moduleCount} {czechPlural(moduleCount, 'modul', 'moduly', 'modulů')} · {course.ownerDisplayName ?? '—'}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {generating ? <GeneratingBadge progress={generating} /> : <StatusBadge status={course.status} />}
          {(course.status === Status.Approved || course.status === Status.Archived) && (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              course.isPublished ? 'bg-success/20 text-success' : 'bg-brand-accent/20 text-brand-accent'
            }`}>
              {course.isPublished ? 'Publikováno' : 'Neaktivní'}
            </span>
          )}
        </div>
      </div>

      <div data-accordion-keep className="mt-3 flex flex-wrap items-center gap-1.5">
        {generating ? (
          <span className="text-xs text-muted-foreground" title={generating.label}>Probíhá generování…</span>
        ) : statusStr === Status.Archived ? (
          <>
            {/* Archived: only publish/unpublish toggle (+ delete for superadmin) */}
            {canPublish && (
              <PublishActionButton onClick={onTogglePublish} isPublished={!!course.isPublished} iconSize={14} />
            )}
            {canDelete && (
              <DeleteActionButton onClick={onDelete} iconSize={14} />
            )}
          </>
        ) : course.isPublished ? (
          <>
            {/* Published (non-archived): only archive (+ delete for superadmin) */}
            <Button onClick={onArchive} disabled={statusLoading} variant="plain" size="icon" className={cn(BTN_KEEP_BOX, "p-2 rounded-md bg-brand-accent text-primary-foreground hover:bg-brand-accent/80")} title="Archivovat">
              <Archive size={14} />
            </Button>
            {canDelete && (
              <DeleteActionButton onClick={onDelete} iconSize={14} />
            )}
          </>
        ) : (
          <>
            {/* Edit - only in editable statuses */}
            {canEdit && statusStr !== Status.InReview && statusStr !== Status.Approved && statusStr !== Status.Failed && (
              <EditActionButton onClick={onToggleExpand} title="Zobrazit moduly" iconSize={14} />
            )}
            {canRetryGeneration && (
              <Button onClick={onRetryGeneration} disabled={statusLoading} variant="plain" size="icon" className={cn(BTN_KEEP_BOX, "p-2 rounded-md bg-tip text-primary-foreground hover:bg-tip/80")} title="Spustit generování znovu">
                <RefreshCw size={14} />
              </Button>
            )}
            {canSubmitReview && (
              <ApproveActionButton onClick={onSubmitForReview} isApproved={false} isLoading={false} iconSize={14} />
            )}
            {canPublish && course.status === Status.Approved && (
              <PublishActionButton onClick={onTogglePublish} isPublished={!!course.isPublished} iconSize={14} />
            )}
            {canDelete && course.status === Status.Approved && (
              <Button onClick={onRevertToEditing} disabled={statusLoading} variant="plain" size="icon" className={cn(BTN_KEEP_BOX, "p-2 rounded-md bg-warning text-primary-foreground hover:bg-warning/80")} title="Vrátit do úprav">
                <RotateCcw size={14} />
              </Button>
            )}
            {canDelete && (
              <DeleteActionButton onClick={onDelete} iconSize={14} />
            )}
          </>
        )}
      </div>

      {/* Expanded Module List - Mobile */}
      {isExpanded && (
        <div data-accordion-panel className="mt-4 bg-muted/50 rounded-lg p-3 view-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground text-sm">Moduly</h4>
            <Button onClick={onCloseExpand} variant="plain" className={cn(BTN_KEEP_BOX, "p-0 text-muted-foreground hover:text-foreground")}>
              <X size={18} />
            </Button>
          </div>
          {modulesLoading ? (
            <ModuleListSkeleton rows={skeletonRowCount(course)} compact />
          ) : modulesError ? (
            <ModuleListError onRetry={onRetryModules} />
          ) : modules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Kurz zatím nemá žádné moduly.</p>
          ) : (
          <div className="space-y-2">
            {modules.map((module, index) => (
              <div
                key={module.moduleId}
                className="bg-card rounded-md p-3 row-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{module.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Modul {index + 1}</p>
                    <ModuleActiveBadge isActive={module.isActive} size="sm" />
                  </div>
                  {!lockReason && (
                    <CourseActionButtons className="shrink-0">
                      <EditActionButton onClick={() => onEditModule(module)} title="Editovat" iconSize={12} />
                      <PublishActionButton onClick={() => onToggleModuleActive(module)} isPublished={!!module.isActive} title={module.isActive ? 'Deaktivovat' : 'Aktivovat'} iconSize={12} />
                      <DeleteActionButton onClick={() => onDeleteModule(module.moduleId)} title="Smazat" iconSize={12} />
                    </CourseActionButtons>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
          {/* Možnost "Přidat modul" dočasně skryta
          <Button
            onClick={onAddModule}
            variant="plain" size="lg" className="mt-3 gap-2 px-3 w-full bg-primary text-primary-foreground rounded-md hover:bg-primary/80"
          >
            <span>Přidat modul</span>
          </Button>
          */}
          {lockReason ? (
            <LockedEditCourseButton reason={lockReason} className="mt-2 px-3 w-full" />
          ) : (
            <Button
              onClick={onEditCourse}
              variant="plain" size="lg" className="mt-2 gap-2 px-3 w-full bg-tip text-primary-foreground rounded-md hover:bg-tip/80"
            >
              Editovat kurz
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CoursesListView;
