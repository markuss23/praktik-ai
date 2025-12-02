import { Configuration, CoursesApi, ModulesApi, ActivitiesApi, CourseUpdate } from "@/api";
import { API_BASE_URL } from "./constants";

// Create a configured API client instance
const configuration = new Configuration({
  basePath: API_BASE_URL,
});

export const coursesApi = new CoursesApi(configuration);
export const modulesApi = new ModulesApi(configuration);
export const activitiesApi = new ActivitiesApi(configuration);

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
  isPublished?: boolean;
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

export async function createModule(data: {
  title: string;
  courseId: number;
  order?: number;
}) {
  return modulesApi.createModule({
    moduleCreate: data,
  });
}

export async function updateModule(moduleId: number, data: {
  title: string;
  courseId: number;
  order?: number;
}) {
  return modulesApi.updateModule({
    moduleId,
    moduleCreate: data,
  });
}

// Activities API functions
export async function getActivities(params?: {
  includeInactive?: boolean;
  textSearch?: string;
  moduleId?: number;
}) {
  return activitiesApi.listActivities({
    includeInactive: params?.includeInactive,
    textSearch: params?.textSearch,
    moduleId: params?.moduleId,
  });
}

export async function getActivity(activityId: number) {
  return activitiesApi.getActivity({ activityId });
}