'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Status } from '@/api';
import { getCourses } from '@/lib/api-client';
import { useRole } from '@/hooks/useRole';
import { ArrowRight, BookOpen } from 'lucide-react';
import { ReviewCardsSkeleton } from '@/components/ui';

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Právě teď';
  if (diffMin < 60) return `Před ${diffMin}m`;
  if (diffHours < 24) return `Před ${diffHours}h`;
  if (diffDays === 1) return 'Před 1 dnem';
  if (diffDays < 5) return `Před ${diffDays} dny`;
  return `Před ${diffDays} dny`;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === Status.InReview) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Ke kontrole
      </span>
    );
  }
  if (status === Status.Approved) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Schváleno
      </span>
    );
  }
  return null;
}

function CourseCard({ course, onStart }: { course: Course; onStart: () => void }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={course.status} />
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1">
          {course.title}
        </h3>
        {course.modulesCount !== undefined && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <BookOpen size={13} />
            {course.modulesCount} {course.modulesCount === 1 ? 'modul' : course.modulesCount < 5 ? 'moduly' : 'modulů'}
          </p>
        )}
      </div>

      <button
        onClick={onStart}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
        style={{ backgroundColor: '#00C896' }}
      >
        <ArrowRight size={16} />
        Začít kurz
      </button>
    </div>
  );
}

export function ReviewListView() {
  const router = useRouter();
  useRole(); // guard: only guarantors/superadmins see this page
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await getCourses({ includeInactive: false });
        // Guarantors and superadmins see all in_review + approved
        const filtered = all.filter(c =>
          c.status === Status.InReview || c.status === Status.Approved
        );
        setCourses(filtered);
      } catch (err) {
        console.error('Failed to load review courses:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStart = (courseId: number) => {
    router.push(`/admin/review/${courseId}`);
  };

  const inReview = courses.filter(c => c.status === Status.InReview);
  const approved = courses.filter(c => c.status === Status.Approved);

  return (
    <div className="flex-1 p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6">Obsah ke schválení</h1>

      {loading ? (
        <ReviewCardsSkeleton />
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">Žádné kurzy ke schválení</p>
          <p className="text-gray-400 text-sm mt-1">
            Momentálně nejsou žádné kurzy čekající na schválení.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {inReview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Ke kontrole ({inReview.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inReview.map(course => (
                  <CourseCard
                    key={course.courseId}
                    course={course}
                    onStart={() => handleStart(course.courseId)}
                  />
                ))}
              </div>
            </section>
          )}

          {approved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Schváleno ({approved.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {approved.map(course => (
                  <CourseCard
                    key={course.courseId}
                    course={course}
                    onStart={() => handleStart(course.courseId)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewListView;
