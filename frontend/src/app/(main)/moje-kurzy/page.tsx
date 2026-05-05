'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, GraduationCap, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getMyEnrollments } from '@/lib/api-client';
import { MyEnrollment } from '@/api';
import { CourseCard } from '@/components/ui';

function CardSkeleton() {
  return (
    <div
      className="bg-white overflow-hidden flex flex-col animate-pulse"
      style={{ width: '100%', maxWidth: '590px', height: '530px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
    >
      <div style={{ width: '100%', height: '226px' }} className="bg-gray-200" />
      <div className="flex flex-col p-6 flex-grow">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="mt-auto h-12 bg-gray-200 rounded-md w-full" />
      </div>
    </div>
  );
}

function EnrollmentCard({ enrollment }: { enrollment: MyEnrollment }) {
  const total = enrollment.totalModules ?? enrollment.course.modulesCount ?? 0;
  const done = enrollment.completedModules ?? 0;
  return (
    <CourseCard
      id={String(enrollment.courseId)}
      title={enrollment.course.title}
      description={enrollment.course.description ?? ''}
      duration={total > 0 ? total * 20 : 60}
      completedModules={done}
      totalModules={total}
      isEnrolled
      isCompleted={!!enrollment.completedAt}
    />
  );
}

function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-50 text-purple-600 mb-4">
        <GraduationCap size={28} />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Nejprve se přihlaste</h2>
      <p className="text-gray-600 mb-6">
        Pro zobrazení vašich zapsaných kurzů je potřeba být přihlášen.
      </p>
      {/* 
      <button
        onClick={onLogin}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-md shadow-sm transition-colors"
        style={{ background: 'linear-gradient(90deg, #B1475C 0%, #857AD2 100%)' }}
      >
        <LogIn size={16} strokeWidth={2} />
        Přihlásit se
      </button>
      */}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4">
        <Sparkles size={28} />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Zatím nejste zapsán/a do žádného kurzu</h2>
      <p className="text-gray-600 mb-6">
        Prohlédněte si nabídku kurzů a začněte se učit.
      </p>
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
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const inProgress = enrollments.filter((e) => !e.completedAt);
  const completed = enrollments.filter((e) => !!e.completedAt);

  return (
    <div className="py-8 sm:py-12 lg:py-16" style={{ backgroundColor: '#F0F0F0', minHeight: 'calc(100vh - 80px)' }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500">Home / Moje kurzy</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mt-2">Moje kurzy</h1>
        </div>

        {authLoading || (isAuthenticated && loading) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : !isAuthenticated ? (
          <LoginPrompt onLogin={login} />
        ) : error ? (
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">Nepodařilo se načíst vaše kurzy.</p>
            <p className="text-sm text-red-600 mt-1">Zkuste obnovit stránku.</p>
          </div>
        ) : enrollments.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {inProgress.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Probíhající ({inProgress.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {inProgress.map((e) => (
                    <EnrollmentCard key={e.enrollmentId} enrollment={e} />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Dokončené ({completed.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {completed.map((e) => (
                    <EnrollmentCard key={e.enrollmentId} enrollment={e} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
