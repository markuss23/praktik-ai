import {
  Configuration,
  CoursesApi,
  ModulesApi,
  ActivitiesApi,
  AgentsApi,
  CatalogsApi,
  AuthenticationApi,
  EnrollmentsApi,
  FeedbacksApi,
  ResourcesApi,
  ReviewsApi,
  RatingsApi,
  CollectionsApi,
  CourseUpdate,
  UpdateCourseStatusStatusEnum,
  LearnBlockCreate,
  LearnBlockUpdate,
  ModuleCreate,
  ModuleUpdate,
  AssessmentsApi,
  ResponseError,
  ClosedQuestionsSettingsFromJSON,
  ClosedQuestionsSettingsToJSON,
  ClosedQuestionsAISettingsFromJSON,
  ClosedQuestionsAISettingsToJSON,
  OpenQuestionAISettingsFromJSON,
  OpenQuestionAISettingsToJSON,
  SocraticDialogAISettingsFromJSON,
  SocraticDialogAISettingsToJSON,
  type AssessmentContext,
  type ClosedQuestionsSettings,
  type ClosedQuestionsAISettings,
  type SocraticDialogAISettings,
  type MentorScope,
  type PretestSettings,
  type SessionStartResponse,
  type Middleware,
  type PubResourceCreate,
  type PubResourceUpdate,
  type PubResourceCreateFork,
  type PubResourceCreated,
  type ListResourcesRequest,
  type PubResource,
  type PubResourceReview,
  type PubResourceReviewCreate,
  type PubResourceRatingCreated,
  type PubCollectionCreate,
  type PubCollectionUpdate,
  type PubCollectionCreated,
  type PubCollectionDetail,
  UpdateResourceStatusNewStatusEnum,
} from "@/api";
import { API_BASE_URL, backendUrl } from "./constants";
import { saveBlob } from "./download";
import { getValidAccessToken } from "./keycloak";
import { readApiErrorStatus } from "./api-error";


const authMiddleware: Middleware = {
  pre: async (context) => {
    const token = await getValidAccessToken();
    if (token) {
      context.init.headers = {
        ...(context.init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      };
    }
    return context;
  },
};

const configuration = new Configuration({
  basePath: API_BASE_URL,
  middleware: [authMiddleware],
});

export const coursesApi = new CoursesApi(configuration);
export const modulesApi = new ModulesApi(configuration);
export const activitiesApi = new ActivitiesApi(configuration);
export const agentsApi = new AgentsApi(configuration);
export const catalogsApi = new CatalogsApi(configuration);
export const authApi = new AuthenticationApi(configuration);
export const enrollmentsApi = new EnrollmentsApi(configuration);
export const feedbacksApi = new FeedbacksApi(configuration);
export const resourcesApi = new ResourcesApi(configuration);
export const reviewsApi = new ReviewsApi(configuration);
export const ratingsApi = new RatingsApi(configuration);
export const collectionsApi = new CollectionsApi(configuration);
export const assessmentsApi = new AssessmentsApi(configuration);

// ============ Auth / Current User ============

export async function getMe() {
  return authApi.getCurrentUser();
}

export async function getAiStyles() {
  return catalogsApi.listAiStyles();
}

export async function getMyAiStyle(): Promise<Record<string, string>> {
  const style = await authApi.getProfileAiStyle();
  return Object.fromEntries(
    Object.entries(style).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

export async function updateMyAiStyle(choice: Record<string, string>) {
  return authApi.updateProfileAiStyle({ requestBody: choice });
}

export async function updateProfileName(displayName: string) {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/auth/profile/name`), {
    method: 'PUT',
    headers,
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Course API functions
export async function getCourses(params?: {
  includeInactive?: boolean;
  isPublished?: boolean;
  textSearch?: string;
  courseBlockId?: number;
  courseSubjectId?: number;
}) {
  return coursesApi.listCourses({
    includeInactive: params?.includeInactive,
    isPublished: params?.isPublished,
    textSearch: params?.textSearch,
    courseBlockId: params?.courseBlockId,
    courseSubjectId: params?.courseSubjectId,
  });
}

export async function getCourse(courseId: number) {
  return coursesApi.getCourse({ courseId });
}

export async function createCourse(data: {
  title: string;
  description?: string;
  modulesCountAiGenerated?: number;
  durationMinutes?: number;
  courseBlockId?: number | null;
  courseTargetId?: number | null;
  courseSubjectId?: number | null;
  courseRequirementId?: number | null;
  courseEqfLevelId: number;
  courseTypeId: number;
  difficulty?: import('@/api').Difficulty;
  krauuCompetenceIds: number[];
  bloomLevelIds: number[];
  crossSubjectIds?: number[];
}) {
  return coursesApi.createCourse({
    courseCreate: {
      title: data.title,
      description: data.description,
      modulesCountAiGenerated: data.modulesCountAiGenerated ?? 3,
      durationMinutes: data.durationMinutes,
      courseBlockId: data.courseBlockId,
      courseTargetId: data.courseTargetId,
      courseSubjectId: data.courseSubjectId,
      courseRequirementId: data.courseRequirementId,
      courseEqfLevelId: data.courseEqfLevelId,
      courseTypeId: data.courseTypeId,
      difficulty: data.difficulty,
      krauuCompetenceIds: data.krauuCompetenceIds,
      bloomLevelIds: data.bloomLevelIds,
      crossSubjectIds: data.crossSubjectIds,
    },
  });
}

export async function updateCourse(courseId: number, data: CourseUpdate) {
  return coursesApi.updateCourse({
    courseId,
    courseUpdate: data,
  });
}

// Module API functions
export async function getModules(params?: {
  includeInactive?: boolean;
  textSearch?: string;
  courseId?: number;
}) {
  return modulesApi.listModules({
    includeInactive: params?.includeInactive,
    textSearch: params?.textSearch,
    courseId: params?.courseId,
  });
}

export async function getModule(moduleId: number) {
  return modulesApi.getModule({ moduleId });
}

export async function createModule(data: ModuleCreate) {
  return modulesApi.createModule({ moduleCreate: data });
}

export async function updateModule(moduleId: number, data: ModuleUpdate) {
  return modulesApi.updateModule({
    moduleId,
    moduleUpdate: data,
  });
}

// File upload API functions
export async function uploadCourseFile(courseId: number, file: File) {
  return coursesApi.uploadCourseFile({
    courseId,
    file: file as Blob,
  });
}

export async function deleteCourseFile(courseId: number, fileId: number) {
  return coursesApi.deleteCourseFile({ courseId, fileId });
}

export interface CourseFileItem {
  fileId: number;
  courseId: number;
  filename: string;
  filePath: string;
}

export async function listCourseFiles(courseId: number): Promise<CourseFileItem[]> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/courses/${courseId}/files`), {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((f: { file_id: number; course_id: number; filename: string; file_path: string }) => ({
        fileId: f.file_id,
        courseId: f.course_id,
        filename: f.filename,
        filePath: f.file_path,
      }))
    : [];
}

/** Stáhne podkladový soubor kurzu a vyvolá download dialog v prohlížeči. */
export async function downloadCourseFile(courseId: number, fileId: number, filename: string): Promise<void> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/courses/${courseId}/files/${fileId}/download`), {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  saveBlob(await res.blob(), filename);
}

export async function deleteCourse(courseId: number) {
  return coursesApi.deleteCourse({ courseId });
}

// Náhledový obrázek kurzu — backend ho vždy uloží jako 1280×720 WebP.
export async function uploadCourseImage(courseId: number, image: Blob) {
  const file = image instanceof File ? image : new File([image], 'cover.jpg', { type: image.type || 'image/jpeg' });
  return coursesApi.uploadCourseImage({ courseId, file });
}

export async function deleteCourseImage(courseId: number) {
  return coursesApi.deleteCourseImage({ courseId });
}

/** Spustí AI generování coveru na pozadí; hotový obrázek backend rovnou nastaví kurzu. */
export async function generateCourseImage(courseId: number) {
  return agentsApi.generateCourseImages({ courseId });
}

export async function getCourseImageGenerationProgress(courseId: number) {
  return agentsApi.getCourseImageGenerationProgress({ courseId });
}

// AI Agent API functions
export async function generateCourseWithAI(courseId: number) {
  return agentsApi.generateCourse({ courseId });
}

/**
 * Dotaz na AI mentora. `scope: 'module'` hledá podklady a historii v learn
 * blocku (povinné `learnBlockId`), `'course'` v celém kurzu (stačí `courseId`).
 * Historii konverzace si backend vede sám, zvlášť pro modul a pro kurz.
 */
export async function mentorChat(params: {
  scope: MentorScope;
  courseId: number;
  learnBlockId?: number;
  message: string;
}) {
  return agentsApi.learnBlocksChat({
    learnBlocksChatRequest: {
      courseId: params.courseId,
      learnBlockId: params.scope === 'module' ? params.learnBlockId : undefined,
      message: params.message,
    },
    scope: params.scope,
  });
}

export async function generateCourseEmbeddings(courseId: number) {
  return agentsApi.generateCourseEmbeddings({ courseId });
}

// Wiki agent API functions
//
// /agents/wiki-chat a /agents/wiki-sync zatím nejsou v generovaném klientovi
// (src/api se generuje z běžícího backendu) — voláme je přímo fetchem se
// stejným tokenem, stejně jako course-progress níže. Po `npm run
// generate:openapi` je lze nahradit `agentsApi.wikiChat()` / `wikiSync()`.

async function agentsPost<T>(path: string, body?: unknown, fallback?: string): Promise<T> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(backendUrl(path), {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = fallback ?? `Požadavek selhal (${res.status})`;
    try {
      const parsed = await res.json();
      if (parsed?.detail) detail = typeof parsed.detail === 'string' ? parsed.detail : detail;
    } catch {
      // odpověď nemusí být JSON
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

/**
 * Dotaz na wiki agenta. Endpoint je bezstavový — historii konverzace si
 * drží klient, backend dostane vždy jen aktuální zprávu.
 */
export async function wikiChat(message: string): Promise<string> {
  const data = await agentsPost<{ answer: string }>(
    '/api/v1/agents/wiki-chat',
    { message },
    'Nepodařilo se získat odpověď od AI asistenta.',
  );
  return data.answer;
}

export interface WikiSyncResult {
  pagesProcessed: number;
  message: string;
}

/**
 * Ruční synchronizace a re-indexace wiki (jen superadmin). Na pozadí běží
 * i periodicky — interval nastavuje `WIKI__SYNC_INTERVAL_HOURS`.
 */
export async function wikiSync(): Promise<WikiSyncResult> {
  const data = await agentsPost<{ pages_processed: number; message: string }>(
    '/api/v1/agents/wiki-sync',
    undefined,
    'Synchronizace wiki selhala.',
  );
  return { pagesProcessed: data.pages_processed, message: data.message };
}

export interface CourseGenerationProgress {
  step: number;
  total: number;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error: string | null;
}

export async function getCourseGenerationProgress(courseId: number): Promise<CourseGenerationProgress> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/agents/course-progress/${courseId}`), {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** ID kurzů, jejichž generování právě běží na serveru (pro obnovu sledování po refreshi). */
export async function listActiveCourseGenerations(): Promise<number[]> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/agents/active-course-generations`), {
    method: 'GET',
    headers,
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return [];
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: unknown = await res.json();
  return Array.isArray(data) ? data.filter((v): v is number => typeof v === 'number') : [];
}

//  Course Status & Published API functions 

export async function updateCoursePublished(courseId: number, isPublished: boolean) {
  return coursesApi.updateCoursePublished({ courseId, isPublished });
}

export async function updateCourseStatus(courseId: number, status: UpdateCourseStatusStatusEnum) {
  return coursesApi.updateCourseStatus({ courseId, status });
}

//  Course Links API functions 

export async function createCourseLink(courseId: number, url: string) {
  return coursesApi.createCourseLink({ courseId, url });
}

export async function listCourseLinks(courseId: number) {
  return coursesApi.listCourseLinks({ courseId });
}

export async function deleteCourseLink(courseId: number, linkId: number) {
  return coursesApi.deleteCourseLink({ courseId, linkId });
}

//  Catalogs API functions 

export async function getCourseBlocks() {
  return catalogsApi.listCourseBlocks();
}

export async function getCourseTargets() {
  return catalogsApi.listCourseTargets();
}

export async function getCourseSubjects() {
  return catalogsApi.listCourseSubjects();
}

export async function getCourseRequirements() {
  return catalogsApi.listCourseRequirements();
}

export async function getCourseEqfLevels() {
  return catalogsApi.listCourseEqfLevels();
}

export async function getCourseTypes() {
  return catalogsApi.listCourseTypes();
}

export async function getNeuroPrinciples() {
  return catalogsApi.listNeuroPrinciples();
}

export async function getKrauuCompetences() {
  return catalogsApi.listKrauuCompetences();
}

export async function getBloomLevels() {
  return catalogsApi.listBloomLevels();
}

export async function getCrossSubjects() {
  return catalogsApi.listCrossSubjects();
}

//  Activities API functions 

export async function createLearnBlock(data: LearnBlockCreate) {
  return activitiesApi.createLearnBlock({ learnBlockCreate: data });
}

export async function updateLearnBlock(learnId: number, data: LearnBlockUpdate) {
  return activitiesApi.updateLearnBlock({ learnId, learnBlockUpdate: data });
}

//  Enrollments API functions

/** Naposledy obohacený zápis: server vrací cíl pro „pokračuj" a heatmapě
 * stačí lišta s `lastActivityAt`. Tyto poli jsou volitelná, aby fungovala
 * koexistence se starým API clientem před regenerací. */
export interface MyEnrollmentExtended {
  enrollmentId: number;
  courseId: number;
  course: {
    courseId: number;
    title: string;
    description?: string | null;
    modulesCount?: number;
    /** Náhledový obrázek z API; null = výchozí obrázek. */
    imageUrl?: string | null;
  };
  completedModules?: number;
  totalModules?: number;
  enrolledAt: Date;
  completedAt?: Date | null;
  nextModule?: {
    moduleId: number;
    title: string;
    index: number;
    total: number;
  } | null;
  lastVisitedModuleId?: number | null;
  lastActivityAt?: Date | null;
}

function parseMyEnrollment(raw: Record<string, unknown>): MyEnrollmentExtended {
  const course = raw['course'] as Record<string, unknown>;
  const next = raw['next_module'] as Record<string, unknown> | null | undefined;
  return {
    enrollmentId: raw['enrollment_id'] as number,
    courseId: raw['course_id'] as number,
    course: {
      courseId: course['course_id'] as number,
      title: course['title'] as string,
      description: (course['description'] as string | null | undefined) ?? null,
      modulesCount: (course['modules_count'] as number | undefined) ?? 0,
      imageUrl: (course['image_url'] as string | null | undefined) ?? null,
    },
    completedModules: (raw['completed_modules'] as number | undefined) ?? 0,
    totalModules: (raw['total_modules'] as number | undefined) ?? 0,
    enrolledAt: new Date(raw['enrolled_at'] as string),
    completedAt: raw['completed_at'] ? new Date(raw['completed_at'] as string) : null,
    nextModule: next
      ? {
          moduleId: next['module_id'] as number,
          title: next['title'] as string,
          index: next['index'] as number,
          total: next['total'] as number,
        }
      : null,
    lastVisitedModuleId: (raw['last_visited_module_id'] as number | null | undefined) ?? null,
    lastActivityAt: raw['last_activity_at']
      ? new Date(raw['last_activity_at'] as string)
      : null,
  };
}

// Několik komponent si zápisy vyžádá naráz (profil sám + ProfileTicketsCard
// přes listMyTickets, detail kurzu + CourseSection...). Sdílíme jen *rozběhnutý*
// request — jakmile doběhne, reference se zahodí, takže žádná odpověď se
// necachuje a každé nové volání jde znovu na server jako dosud.
let _myEnrollmentsInFlight: Promise<MyEnrollmentExtended[]> | null = null;

export async function getMyEnrollments(): Promise<MyEnrollmentExtended[]> {
  if (_myEnrollmentsInFlight) return _myEnrollmentsInFlight;

  _myEnrollmentsInFlight = (async () => {
    const token = await getValidAccessToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(backendUrl(`/api/v1/enrollments/my`), {
      method: 'GET',
      headers,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>[];
    return Array.isArray(data) ? data.map(parseMyEnrollment) : [];
  })();

  try {
    return await _myEnrollmentsInFlight;
  } finally {
    _myEnrollmentsInFlight = null;
  }
}

/** Tichý tracking: označí, že uživatel právě otevřel daný modul. Server
 * updatuje last_visited_module_id + last_activity_at na enrollmentu. */
export async function markModuleVisited(moduleId: number): Promise<void> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    await fetch(backendUrl(`/api/v1/enrollments/my/visit/${moduleId}`), {
      method: 'POST',
      headers,
    });
  } catch {
    // Visit tracking je fire-and-forget — nikdy by neměl rozbít UI.
  }
}

export interface ActivityDay {
  date: string; // ISO yyyy-mm-dd
  count: number;
  titles: string[];
}

export interface ActivityResponse {
  days: ActivityDay[];
  fromDate: string;
  toDate: string;
}

export interface ActivityRangeOptions {
  /** ISO yyyy-mm-dd start date. Pokud je předáno spolu s `toDate`, `days` se ignoruje. */
  fromDate?: string;
  /** ISO yyyy-mm-dd end date. */
  toDate?: string;
  /** Fallback rozsah: posledních N dnů od dneška. Default 180. Max 400. */
  days?: number;
}

export async function getMyActivity(
  opts: ActivityRangeOptions = {},
): Promise<ActivityResponse> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const params = new URLSearchParams();
  if (opts.fromDate && opts.toDate) {
    params.set('from_date', opts.fromDate);
    params.set('to_date', opts.toDate);
  } else {
    params.set('days', String(opts.days ?? 180));
  }

  const res = await fetch(
    backendUrl(`/api/v1/enrollments/my/activity?${params.toString()}`),
    { method: 'GET', headers },
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  const rawDays = (data['days'] as Record<string, unknown>[]) ?? [];
  return {
    days: rawDays.map((d) => ({
      date: d['date'] as string,
      count: d['count'] as number,
      titles: (d['titles'] as string[]) ?? [],
    })),
    fromDate: data['from_date'] as string,
    toDate: data['to_date'] as string,
  };
}

export async function getRecommendedCourses(limit: number = 3) {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/courses/recommended?limit=${limit}`), {
    method: 'GET',
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  // Server vrací list[Course]; necháváme generovaný runtime to dekódovat.
  // Pro typovou kompatibilitu importujeme generovaný Course.
  const { CourseFromJSON } = await import('@/api');
  const data = (await res.json()) as Record<string, unknown>[];
  return data.map((c) => CourseFromJSON(c));
}

export async function listEnrollments(params?: {
  courseId?: number;
  userId?: number;
  includeInactive?: boolean;
}) {
  return enrollmentsApi.listEnrollments({
    courseId: params?.courseId,
    userId: params?.userId,
    includeInactive: params?.includeInactive,
  });
}

export async function createEnrollment(userId: number, courseId: number) {
  return enrollmentsApi.createEnrollment({
    enrollmentCreate: { userId, courseId },
  });
}

export async function leaveEnrollment(enrollmentId: number) {
  return enrollmentsApi.leaveEnrollment({ enrollmentId });
}

//  Assessments API functions (pretest, practice, assessment, course_final)

/** Co má student v kurzu splněné: testy po modulech, hotové moduly a kurz. */
export async function getAssessmentProgress(courseId: number) {
  return assessmentsApi.getAssessmentCourseProgress({ courseId });
}

/** Odevzdané i rozběhnuté sessions studenta v kurzu, nejnovější první. */
export async function getAssessmentHistory(courseId: number) {
  return assessmentsApi.getAssessmentSessionHistory({ courseId });
}

/** Který test: kontext, u modulových i modul; kód formátu, když jich je v kontextu víc. */
export interface AssessmentTarget {
  courseId: number;
  context: AssessmentContext;
  moduleId?: number | null;
  assessmentTypeCode?: string | null;
}

/** Rozběhnutá session testu; null = žádná neběží. */
export async function getCurrentAssessmentSession(target: AssessmentTarget): Promise<SessionStartResponse | null> {
  try {
    return await assessmentsApi.getCurrentAssessmentSession(target);
  } catch (err) {
    if (readApiErrorStatus(err) === 404) return null;
    throw err;
  }
}

/** Založí session a vrátí první otázku; rozběhnutou session vrátí místo nové. */
export async function startAssessmentSession(target: AssessmentTarget) {
  return assessmentsApi.startAssessmentSession(target);
}

/** Odpověď na aktuální otázku. Uzavřená otázka pretestu = index možnosti, ostatní formáty = text možnosti. */
export async function submitAssessmentAnswer(sessionId: number, answer: string) {
  return assessmentsApi.submitAssessmentAnswer({ sessionId, answer });
}

// Lektor — formáty připojené ke kurzu
//
// Generovaný `Settings` je sloučený union všech formátů a jeho (de)serializace
// vyžaduje pole pretestu (`closed`, `open`) — u ostatních formátů spadne. Proto
// se konfigurace čtou z `raw` odpovědi a nastavení převádí podle kódu formátu.

/** Nastavení formátu (kromě pretestu); každý formát vyplní jen svá pole. */
export type AssessmentFormatSettings = ClosedQuestionsSettings & ClosedQuestionsAISettings & SocraticDialogAISettings;

type SettingsConverter = {
  fromJson: (json: unknown) => AssessmentFormatSettings;
  toJson: (settings: AssessmentFormatSettings) => unknown;
};

const FORMAT_SETTINGS: Record<string, SettingsConverter> = {
  closed_questions: { fromJson: ClosedQuestionsSettingsFromJSON, toJson: ClosedQuestionsSettingsToJSON },
  closed_questions_ai: { fromJson: ClosedQuestionsAISettingsFromJSON, toJson: ClosedQuestionsAISettingsToJSON },
  open_question_ai: { fromJson: OpenQuestionAISettingsFromJSON, toJson: OpenQuestionAISettingsToJSON },
  socratic_dialog_ai: { fromJson: SocraticDialogAISettingsFromJSON, toJson: SocraticDialogAISettingsToJSON },
};

/** Null u pretestu (obsah přes getPretestContent) a u formátu, který frontend nezná. */
function formatSettingsFromJson(code: string, json: unknown): AssessmentFormatSettings | null {
  const converter = FORMAT_SETTINGS[code];
  return converter && json != null ? converter.fromJson(json) : null;
}

export interface AssessmentFormat {
  code: string;
  name: string;
  description: string | null;
  allowedContexts: AssessmentContext[];
  defaultSettings: AssessmentFormatSettings | null;
}

export interface CourseAssessmentConfig {
  courseAssessmentId: number;
  courseId: number;
  moduleId: number | null;
  assessmentTypeCode: string;
  context: AssessmentContext;
  isEnabled: boolean;
  isRequired: boolean;
  settings: AssessmentFormatSettings | null;
}

function courseAssessmentFromJson(json: Record<string, unknown>): CourseAssessmentConfig {
  const code = String(json.assessment_type_code);
  return {
    courseAssessmentId: Number(json.course_assessment_id),
    courseId: Number(json.course_id),
    moduleId: json.module_id == null ? null : Number(json.module_id),
    assessmentTypeCode: code,
    context: json.context as AssessmentContext,
    isEnabled: Boolean(json.is_enabled),
    isRequired: Boolean(json.is_required),
    settings: formatSettingsFromJson(code, json.settings),
  };
}

/** Katalog formátů (jen lektor) — povolené kontexty a výchozí nastavení. */
export async function listAssessmentFormats(): Promise<AssessmentFormat[]> {
  const res = await assessmentsApi.listAssessmentTypesRaw();
  const data = (await res.raw.json()) as Record<string, unknown>[];
  return data.map((json) => {
    const code = String(json.code);
    return {
      code,
      name: String(json.name),
      description: typeof json.description === 'string' ? json.description : null,
      allowedContexts: (json.allowed_contexts ?? []) as AssessmentContext[],
      defaultSettings: formatSettingsFromJson(code, json.default_settings),
    };
  });
}

/** Formáty připojené ke kurzu včetně vypnutých (jen vlastník kurzu a superadmin). */
export async function listCourseAssessments(courseId: number): Promise<CourseAssessmentConfig[]> {
  const res = await assessmentsApi.listCourseAssessmentsRaw({ courseId });
  const data = (await res.raw.json()) as Record<string, unknown>[];
  return data.map(courseAssessmentFromJson);
}

export async function attachCourseAssessment(
  courseId: number,
  body: { assessmentTypeCode: string; context: AssessmentContext; moduleId: number | null; isRequired: boolean },
): Promise<CourseAssessmentConfig> {
  const res = await assessmentsApi.attachCourseAssessmentRaw({
    courseId,
    courseAssessmentAttachRequest: { ...body, isEnabled: true },
  });
  return courseAssessmentFromJson((await res.raw.json()) as Record<string, unknown>);
}

/** Uloží nastavení formátu — posílá se celý objekt. Pretest se mění přes updatePretestContent. */
export async function updateCourseAssessment(
  config: Pick<CourseAssessmentConfig, 'courseAssessmentId' | 'assessmentTypeCode' | 'isEnabled' | 'isRequired'>,
  settings: AssessmentFormatSettings,
): Promise<CourseAssessmentConfig> {
  const converter = FORMAT_SETTINGS[config.assessmentTypeCode];
  if (!converter) throw new Error(`Nastavení formátu ${config.assessmentTypeCode} nejde upravit.`);

  const token = await getValidAccessToken();
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/assessments/${config.courseAssessmentId}`), {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      settings: converter.toJson(settings),
      is_enabled: config.isEnabled,
      is_required: config.isRequired,
    }),
  });
  // ResponseError jako u generovaného klienta — chybu pak přečte readApiErrorDetail
  if (!res.ok) throw new ResponseError(res, 'Response returned an error code');
  return courseAssessmentFromJson((await res.json()) as Record<string, unknown>);
}

/** Odpojí formát od kurzu (soft delete); pretest odpojit nejde. */
export async function detachCourseAssessment(courseAssessmentId: number) {
  return assessmentsApi.detachCourseAssessment({ courseAssessmentId });
}

/** Otázky pretestu modulu (pevně 2 uzavřené + 1 otevřená) se správnými odpověďmi. */
export async function getPretestContent(courseAssessmentId: number) {
  return assessmentsApi.getPretestContent({ courseAssessmentId });
}

export async function updatePretestContent(courseAssessmentId: number, content: PretestSettings) {
  return assessmentsApi.updatePretestContent({ courseAssessmentId, pretestSettings: content });
}

//  Feedbacks API functions 

export async function getFeedbackSection(courseId: number) {
  return feedbacksApi.getFeedbackSection({ courseId });
}

export async function createFeedback(
  moduleId: number,
  feedback: string,
  opts?: { contentType?: string; contentRef?: string },
) {
  return feedbacksApi.createFeedback({
    feedbackCreate: {
      moduleId,
      feedback,
      contentType: opts?.contentType,
      contentRef: opts?.contentRef,
    },
  });
}

export async function replyToFeedback(feedbackId: number, reply: string) {
  return feedbacksApi.replyToFeedback({ feedbackId, feedbackReply: { reply } });
}

export async function resolveFeedback(feedbackId: number, isResolved: boolean) {
  return feedbacksApi.resolveFeedback({ feedbackId, feedbackResolve: { isResolved } });
}

export async function deleteFeedback(feedbackId: number) {
  return feedbacksApi.deleteFeedback({ feedbackId });
}

//  System Settings (Superadmin) API functions 

export interface SystemSettingResponse {
  settingId: number;
  name: string;
  key: string;
  model: string;
  prompt: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingUpdate {
  name?: string;
  model?: string;
  prompt?: string;
  description?: string;
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(path), { ...options, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function mapSettingFromApi(raw: Record<string, unknown>): SystemSettingResponse {
  return {
    settingId: raw['setting_id'] as number,
    name: raw['name'] as string,
    key: raw['key'] as string,
    model: raw['model'] as string,
    prompt: raw['prompt'] as string,
    description: (raw['description'] as string) ?? null,
    createdAt: raw['created_at'] as string,
    updatedAt: raw['updated_at'] as string,
  };
}

export async function listSystemSettings(): Promise<SystemSettingResponse[]> {
  const data = await fetchWithAuth('/api/v1/superadmin/settings');
  return (data as Record<string, unknown>[]).map(mapSettingFromApi);
}

export async function updateSystemSetting(
  settingId: number,
  update: SystemSettingUpdate,
): Promise<SystemSettingResponse> {
  const data = await fetchWithAuth(`/api/v1/superadmin/settings/${settingId}`, {
    method: 'PUT',
    body: JSON.stringify(update),
  });
  return mapSettingFromApi(data as Record<string, unknown>);
}

//  Public Resources (Veřejná databáze) API functions

export async function listResources(params: ListResourcesRequest = {}): Promise<PubResource[]> {
  return resourcesApi.listResources(params);
}

export async function getResource(resourceId: number): Promise<PubResource> {
  return resourcesApi.getResource({ resourceId });
}

export async function createResource(data: PubResourceCreate): Promise<PubResource> {
  const created = await resourcesApi.createResource({ pubResourceCreate: data });
  return resourcesApi.getResource({ resourceId: created.resourceId });
}

export async function updateResource(
  resourceId: number,
  data: PubResourceUpdate,
): Promise<PubResource> {
  return resourcesApi.updateResource({ resourceId, pubResourceUpdate: data });
}

export async function deleteResource(resourceId: number): Promise<void> {
  await resourcesApi.deleteResource({ resourceId });
}

// Změna stavu materiálu (např. draft → pending_review = odeslání ke schválení)
export async function updateResourceStatus(
  resourceId: number,
  newStatus: UpdateResourceStatusNewStatusEnum,
): Promise<PubResource> {
  return resourcesApi.updateResourceStatus({ resourceId, newStatus });
}

// Publikace / skrytí schváleného materiálu (jen vlastník nebo superadmin).
export async function updateResourcePublicState(
  resourceId: number,
  isPublished: boolean,
): Promise<PubResource> {
  return resourcesApi.updateResourcePublicState({ resourceId, isPublished });
}

export async function uploadResourceFile(resourceId: number, file: File) {
  return resourcesApi.uploadResourceFile({ resourceId, file: file as Blob });
}

// v DB je jen klíč v SeaweedFS, ne veřejná URL- zatím není v generovaném klientovi, voláme ho tedy přes fetch.
export async function fetchResourceFileBlob(
  resourceId: number,
  fileId: number,
): Promise<Blob> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(
    backendUrl(`/api/v1/resources/${resourceId}/files/${fileId}`),
    { method: 'GET', headers },
  );
  if (!res.ok) {
    let detail = `Stažení selhalo (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // odpověď nemusí být JSON
    }
    throw new Error(detail);
  }
  return res.blob();
}

/** Stáhne přílohu materiálu a vyvolá download dialog v prohlížeči. */
export async function downloadResourceFile(
  resourceId: number,
  fileId: number,
  filename: string,
): Promise<void> {
  saveBlob(await fetchResourceFileBlob(resourceId, fileId), filename);
}

// Vytvoří fork
export async function createResourceFork(
  resourceId: number,
  data: PubResourceCreateFork,
): Promise<PubResourceCreated> {
  return resourcesApi.createResourceFork({ resourceId, pubResourceCreateFork: data });
}

export async function deleteResourceFile(resourceId: number, fileId: number) {
  return resourcesApi.deleteResourceFile({ resourceId, fileId });
}

//  Public Resource Reviews (recenze materiálů) API functions

export async function listResourceReviews(resourceId: number): Promise<PubResourceReview[]> {
  return reviewsApi.listReviews({ resourceId });
}

// Vytvoří recenzi (verdikt + poznámka) a podle verdiktu změní stav materiálu.
export async function createResourceReview(
  resourceId: number,
  data: PubResourceReviewCreate,
): Promise<PubResource> {
  return reviewsApi.createReview({ resourceId, pubResourceReviewCreate: data });
}

//  Editor Images (obrázky vkládané v rich-text editoru) API functions
//
//  Tento endpoint zatím není v generovaném klientovi – voláme ho přímo přes
//  fetch se stejným tokenem jako generovaný klient.

export interface EditorImageUploadResult {
  url: string;
}

export async function uploadEditorImage(file: File): Promise<EditorImageUploadResult> {
  const token = await getValidAccessToken();
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(backendUrl("/api/v1/editor-images"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) {
    let detail = `Nahrání selhalo (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // odpověď nemusí být JSON
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { url: string };
  return { url: backendUrl(data.url) };
}

//  Public Resource Comments (komentáře ke schvalování) API functions
//
//  Tyto endpointy zatím nejsou v generovaném klientovi – voláme je přímo
//  přes fetch se stejným tokenem jako generovaný klient. Po `npm run
//  generate:openapi` je lze nahradit generovaným ResourcesApi voláním.

export interface ResourceComment {
  commentId: number;
  resourceId: number;
  authorId: number;
  authorDisplayName: string | null;
  comment: string;
  createdAt: Date;
  isActive: boolean;
}

function mapResourceComment(json: Record<string, unknown>): ResourceComment {
  return {
    commentId: json["comment_id"] as number,
    resourceId: json["resource_id"] as number,
    authorId: json["author_id"] as number,
    authorDisplayName: (json["author_display_name"] as string | null) ?? null,
    comment: json["comment"] as string,
    createdAt: new Date(json["created_at"] as string),
    isActive: json["is_active"] as boolean,
  };
}

async function resourceCommentsFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getValidAccessToken();
  const res = await fetch(backendUrl(path), {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let detail = `Požadavek selhal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // odpověď nemusí být JSON
    }
    throw new Error(detail);
  }
  return res;
}

export async function listResourceComments(resourceId: number): Promise<ResourceComment[]> {
  const res = await resourceCommentsFetch(`/api/v1/resources/${resourceId}/comments`);
  const data = (await res.json()) as Record<string, unknown>[];
  return data.map(mapResourceComment);
}

export async function createResourceComment(
  resourceId: number,
  comment: string,
): Promise<ResourceComment> {
  const res = await resourceCommentsFetch(`/api/v1/resources/${resourceId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
  });
  return mapResourceComment((await res.json()) as Record<string, unknown>);
}

export async function deleteResourceComment(
  resourceId: number,
  commentId: number,
): Promise<void> {
  await resourceCommentsFetch(`/api/v1/resources/${resourceId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

//  Public Resource Ratings (hodnocení materiálů hvězdičkami) API functions

/** Vytáhne český `detail` z chybové odpovědi generovaného klienta (ResponseError). */
export async function apiErrorDetail(err: unknown, fallback: string): Promise<string> {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: unknown }).response;
    if (response instanceof Response) {
      try {
        const body = await response.clone().json();
        if (typeof body?.detail === "string") return body.detail;
      } catch {
        // odpověď nemusí být JSON
      }
    }
  }
  return fallback;
}

export async function listResourceRatings(
  resourceId: number,
): Promise<PubResourceRatingCreated[]> {
  return ratingsApi.getResourceRatings({ resourceId });
}

export async function createResourceRating(
  resourceId: number,
  score: number,
  comment?: string | null,
): Promise<PubResourceRatingCreated> {
  return ratingsApi.createRating({
    resourceId,
    pubResourceRatingCreate: { score, comment },
  });
}

export async function updateResourceRating(
  ratingId: number,
  score: number,
  comment?: string | null,
): Promise<PubResourceRatingCreated> {
  return ratingsApi.updateRating({
    ratingId,
    pubResourceRatingCreate: { score, comment },
  });
}

export async function deleteResourceRating(ratingId: number): Promise<void> {
  await ratingsApi.deleteRating({ ratingId });
}

//  Public Collections (Sbírky veřejných materiálů) API functions

export async function listMyCollections(
  params: { includeInactive?: boolean; textSearch?: string } = {},
): Promise<PubCollectionDetail[]> {
  return collectionsApi.getMyCollections({
    includeInactive: params.includeInactive,
    textSearch: params.textSearch,
  });
}

export async function listPublicCollections(
  textSearch?: string,
): Promise<PubCollectionDetail[]> {
  return collectionsApi.getPublicCollections({ textSearch });
}

export async function getCollection(
  collectionId: number,
  textSearch?: string,
): Promise<PubCollectionDetail> {
  return collectionsApi.getCollection({ collectionId, textSearch });
}

export async function createCollection(
  data: PubCollectionCreate,
): Promise<PubCollectionCreated> {
  return collectionsApi.createCollection({ pubCollectionCreate: data });
}

export async function updateCollection(
  collectionId: number,
  data: PubCollectionUpdate,
): Promise<PubCollectionCreated> {
  return collectionsApi.updateCollection({ collectionId, pubCollectionUpdate: data });
}

export async function updateCollectionPublicState(
  collectionId: number,
  isPublic: boolean,
): Promise<PubCollectionCreated> {
  return collectionsApi.updateCollectionPublicState({ collectionId, isPublic });
}

export async function deleteCollection(collectionId: number): Promise<void> {
  await collectionsApi.deleteCollection({ collectionId });
}

// Přidání materiálu do sbírky — vrací aktualizovaný detail sbírky.
export async function addResourceToCollection(
  collectionId: number,
  resourceId: number,
): Promise<PubCollectionDetail> {
  return collectionsApi.addResourceToCollection({ collectionId, resourceId });
}

export async function removeResourceFromCollection(
  collectionId: number,
  resourceId: number,
): Promise<void> {
  await collectionsApi.removeResourceFromCollection({ collectionId, resourceId });
}