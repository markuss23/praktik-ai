'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';

interface SideTooltipProps {
  label: string;
  enabled: boolean;
  children: React.ReactElement;
}

export function SideTooltip({ label, enabled, children }: SideTooltipProps) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
