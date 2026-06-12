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
  CourseUpdate,
  UpdateCourseStatusStatusEnum,
  LearnBlockCreate,
  LearnBlockUpdate,
  ModuleCreate,
  PracticeQuestionCreate,
  PracticeQuestionUpdate,
  PracticeOptionCreate,
  PracticeOptionUpdate,
  QuestionKeywordUpdate,
  type Middleware,
  type QuestionType,
  type PubResourceCreate,
  type PubResourceUpdate,
  type ListResourcesRequest,
  type PubResource,
  type PubResourceReview,
  type PubResourceReviewCreate,
  UpdateResourceStatusNewStatusEnum,
} from "@/api";
import { API_BASE_URL, backendUrl } from "./constants";
import { getValidAccessToken } from "./keycloak";


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

// ============ Auth / Current User ============

export async function getMe() {
  return authApi.endpMeApiV1AuthMeGet();
}

export async function updateProfile(aiTone: string, aiExpressionLevel: string) {
  return authApi.endpUpdateProfileApiV1AuthProfilePut({
    profileUpdate: { aiTone, aiExpressionLevel },
  });
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
  courseBlockId: number;
  courseTargetId: number;
  courseSubjectId: number;
  difficulty?: import('@/api').Difficulty;
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
      difficulty: data.difficulty,
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

export async function updateModule(moduleId: number, data: {
  title: string;
}) {
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
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteCourse(courseId: number) {
  return coursesApi.deleteCourse({ courseId });
}

// AI Agent API functions
export async function generateCourseWithAI(courseId: number) {
  return agentsApi.generateCourse({ courseId });
}

export async function learnBlocksChat(learnBlockId: number, message: string) {
  return agentsApi.learnBlocksChat({
    learnBlocksChatRequest: { learnBlockId, message },
  });
}

export async function generateCourseEmbeddings(courseId: number) {
  return agentsApi.generateCourseEmbeddings({ courseId });
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

export async function getActiveCourseGeneration(): Promise<number | null> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(backendUrl(`/api/v1/agents/active-course-generation`), {
    method: 'GET',
    headers,
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return typeof data === 'number' ? data : null;
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

//  Activities API functions 

export async function createLearnBlock(data: LearnBlockCreate) {
  return activitiesApi.createLearnBlock({ learnBlockCreate: data });
}

export async function updateLearnBlock(learnId: number, data: LearnBlockUpdate) {
  return activitiesApi.updateLearnBlock({ learnId, learnBlockUpdate: data });
}

export async function createPracticeQuestion(data: PracticeQuestionCreate) {
  return activitiesApi.createPracticeQuestion({ practiceQuestionCreate: data });
}

export async function updatePracticeQuestion(questionId: number, data: PracticeQuestionUpdate) {
  return activitiesApi.updatePracticeQuestion({ questionId, practiceQuestionUpdate: data });
}

export async function createPracticeOption(data: PracticeOptionCreate) {
  return activitiesApi.createPracticeOption({ practiceOptionCreate: data });
}

export async function updatePracticeOption(optionId: number, data: PracticeOptionUpdate) {
  return activitiesApi.updatePracticeOption({ optionId, practiceOptionUpdate: data });
}

export async function updateQuestionKeyword(keywordId: number, data: QuestionKeywordUpdate) {
  return activitiesApi.updateQuestionKeyword({ keywordId, questionKeywordUpdate: data });
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

export async function getMyEnrollments(): Promise<MyEnrollmentExtended[]> {
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

//  Module Progress API functions 

export async function completeModule(moduleId: number, score: number) {
  return modulesApi.completeModule({
    moduleId,
    completeModuleRequest: { score },
  });
}

export async function getCourseProgress(courseId: number) {
  return modulesApi.getCourseProgress({ courseId });
}

//  Practice Questions (with attempts) API functions

export async function listPracticeQuestions(moduleId: number) {
  return modulesApi.listPracticeQuestions({ moduleId });
}

//  Assessment API functions

export async function getModuleAssessment(moduleId: number) {
  return modulesApi.getModuleAssessment({ moduleId });
}

export async function generateAssessment(moduleId: number) {
  return agentsApi.generateAssessment({
    generateAssessmentRequest: { moduleId },
  });
}

export async function evaluateAssessment(sessionId: number, userResponse: string) {
  return agentsApi.evaluateAssessment({
    evaluateAssessmentRequest: { sessionId, userResponse },
  });
}

//  AI Practice Question Generation & Evaluation

export async function generatePracticeQuestion(moduleId: number, questionType: QuestionType) {
  return agentsApi.generatePracticeQuestion({
    generatePracticeQuestionRequest: { moduleId, questionType },
  });
}

export async function evaluatePracticeAnswer(userQuestionId: number, userInput: string) {
  return agentsApi.evaluatePracticeAnswer({
    evaluatePracticeAnswerRequest: { userQuestionId, userInput },
  });
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