import { Configuration, CoursesApi, ModulesApi, ActivitiesApi, AgentsApi, CourseUpdate } from "@/api";
import { API_BASE_URL } from "./constants";

// Create a configured API client instance
const configuration = new Configuration({
  basePath: API_BASE_URL,
});

export const coursesApi = new CoursesApi(configuration);
export const modulesApi = new ModulesApi(configuration);
export const activitiesApi = new ActivitiesApi(configuration);
export const agentsApi = new AgentsApi(configuration);

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
}) {
  return coursesApi.createCourse({
    courseCreate: data,
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

// Publish API functions
export async function toggleCoursePublish(courseId: number) {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/publish`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to toggle publish');
  }
  return response.json();
}

// AI Agent API functions
export async function generateCourseWithAI(courseId: number) {
  return agentsApi.generateCourse({ courseId });
}