'use client';

import { Moon, Sun, type LucideIcon } from 'lucide-react';

import { useTheme } from '@/components/ui';
import { SegmentedControl, SegmentedControlItem } from '@/components/ui-kit/segmented-control';
import type { Theme } from '@/lib/theme';

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Světlý', icon: Sun },
  { value: 'dark', label: 'Tmavý', icon: Moon },
];

// Volba barevneho rezimu, pamatuje se pro prihlaseneho uzivatele (viz lib/theme.ts)
export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div>
        <p id="theme-settings-title" className="text-sm font-semibold text-foreground">
          Vzhled
        </p>
        <p className="text-xs text-muted-foreground">
          Zapamatuje se k vašemu účtu
        </p>
      </div>
      <SegmentedControl
        aria-labelledby="theme-settings-title"
        value={theme}
        onValueChange={setTheme}
        className="w-full"
      >
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <SegmentedControlItem key={value} value={value} className="flex-1">
            <Icon data-icon="inline-start" />
            {label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}
