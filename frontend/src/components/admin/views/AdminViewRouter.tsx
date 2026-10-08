'use client';

import { Suspense, lazy, useEffect } from 'react';
import { useAdminNavigation, AdminView } from '@/hooks/useAdminNavigation';
import { PageSpinner } from '@/components/ui';
import { useAdminChrome } from '../AdminChromeProvider';

// Lazy loading - komponenty se načtou až když jsou potřeba
const CoursesListView = lazy(() => import('./CoursesListView'));
const CourseContentView = lazy(() => import('./CourseContentView'));
const CourseTestsView = lazy(() => import('./CourseTestsView'));
const CourseSummaryView = lazy(() => import('./CourseSummaryView'));
const CourseAICreateView = lazy(() => import('./CourseAICreateView'));
const CourseUploadView = lazy(() => import('./CourseUploadView'));
const CourseEditView = lazy(() => import('./CourseEditView'));
const ModuleEditView = lazy(() => import('./ModuleEditView'));

// Pohledy s tlačítkem celá obrazovka
const FOCUS_MODE_VIEWS: AdminView[] = ['course-edit', 'course-content', 'course-tests', 'course-summary'];

// Router používá query params + shallow routing (bez reload stránky)
export function AdminViewRouter() {
  const { currentView, courseId, moduleId } = useAdminNavigation();
  const { exitFocusMode } = useAdminChrome();

  useEffect(() => {
    if (!FOCUS_MODE_VIEWS.includes(currentView)) exitFocusMode();
  }, [currentView, exitFocusMode]);

  // Odchod z /admin (statistiky, schvalován) fokus režim také ukončí.
  useEffect(() => () => exitFocusMode(), [exitFocusMode]);

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
