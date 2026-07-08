'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getMyEnrollments, type MyEnrollmentExtended } from '@/lib/api-client';
import { ContinueHeroCard } from './ContinueHeroCard';
import { EnrollmentCardWithNext } from './EnrollmentCardWithNext';
import { MyCoursesFilters, type SortKey, type StatusFilter } from './MyCoursesFilters';
import { ActivityHeatmap } from './ActivityHeatmap';
import { QuickStats } from './QuickStats';
import { RecommendedCourses } from './RecommendedCourses';

function HeroSkeleton() {
  return <div className="rounded-2xl bg-gray-200 animate-pulse h-[260px]" />;
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 h-[450px] animate-pulse" />
      ))}
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 text-purple-600 mb-4">
        <GraduationCap size={28} />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Nejprve se přihlaste</h2>
      <p className="text-gray-600 mb-6">
        Pro zobrazení vašich zapsaných kurzů je potřeba být přihlášen.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4">
        <Sparkles size={28} />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
        Zatím nejste zapsán/a do žádného kurzu
      </h2>
      <p className="text-gray-600 mb-6">Prohlédněte si nabídku kurzů a začněte se učit.</p>
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-md shadow-sm transition-colors"
        style={{ backgroundColor: '#00C896' }}
      >
        <BookOpen size={16} strokeWidth={2} />
        Procházet kurzy
      </Link>
    </div>
  );
}

export default function MojeKurzyPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<MyEnrollmentExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    getMyEnrollments()
      .then((data) => setEnrollments(data))
      .catch((err) => {
        console.error('Failed to load enrollments:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  // Server vrací zápisy seřazené dle skutečné aktivity (last_activity_at),
  // takže resume kurz = první neunfinishovaný v seznamu.
  const resume = useMemo(
    () => enrollments.find((e) => !e.completedAt) ?? null,
    [enrollments],
  );

  const counts = useMemo(() => {
    const inProgress = enrollments.filter(
      (e) => !e.completedAt && (e.completedModules ?? 0) > 0,
    ).length;
    const notStarted = enrollments.filter(
      (e) => !e.completedAt && (e.completedModules ?? 0) === 0,
    ).length;
    const completed = enrollments.filter((e) => !!e.completedAt).length;
    return { all: enrollments.length, inProgress, notStarted, completed };
  }, [enrollments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enrollments.filter((e) => {
      const done = e.completedModules ?? 0;
      const isCompleted = !!e.completedAt;
      const isInProgress = !isCompleted && done > 0;
      const isNotStarted = !isCompleted && done === 0;
      if (status === 'in-progress' && !isInProgress) return false;
      if (status === 'completed' && !isCompleted) return false;
      if (status === 'not-started' && !isNotStarted) return false;

      if (q) {
        const hay = `${e.course.title} ${e.course.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'title') return a.course.title.localeCompare(b.course.title, 'cs');
      const aTotal = a.totalModules ?? 1;
      const bTotal = b.totalModules ?? 1;
      const aPct = ((a.completedModules ?? 0) / aTotal) * 100;
      const bPct = ((b.completedModules ?? 0) / bTotal) * 100;
      if (sort === 'progress-desc') return bPct - aPct;
      if (sort === 'progress-asc') return aPct - bPct;
      // 'recent' = preferuj last_activity_at, jinak enrolledAt
      const aTime = (a.lastActivityAt ?? a.enrolledAt).getTime();
      const bTime = (b.lastActivityAt ?? b.enrolledAt).getTime();
      return bTime - aTime;
    });

    return list;
  }, [enrollments, query, status, sort]);

  const isInitialLoading = authLoading || (isAuthenticated && loading);

  return (
    <div
      className="py-8 sm:py-12 lg:py-14"
      style={{ backgroundColor: '#F0F0F0', minHeight: 'calc(100vh - 80px)' }}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500">Home / Moje kurzy</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mt-2">Moje kurzy</h1>
          <p className="text-sm text-gray-600 mt-1">Tvůj učební prostor — pokračuj, kde jsi skončil.</p>
        </div>

        {isInitialLoading ? (
          <div className="space-y-6">
            <HeroSkeleton />
            <GridSkeleton />
          </div>
        ) : !isAuthenticated ? (
          <LoginPrompt />
        ) : error ? (
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">Nepodařilo se načíst vaše kurzy.</p>
            <p className="text-sm text-red-600 mt-1">Zkuste obnovit stránku.</p>
          </div>
        ) : enrollments.length === 0 ? (
          <>
            <EmptyState />
            <RecommendedCourses />
          </>
        ) : (
          <div className="space-y-8">
            {resume && <ContinueHeroCard enrollment={resume} />}

            <QuickStats enrollments={enrollments} />

            <MyCoursesFilters
              query={query}
              onQueryChange={setQuery}
              status={status}
              onStatusChange={setStatus}
              sort={sort}
              onSortChange={setSort}
              counts={counts}
            />

            <section>
              {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <p className="text-gray-700 font-medium">Žádný kurz neodpovídá filtru</p>
                  <p className="text-sm text-gray-500 mt-1">Zkuste upravit hledání nebo vybrat jiný stav.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filtered.map((e) => (
                    <EnrollmentCardWithNext key={e.enrollmentId} enrollment={e} />
                  ))}
                </div>
              )}
            </section>

            <ActivityHeatmap />

            <RecommendedCourses />
          </div>
        )}
      </div>
    </div>
  );
}
