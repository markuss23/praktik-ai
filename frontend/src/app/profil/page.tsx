'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileProgressCard, ProgressItem } from '@/components/profile/ProfileProgressCard';
import { AccountSettingsCard } from '@/components/profile/AccountSettingsCard';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

const PROGRESS_ITEMS: ProgressItem[] = [
  { label: 'Splněné kurzy', percentage: 33, color: 'bg-green-500' },
  { label: 'Splněné kurzy', percentage: 61, color: 'bg-green-500' },
  { label: 'Splněné kurzy', percentage: 18, color: 'bg-orange-400' },
];

export default function ProfilPage() {
  const { user, loading, login } = useAuth();
  const { roleLabel } = useRole();

  useEffect(() => {
    if (!loading && !user) {
      login();
    }
  }, [loading, user, login]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

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
        {/* Left column: avatar card + progress card */}
        <div className="flex flex-col gap-5 w-full lg:w-[320px] flex-shrink-0">
          <ProfileCard
            name={user?.name ?? user?.preferred_username ?? 'Uživatel'}
            role={roleLabel}
            avatarSrc="/logo.svg"
          />
          <ProfileProgressCard items={PROGRESS_ITEMS} />
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
