'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileProgressCard, ProgressItem } from '@/components/profile/ProfileProgressCard';
import { AccountSettingsCard } from '@/components/profile/AccountSettingsCard';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { getMyEnrollments } from '@/lib/api-client';
import { MyEnrollment } from '@/api';
import { BookOpen } from 'lucide-react';
import { ProfileSkeleton } from '@/components/ui';

export default function ProfilPage() {
  const { user, loading, login, isAuthenticated } = useAuth();
  const { roleLabel } = useRole();
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      login();
    }
  }, [loading, user, login]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setEnrollmentsLoading(true);
    getMyEnrollments()
      .then(setEnrollments)
      .catch(() => setEnrollments([]))
      .finally(() => setEnrollmentsLoading(false));
  }, [isAuthenticated]);

  if (loading || !user) {
    return <ProfileSkeleton />;
  }

  const progressItems: ProgressItem[] = enrollments.map(e => ({
    label: e.course.title,
    percentage: (e.totalModules ?? 0) > 0 ? Math.round(((e.completedModules ?? 0) / (e.totalModules ?? 1)) * 100) : 0,
  }));

  return (
    <div
      className="px-4 sm:px-8 lg:px-16 py-6"
      style={{ maxWidth: '1440px', width: '100%', margin: '0 auto' }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-700 transition-colors">
          Home
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">Profil</span>
      </nav>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left column: avatar card + progress + enrolled courses */}
        <div className="flex flex-col gap-5 w-full lg:w-[320px] flex-shrink-0">
          <ProfileCard
            name={user?.name ?? user?.preferred_username ?? 'Uživatel'}
            role={roleLabel}
            avatarSrc="/logo.svg"
          />

          {/* Enrolled courses */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-bold text-gray-900">Zapsané kurzy</h3>
            </div>
            {enrollmentsLoading ? (
              <p className="text-sm text-gray-500">Načítání...</p>
            ) : enrollments.length === 0 ? (
              <p className="text-sm text-gray-500">Nejste zapsáni v žádném kurzu.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {enrollments.map(e => {
                  const pct = (e.totalModules ?? 0) > 0 ? Math.round(((e.completedModules ?? 0) / (e.totalModules ?? 1)) * 100) : 0;
                  const isCompleted = !!e.completedAt;
                  return (
                    <Link
                      key={e.enrollmentId}
                      href={`/courses/${e.courseId}`}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                        isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.course.title}</p>
                        <p className="text-xs text-gray-500">
                          {isCompleted ? 'Dokončeno' : `${e.completedModules ?? 0}/${e.totalModules ?? 0} modulů`}
                        </p>
                      </div>
                      {isCompleted ? (
                        <span className="text-sm font-semibold ml-3 text-green-600 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          100%
                        </span>
                      ) : (
                        <span className="text-sm font-semibold ml-3" style={{ color: '#8B5BA8' }}>
                          {pct}%
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {progressItems.length > 0 && (
            <ProfileProgressCard items={progressItems} />
          )}
        </div>

        {/* Right column: account settings */}
        <div className="flex-1 w-full">
          <AccountSettingsCard
            onSave={(values) => {
              console.log('Saved:', values);
            }}
            onChangePassword={() => {
              console.log('Change password clicked');
            }}
          />
        </div>
      </div>
    </div>
  );
}
