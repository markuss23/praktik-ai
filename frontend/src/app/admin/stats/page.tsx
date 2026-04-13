'use client';

import { useRole } from '@/hooks/useRole';
import { LectorStatsView } from '@/components/admin/stats/LectorStatsView';
import { SuperadminStatsView } from '@/components/admin/stats/SuperadminStatsView';

export default function StatsPage() {
  const { isSuperAdmin } = useRole();

  if (isSuperAdmin) {
    return <SuperadminStatsView />;
  }

  return <LectorStatsView />;
}
