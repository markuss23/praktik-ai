'use client';

import { useParams } from 'next/navigation';
import { StaffTicketDetailView } from '@/components/admin/views/StaffTicketDetailView';

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  return <StaffTicketDetailView ticketId={Number(params.id)} />;
}
