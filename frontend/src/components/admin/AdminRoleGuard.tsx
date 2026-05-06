'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { AdminDashboardSkeleton } from '@/components/ui';

export function AdminRoleGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, login } = useAuth();
  const { can } = useRole();

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (!isAuthenticated || !can('lector')) {
    // Show 403
    return (
      <div
        role="alert"
        aria-labelledby="forbidden-title"
        className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      >
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-xs font-semibold tracking-[0.15em] text-red-600 mb-2">CHYBA 403</p>
          <h1 id="forbidden-title" className="text-2xl font-bold text-gray-900 mb-2">
            Nemáte oprávnění
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Tato část aplikace je dostupná pouze uživatelům s rolí Lektor nebo vyšší. Pokud si
            myslíte, že jde o chybu, kontaktujte správce.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {!isAuthenticated && (
              <button
                onClick={login}
                className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Přihlásit se
              </button>
            )}
            <Link
              href="/"
              className="inline-flex items-center justify-center h-10 px-4 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Zpět na hlavní stránku
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
