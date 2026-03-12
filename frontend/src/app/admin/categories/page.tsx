import { Suspense } from 'react';
import { CategoriesListView } from '@/components/admin/views';

function CategoriesLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Načítání kategorií...</span>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesLoadingFallback />}>
      <CategoriesListView />
    </Suspense>
  );
}
