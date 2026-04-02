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
} from "@/api";
import { API_BASE_URL } from "./constants";
import { getValidAccessToken } from "./keycloak";


// Request middleware — injects `Authorization: Bearer <token>` when the user is authenticated. For unauthenticated (public) requests the header is comitted entirely so the backend doesn't reject them.
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

// ============ Auth / Current User ============

export async function getMe() {
  return authApi.endpMeApiV1AuthMeGet();
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

// ============ Course Status & Published API functions ============

export async function updateCoursePublished(courseId: number, isPublished: boolean) {
  return coursesApi.updateCoursePublished({ courseId, isPublished });
}

export async function updateCourseStatus(courseId: number, status: UpdateCourseStatusStatusEnum) {
  return coursesApi.updateCourseStatus({ courseId, status });
}

// ============ Course Links API functions ============

export async function createCourseLink(courseId: number, url: string) {
  return coursesApi.createCourseLink({ courseId, url });
}

export async function listCourseLinks(courseId: number) {
  return coursesApi.listCourseLinks({ courseId });
}

export async function deleteCourseLink(courseId: number, linkId: number) {
  return coursesApi.deleteCourseLink({ courseId, linkId });
}

// ============ Catalogs API functions ============

export async function getCourseBlocks() {
  return catalogsApi.listCourseBlocks();
}

export async function getCourseTargets() {
  return catalogsApi.listCourseTargets();
}

export async function getCourseSubjects() {
  return catalogsApi.listCourseSubjects();
}

// ============ Activities API functions ============

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

// ============ Enrollments API functions ============

export async function getMyEnrollments() {
  return enrollmentsApi.myEnrollments();
}

export async function createEnrollment(userId: number, courseId: number) {
  return enrollmentsApi.createEnrollment({
    enrollmentCreate: { userId, courseId },
  });
}

export async function leaveEnrollment(enrollmentId: number) {
  return enrollmentsApi.leaveEnrollment({ enrollmentId });
}

// ============ Module Progress API functions ============

export async function completeModule(moduleId: number, score: number) {
  return modulesApi.completeModule({
    moduleId,
    completeModuleRequest: { score },
  });
}

export async function getCourseProgress(courseId: number) {
  return modulesApi.getCourseProgress({ courseId });
}

// ============ Feedbacks API functions ============

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

// ============ System Settings (Superadmin) API functions ============

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
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
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