'use client';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '../ui-kit/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui-kit/dropdown-menu';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  /** Zvýrazněná položka ve značkovém gradientu. */
  gradient?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
}

/**
 * Akční dropdown nad kitovým `DropdownMenu` — pozicování, klik mimo, klávesnice
 * i stacking řeší Base UI menu.
 */
export function Dropdown({ trigger, items }: DropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="lg" />}>
        {trigger}
        <ChevronDown
          data-icon="inline-end"
          className="transition-transform group-aria-expanded/button:rotate-180"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={item.onClick}
            className={cn(
              'gap-3 px-3 py-2.5 font-medium',
              item.gradient &&
                'bg-gradient-to-r from-gradient-r to-gradient-l text-primary-foreground focus:from-gradient-r/90 focus:to-gradient-l/90 focus:text-primary-foreground',
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SimpleBotIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
