'use client';

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getCourses, listEnrollments, getModules } from '@/lib/api-client';
import { StatsDashboard } from './StatsDashboard';
import type { CourseStats } from './components';

export function LectorStatsView() {
  const { currentUser, loading: userLoading } = useCurrentUser();
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function loadStats() {
      try {
        const courses = await getCourses({ includeInactive: true });
        const myCourses = courses.filter(c => c.ownerId === currentUser!.userId && c.isActive);

        const results = await Promise.all(myCourses.map(async (course) => {
          try {
            const [enrollments, modules] = await Promise.all([
              listEnrollments({ courseId: course.courseId }),
              getModules({ courseId: course.courseId }),
            ]);
            const completedCount = enrollments.filter(e => e.completedAt !== null).length;
            const completionRate = enrollments.length > 0
              ? Math.round((completedCount / enrollments.length) * 100)
              : 0;
            return { course, enrollments, modules, completionRate } satisfies CourseStats;
          } catch {
            return { course, enrollments: [], modules: [], completionRate: 0 } satisfies CourseStats;
          }
        }));

        if (!cancelled) {
          setCourseStats(results);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [currentUser]);

  return (
    <StatsDashboard
      title="Statistiky mých kurzů"
      subtitle="Přehled výkonu, zapojení studentů a obsahu vašich kurzů"
      courseStats={courseStats}
      loading={userLoading || loading}
    />
  );
}

export default LectorStatsView;
