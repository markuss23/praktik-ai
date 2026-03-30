import { Suspense } from 'react';
import { ReviewListView } from '@/components/admin/views/ReviewListView';

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Načítání...</span>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReviewListView />
    </Suspense>
  );
}
