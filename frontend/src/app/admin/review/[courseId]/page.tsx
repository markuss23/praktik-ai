import { Suspense } from 'react';
import { ReviewCourseView } from '@/components/admin/views/ReviewCourseView';

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Načítání kurzu...</span>
      </div>
    </div>
  );
}

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function ReviewCoursePage({ params }: Props) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReviewCourseView courseId={Number(courseId)} />
    </Suspense>
  );
}
