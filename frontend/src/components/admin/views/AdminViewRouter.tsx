'use client';

import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useAdminNavigation, AdminView } from '@/hooks/useAdminNavigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRole } from '@/hooks/useRole';
import { getCourse } from '@/lib/api-client';
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
const CoursePreviewView = lazy(() => import('./CoursePreviewView'));

/**
 * Editor kurzu jen pro autora a superadmina — ostatní (cizí kurz, starý odkaz)
 * přesměruje do read-only náhledu. Do ověření vlastníka ukazuje spinner, ať se
 * editor cizího kurzu ani na okamžik nevykreslí.
 */
function CourseEditorGuard({ courseId, children }: { courseId: number; children: ReactNode }) {
  const { currentUser, loading: userLoading, isOwner } = useCurrentUser();
  const { isSuperAdmin } = useRole();
  const { goToCoursePreview } = useAdminNavigation();
  const [owner, setOwner] = useState<{ courseId: number; ownerId: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCourse(courseId)
      .then((course) => {
        if (!cancelled) setOwner({ courseId, ownerId: course.ownerId });
      })
      // Kurz nejde načíst — chybu ukáže samotný editor
      .catch(() => {
        if (!cancelled) setOwner({ courseId, ownerId: null });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const resolved = owner?.courseId === courseId && !userLoading;
  // Bez načteného uživatele (selhalo /auth/me) nepřesměrovávat — oprávnění hlídá i backend
  const forbidden =
    resolved && owner.ownerId !== null && currentUser !== null && !isSuperAdmin && !isOwner(owner.ownerId);

  useEffect(() => {
    if (forbidden) goToCoursePreview(courseId, { replace: true });
  }, [forbidden, courseId, goToCoursePreview]);

  if (!resolved || forbidden) return <PageSpinner />;
  return <>{children}</>;
}

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
        return (
          <CourseEditorGuard courseId={courseId}>
            <CourseContentView courseId={courseId} initialModuleId={moduleId} />
          </CourseEditorGuard>
        );

      case 'course-tests':
        if (!courseId) {
          return <CoursesListView />;
        }
        return (
          <CourseEditorGuard courseId={courseId}>
            <CourseTestsView courseId={courseId} initialModuleId={moduleId} />
          </CourseEditorGuard>
        );

      case 'course-summary':
        if (!courseId) {
          return <CoursesListView />;
        }
        return (
          <CourseEditorGuard courseId={courseId}>
            <CourseSummaryView courseId={courseId} />
          </CourseEditorGuard>
        );

      case 'course-edit':
        if (!courseId) {
          return <CoursesListView />;
        }
        return (
          <CourseEditorGuard courseId={courseId}>
            <CourseEditView courseId={courseId} />
          </CourseEditorGuard>
        );

      case 'course-preview':
        if (!courseId) {
          return <CoursesListView />;
        }
        return <CoursePreviewView courseId={courseId} />;

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
