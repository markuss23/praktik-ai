'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

/**
 * Admin view types - all possible views in the admin panel
 */
export type AdminView = 
  | 'courses'           // Default - course list
  | 'course-content'    // Course content editor
  | 'course-tests'      // Course test/exam editor
  | 'course-summary'    // Course summary/preview
  | 'course-edit'       // Course edit form
  | 'course-upload'     // Upload course files
  | 'course-ai-create'  // AI course generation
  | 'module-edit';      // Module edit form

export interface AdminNavigationState {
  view: AdminView;
  courseId?: number;
  moduleId?: number;
}

/**
 * Hook for managing admin navigation with shallow routing
 * Uses query params to maintain state without full page reloads
 * Back button works, refresh preserves state
 */
export function useAdminNavigation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse current state from URL
  const currentState: AdminNavigationState = useMemo(() => {
    const view = (searchParams.get('view') as AdminView) || 'courses';
    const courseIdStr = searchParams.get('courseId');
    const moduleIdStr = searchParams.get('moduleId');
    
    return {
      view,
      courseId: courseIdStr ? parseInt(courseIdStr, 10) : undefined,
      moduleId: moduleIdStr ? parseInt(moduleIdStr, 10) : undefined,
    };
  }, [searchParams]);

  /**
   * Navigate to a new view with shallow routing (no full page reload)
   */
  const navigate = useCallback((newState: Partial<AdminNavigationState>) => {
    const params = new URLSearchParams();
    
    const mergedState = { ...currentState, ...newState };
    
    // Only add view param if not default
    if (mergedState.view && mergedState.view !== 'courses') {
      params.set('view', mergedState.view);
    }
    
    if (mergedState.courseId !== undefined) {
      params.set('courseId', mergedState.courseId.toString());
    }
    
    if (mergedState.moduleId !== undefined) {
      params.set('moduleId', mergedState.moduleId.toString());
    }
    
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    // Use router.push with shallow: false is default in App Router
    // But the navigation happens client-side without full reload
    router.push(newUrl, { scroll: false });
  }, [currentState, pathname, router]);

  /**
   * Navigate to course list (default view)
   */
  const goToCourses = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  /**
   * Navigate to course content editor
   */
  const goToCourseContent = useCallback((courseId: number) => {
    navigate({ view: 'course-content', courseId, moduleId: undefined });
  }, [navigate]);

  /**
   * Navigate to course edit form
   */
  const goToCourseEdit = useCallback((courseId: number) => {
    navigate({ view: 'course-edit', courseId, moduleId: undefined });
  }, [navigate]);

  /**
   * Navigate to course upload
   */
  const goToCourseUpload = useCallback(() => {
    navigate({ view: 'course-upload', courseId: undefined, moduleId: undefined });
  }, [navigate]);

  /**
   * Navigate to AI course creation
   */
  const goToAICreate = useCallback(() => {
    navigate({ view: 'course-ai-create', courseId: undefined, moduleId: undefined });
  }, [navigate]);

  /**
   * Navigate to module edit
   */
  const goToModuleEdit = useCallback((moduleId: number, courseId?: number) => {
    navigate({ view: 'module-edit', moduleId, courseId });
  }, [navigate]);

  /**
   * Navigate to course tests editor
   */
  const goToCourseTests = useCallback((courseId: number) => {
    navigate({ view: 'course-tests', courseId, moduleId: undefined });
  }, [navigate]);

  /**
   * Navigate to course summary
   */
  const goToCourseSummary = useCallback((courseId: number) => {
    navigate({ view: 'course-summary', courseId, moduleId: undefined });
  }, [navigate]);

  /**
   * Go back (uses browser history)
   */
  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    // Current state
    currentView: currentState.view,
    courseId: currentState.courseId,
    moduleId: currentState.moduleId,
    
    // Navigation methods
    navigate,
    goToCourses,
    goToCourseContent,
    goToCourseEdit,
    goToCourseUpload,
    goToAICreate,
    goToModuleEdit,
    goToCourseTests,
    goToCourseSummary,
    goBack,
  };
}
