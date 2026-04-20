'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileProgressCard, ProgressItem } from '@/components/profile/ProfileProgressCard';
import { ProfileStatsGrid } from '@/components/profile/ProfileStatsGrid';
import { ProfileBadgesCard, Badge } from '@/components/profile/ProfileBadgesCard';
import { ProfileModulesSection } from '@/components/profile/ProfileModulesSection';
import { ProfileEditModal } from '@/components/profile/ProfileEditModal';
import { AiPreferencesModal } from '@/components/profile/AiPreferencesModal';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getMyEnrollments } from '@/lib/api-client';
import { MyEnrollment } from '@/api';
import { ProfileSkeleton } from '@/components/ui';
import { motion } from 'motion/react';

function computeBadges(enrollments: MyEnrollment[]): Badge[] {
  const badges: Badge[] = [];
  const completed = enrollments.filter(e => !!e.completedAt);

  if (completed.length >= 1) {
    badges.push({
      id: 'first-module',
      title: 'První modul',
      description: 'Dokončen první modul',
      icon: '🚀',
      color: 'orange',
    });
  }

  if (enrollments.length >= 3) {
    badges.push({
      id: 'active-learner',
      title: 'Série 7 dní',
      description: '7 dní v řadě aktivní',
      icon: '🔥',
      color: 'red',
    });
  }

  const avgScore = completed.length > 0
    ? completed.reduce((acc, e) => {
        const pct = (e.totalModules ?? 0) > 0
          ? ((e.completedModules ?? 0) / (e.totalModules ?? 1)) * 100
          : 0;
        return acc + pct;
      }, 0) / completed.length
    : 0;

  if (avgScore >= 90) {
    badges.push({
      id: 'top-student',
      title: 'Top student',
      description: 'Skóre nad 90% v kvízu',
      icon: '⭐',
      color: 'purple',
    });
  }

  return badges;
}

export default function ProfilPage() {
  const { user, loading, login, isAuthenticated } = useAuth();
  const { roleLabel } = useRole();
  const { currentUser, refetch: refetchUser } = useCurrentUser();
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      login();
    }
  }, [loading, user, login]);

  // Load saved avatar from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('praktik-ai-avatar');
      if (saved) setAvatarSrc(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setEnrollmentsLoading(true);
    getMyEnrollments()
      .then(setEnrollments)
      .catch(() => setEnrollments([]))
      .finally(() => setEnrollmentsLoading(false));
  }, [isAuthenticated]);


  const handleAvatarChange = useCallback((url: string) => {
    setAvatarSrc(url);
    try {
      localStorage.setItem('praktik-ai-avatar', url);
    } catch {
      // ignore
    }
  }, []);

  const stats = useMemo(() => {
    const completed = enrollments.filter(e => !!e.completedAt);
    const totalModules = enrollments.reduce((sum, e) => sum + (e.totalModules ?? 0), 0);
    const completedModules = enrollments.reduce((sum, e) => sum + (e.completedModules ?? 0), 0);
    const modulePct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((acc, e) => {
          const pct = (e.totalModules ?? 0) > 0
            ? ((e.completedModules ?? 0) / (e.totalModules ?? 1)) * 100
            : 0;
          return acc + pct;
        }, 0) / completed.length)
      : 0;

    return {
      completedModules,
      avgScore,
      items: [
        { value: String(completedModules), label: 'Splněných modulů' },
        { value: `${avgScore}%`, label: 'Průměrné skóre' },
        { value: `${enrollments.length}`, label: 'Zapsaných kurzů' },
        { value: `${modulePct}%`, label: 'Celkový progress' },
      ],
    };
  }, [enrollments]);

  const progressItems: ProgressItem[] = useMemo(() => {
    const totalModules = enrollments.reduce((sum, e) => sum + (e.totalModules ?? 0), 0);
    const completedModules = enrollments.reduce((sum, e) => sum + (e.completedModules ?? 0), 0);
    const modulePct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const completed = enrollments.filter(e => !!e.completedAt);
    const completionPct = enrollments.length > 0
      ? Math.round((completed.length / enrollments.length) * 100)
      : 0;

    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((acc, e) => {
          const pct = (e.totalModules ?? 0) > 0
            ? ((e.completedModules ?? 0) / (e.totalModules ?? 1)) * 100
            : 0;
          return acc + pct;
        }, 0) / completed.length)
      : 0;

    return [
      { label: 'Splněné moduly', percentage: modulePct, color: 'bg-green-500' },
      { label: 'Odevzdané úkoly', percentage: completionPct, color: 'bg-yellow-400' },
      { label: 'Kvízové skóre', percentage: avgScore, color: 'bg-orange-400' },
    ];
  }, [enrollments]);

  const badges = useMemo(() => computeBadges(enrollments), [enrollments]);

  const level = useMemo(() => {
    const completedModules = enrollments.reduce((sum, e) => sum + (e.completedModules ?? 0), 0);
    return Math.max(1, Math.floor(completedModules / 3) + 1);
  }, [enrollments]);

  if (loading || !user) {
    return <ProfileSkeleton />;
  }

  return (
    <div
      className="px-6 sm:px-10 lg:px-20 py-6"
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

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-5 w-full lg:w-[320px] flex-shrink-0"
        >
          <ProfileCard
            name={displayName ?? currentUser?.displayName ?? user?.name ?? user?.preferred_username ?? 'Uživatel'}
            role={roleLabel}
            avatarSrc={avatarSrc ?? '/logo.svg'}
            level={level}
            onEditClick={() => setEditModalOpen(true)}
          />

          <button
            onClick={() => setAiModalOpen(true)}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">AI Nastavení</p>
              <p className="text-xs text-gray-500">Tón a vyjadřování</p>
            </div>
          </button>

          <ProfileProgressCard items={progressItems} />

          <ProfileBadgesCard badges={badges} />
        </motion.div>

        {/* Right column */}
        <div className="flex-1 w-full flex flex-col gap-5">
          {/* Stats grid */}
          {!enrollmentsLoading && (
            <ProfileStatsGrid stats={stats.items} />
          )}

          {/* Modules sections */}
          {enrollmentsLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-8 flex items-center justify-center">
              <p className="text-sm text-gray-500">Načítání kurzů...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ProfileModulesSection enrollments={enrollments} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit profile modal */}
      <ProfileEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        avatarSrc={avatarSrc}
        onAvatarChange={handleAvatarChange}
        initialFirstName={user?.given_name ?? ''}
        initialLastName={user?.family_name ?? ''}
        onNameSaved={(name) => setDisplayName(name)}
      />

      {/* AI preferences modal */}
      <AiPreferencesModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        initialAiTone={currentUser?.aiTone ?? ''}
        initialAiExpressionLevel={currentUser?.aiExpressionLevel ?? ''}
        onSaved={refetchUser}
      />

    </div>
  );
}
