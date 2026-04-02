'use client';

import { Suspense, lazy } from 'react';
import { useAdminNavigation, AdminView } from '@/hooks/useAdminNavigation';
import { PageSpinner } from '@/components/ui';

// Lazy loading - komponenty se načtou až když jsou potřeba
const CoursesListView = lazy(() => import('./CoursesListView'));
const CourseContentView = lazy(() => import('./CourseContentView'));
const CourseTestsView = lazy(() => import('./CourseTestsView'));
const CourseSummaryView = lazy(() => import('./CourseSummaryView'));
const CourseAICreateView = lazy(() => import('./CourseAICreateView'));
const CourseUploadView = lazy(() => import('./CourseUploadView'));
const CourseEditView = lazy(() => import('./CourseEditView'));
const ModuleEditView = lazy(() => import('./ModuleEditView'));

// Router používá query params + shallow routing (bez reload stránky)
export function AdminViewRouter() {
  const { currentView, courseId, moduleId } = useAdminNavigation();

  const renderView = () => {
    switch (currentView) {
      case 'course-content':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CourseContentView courseId={courseId} initialModuleId={moduleId} />;

      case 'course-tests':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CourseTestsView courseId={courseId} initialModuleId={moduleId} />;

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
    <Suspense fallback={<PageSpinner />}>
      {renderView()}
    </Suspense>
  );
}

export default AdminViewRouter;
