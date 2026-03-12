'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

export function AdminRoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { can } = useRole();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !can('lector')) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, can, router]);

  if (loading || !isAuthenticated || !can('lector')) {
    return null;
  }

  return <>{children}</>;
}
