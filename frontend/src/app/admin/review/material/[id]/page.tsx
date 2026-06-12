import { Suspense } from 'react';
import { ReviewMaterialView } from '@/components/admin/views/ReviewMaterialView';
import { PageSpinner } from '@/components/ui';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewMaterialPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageSpinner message="Načítání materiálu…" />}>
      <ReviewMaterialView resourceId={Number(id)} />
    </Suspense>
  );
}
