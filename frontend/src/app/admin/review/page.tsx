import { Suspense } from 'react';
import { ReviewListView } from '@/components/admin/views/ReviewListView';
import { PageSpinner } from '@/components/ui';

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageSpinner message="Načítání schválení…" />}>
      <ReviewListView />
    </Suspense>
  );
}
