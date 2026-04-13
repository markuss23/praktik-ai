import { Suspense } from 'react';
import { CategoriesListView } from '@/components/admin/views';
import { PageSpinner } from '@/components/ui';

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PageSpinner message="Načítání kategorií…" />}>
      <CategoriesListView />
    </Suspense>
  );
}
