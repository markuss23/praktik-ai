'use client';

import { Suspense, lazy } from 'react';
import { useAdminNavigation, AdminView } from '@/hooks/useAdminNavigation';
import { LoadingState } from '../StateDisplays';

// Lazy loading - komponenty se načtou až když jsou potřeba
const CoursesListView = lazy(() => import('./CoursesListView'));
const CourseContentView = lazy(() => import('./CourseContentView'));
const CourseTestsView = lazy(() => import('./CourseTestsView'));
const CourseSummaryView = lazy(() => import('./CourseSummaryView'));
const CourseAICreateView = lazy(() => import('./CourseAICreateView'));
const CourseUploadView = lazy(() => import('./CourseUploadView'));
const CourseEditView = lazy(() => import('./CourseEditView'));
const ModuleEditView = lazy(() => import('./ModuleEditView'));

// Loading stav při načítání lazy komponent
function ViewLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Načítání...</span>
      </div>
    </div>
  );
}

// Router používá query params + shallow routing (bez reload stránky)
export function AdminViewRouter() {
  const { currentView, courseId, moduleId } = useAdminNavigation();

  const renderView = () => {
    switch (currentView) {
      case 'course-content':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CourseContentView courseId={courseId} />;

      case 'course-tests':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CourseTestsView courseId={courseId} />;

      case 'course-summary':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CourseSummaryView courseId={courseId} />;

      case 'course-edit':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CourseEditView courseId={courseId} />;

      case 'course-upload':
        return <CourseUploadView />;

      case 'course-ai-create':
        return <CourseAICreateView />;

      case 'module-edit':
        if (!moduleId) {
          return <CoursesListView />;
        }
        return <ModuleEditView moduleId={moduleId} courseId={courseId} />;

      case 'courses':
      default:
        return <CoursesListView />;
    }
  };

  return (
    <Suspense fallback={<ViewLoadingFallback />}>
      {renderView()}
    </Suspense>
  );
}

export default AdminViewRouter;
