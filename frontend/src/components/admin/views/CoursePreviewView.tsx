'use client';

import { useEffect, useState } from 'react';
import { Status, type CourseDetail } from '@/api';
import { CoursePageHeader, ErrorState, LoadingState } from '@/components/admin';
import { PublishCourseButton } from '@/components/admin/PublishCourseButton';
import { StudentPreview } from '@/components/admin/StudentPreview';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRole } from '@/hooks/useRole';
import { getCourse } from '@/lib/api-client';

interface CoursePreviewViewProps {
  courseId: number;
}

/**
 * Read-only náhled kurzu — studentský pohled bez editoru. Otevírá se u cizích
 * kurzů (upravovat smí jen autor nebo superadmin) a z položky „Náhled" v menu.
 */
export function CoursePreviewView({ courseId }: CoursePreviewViewProps) {
  const { goToCourses } = useAdminNavigation();
  const { isGuarantor } = useRole();
  const { isOwner } = useCurrentUser();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getCourse(courseId)
      .then((data) => {
        if (!cancelled) setCourse(data);
      })
      .catch(() => {
        if (!cancelled) setError('Nepodařilo se načíst kurz.');
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (error) return <ErrorState message={error} />;
  if (!course) return <LoadingState />;

  // Schválený, ještě nepublikovaný kurz smí publikovat garant, vlastník i superadmin
  const canPublish =
    course.status === Status.Approved && !course.isPublished && (isGuarantor || isOwner(course.ownerId));

  return (
    <div className="flex-1 flex flex-col h-full bg-muted">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${course.title} / Náhled`}
        title="Náhled kurzu"
        stepLabel="Jen pro čtení"
        showButtons={false}
        actions={
          canPublish ? (
            <PublishCourseButton
              courseId={courseId}
              courseTitle={course.title}
              onPublished={() => setCourse({ ...course, isPublished: true })}
            />
          ) : undefined
        }
      />
      <StudentPreview
        course={course}
        courseId={courseId}
        modules={course.modules ?? []}
        start={{ screen: 'catalog' }}
        onExit={goToCourses}
        exitLabel="Zpět na přehled kurzů"
        notice={
          <>
            <span className="font-semibold text-gradient-r">Náhled kurzu, jen pro čtení.</span>{' '}
            Takto kurz uvidí student.
          </>
        }
      />
    </div>
  );
}

export default CoursePreviewView;
