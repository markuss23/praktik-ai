import { 
  Configuration, 
  CoursesApi, 
  ModulesApi, 
  ActivitiesApi, 
  AgentsApi, 
  CategoriesApi,
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
} from "@/api";
import { API_BASE_URL } from "./constants";

// Create a configured API client instance
const configuration = new Configuration({
  basePath: API_BASE_URL,
});

export const coursesApi = new CoursesApi(configuration);
export const modulesApi = new ModulesApi(configuration);
export const activitiesApi = new ActivitiesApi(configuration);
export const agentsApi = new AgentsApi(configuration);
export const categoriesApi = new CategoriesApi(configuration);

// Course API functions
export async function getCourses(params?: {
  includeInactive?: boolean;
  isPublished?: boolean;
  textSearch?: string;
}) {
  return coursesApi.listCourses({
    includeInactive: params?.includeInactive,
    isPublished: params?.isPublished,
    textSearch: params?.textSearch,
  });
}

export async function getCourse(courseId: number) {
  return coursesApi.getCourse({ courseId });
}

export async function createCourse(data: {
  title: string;
  description?: string;
  modulesCount?: number;
  categoryId?: number;
}) {
  return coursesApi.createCourse({
    courseCreate: {
      ...data,
      categoryId: data.categoryId ?? 1, // Default category
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
  position?: number;
  isActive?: boolean;
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

// ============ Categories API functions ============

export async function getCategories(includeInactive = false) {
  return categoriesApi.listCategories({ includeInactive });
}

export async function createCategory(name: string) {
  return categoriesApi.createCategory({ categoryCreate: { name } });
}

export async function deleteCategory(categoryId: number) {
  return categoriesApi.deleteCategory({ categoryId });
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