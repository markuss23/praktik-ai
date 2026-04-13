import { Suspense } from 'react';
import { AdminViewRouter } from '@/components/admin/views';
import { AdminDashboardSkeleton } from '@/components/ui';

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminViewRouter />
    </Suspense>
  );
}
