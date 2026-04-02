import { Suspense } from 'react';
import { AiMentorView } from '@/components/admin/views/AiMentorView';
import { AiMentorSkeleton } from '@/components/ui';

export default function AiMentorPage() {
  return (
    <Suspense fallback={<AiMentorSkeleton />}>
      <AiMentorView />
    </Suspense>
  );
}
