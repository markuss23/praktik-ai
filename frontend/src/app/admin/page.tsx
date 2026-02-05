import { Suspense } from 'react';
import { AdminViewRouter } from '@/components/admin/views';

/**
 * Loading fallback for Suspense boundary
 */
function AdminLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Načítání administrace...</span>
      </div>
    </div>
  );
}

/**
 * Admin page - Server Component wrapper
 * Uses Suspense for the client-side AdminViewRouter
 * The actual view routing happens client-side based on query params
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminViewRouter />
    </Suspense>
  );
}
