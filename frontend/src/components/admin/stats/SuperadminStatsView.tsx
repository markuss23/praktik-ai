'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCourses, listEnrollments, getModules } from '@/lib/api-client';
import { StatsDashboard } from './StatsDashboard';
import type { CourseStats } from './components';

export function SuperadminStatsView() {
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all platform courses + their enrollments upfront. Modules are lazy-loaded per
  // focused course (see `loadModules`) — we'd otherwise issue 2*N HTTP calls upfront.
  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const courses = await getCourses({ includeInactive: true });
        const activeCourses = courses.filter(c => c.isActive);

        const results = await Promise.all(activeCourses.map(async (course) => {
          try {
            const enrollments = await listEnrollments({ courseId: course.courseId });
            const completedCount = enrollments.filter(e => e.completedAt !== null).length;
            const completionRate = enrollments.length > 0
              ? Math.round((completedCount / enrollments.length) * 100)
              : 0;
            return { course, enrollments, modules: [], completionRate } satisfies CourseStats;
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
  }, []);

  const loadModules = useCallback(async (courseId: number) => {
    try {
      return await getModules({ courseId });
    } catch {
      return [];
    }
  }, []);

  return (
    <StatsDashboard
      title="Statistiky platformy"
      subtitle="Přehled všech kurzů, lektorů a zapojení studentů"
      courseStats={courseStats}
      loading={loading}
      showOwner
      emptyMessage="Na platformě nejsou žádné kurzy."
      onRequestModules={loadModules}
    />
  );
}

export default SuperadminStatsView;
