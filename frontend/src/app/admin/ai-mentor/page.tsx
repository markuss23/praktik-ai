import { Suspense } from 'react';
import { AiMentorView } from '@/components/admin/views/AiMentorView';

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function AiMentorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AiMentorView />
    </Suspense>
  );
}
