import { Suspense } from 'react';
import { ReviewCourseView } from '@/components/admin/views/ReviewCourseView';
import { PageSpinner } from '@/components/ui';

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function ReviewCoursePage({ params }: Props) {
  const { courseId } = await params;
  return (
    <Suspense fallback={<PageSpinner message="Načítání kurzu…" />}>
      <ReviewCourseView courseId={Number(courseId)} />
    </Suspense>
  );
}
