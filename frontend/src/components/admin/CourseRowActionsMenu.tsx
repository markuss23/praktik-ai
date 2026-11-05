'use client';

import { Ellipsis, Loader2, type LucideIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';

export interface CourseRowAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  /** Nevratná akce (smazání) — v menu je oddělená čarou a červeně. */
  destructive?: boolean;
}

interface CourseRowActionsMenuProps {
  courseTitle: string;
  actions: CourseRowAction[];
  /** Probíhá změna stavu kurzu — místo teček se točí spinner. */
  busy?: boolean;
}

/**
 * Akce kurzu v řádku přehledu schované pod „⋯".
 * Popup je v portálu mimo řádek, proto `data-accordion-keep` — jinak by klik
 * do menu zavřel rozbalený kurz dřív, než se akce spustí.
 */
export function CourseRowActionsMenu({ courseTitle, actions, busy = false }: CourseRowActionsMenuProps) {
  if (actions.length === 0) return <span className="text-sm text-muted-foreground">—</span>;

  const regular = actions.filter((a) => !a.destructive);
  const destructive = actions.filter((a) => a.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        disabled={busy}
        aria-label={`Akce kurzu ${courseTitle}`}
        title="Akce"
      >
        {busy ? <Loader2 className="animate-spin" /> : <Ellipsis />}
      </DropdownMenuTrigger>

      <DropdownMenuContent data-accordion-keep align="end" className="w-auto min-w-48">
        {regular.map((action) => (
          <DropdownMenuItem
            key={action.key}
            onClick={action.onSelect}
            disabled={action.disabled}
            className="gap-2.5 px-2.5 py-2"
          >
            <action.icon />
            {action.label}
          </DropdownMenuItem>
        ))}
        {regular.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((action) => (
          <DropdownMenuItem
            key={action.key}
            variant="destructive"
            onClick={action.onSelect}
            disabled={action.disabled}
            className="gap-2.5 px-2.5 py-2"
          >
            <action.icon />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
