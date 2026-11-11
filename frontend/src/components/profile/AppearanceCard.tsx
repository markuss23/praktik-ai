'use client';

import { useId } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/**
 * Přepínač tmavého režimu jako karta profilu (stejná skladba jako
 * přepínače v cookie-consent: celý řádek je <label>, switch nese aria-labelledby).
 * Volba se pamatuje v prohlížeči — viz `lib/theme.ts`.
 */
export function AppearanceCard({ className }: { className?: string }) {
  const id = useId();
  const { isDark, setTheme } = useTheme();
  const Icon = isDark ? Moon : Sun;

  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <Icon className="size-5 shrink-0 text-foreground" aria-hidden />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span id={`${id}-title`} className="text-sm font-semibold text-foreground">
          Tmavý režim
        </span>
        <span id={`${id}-description`} className="text-xs text-muted-foreground">
          Vzhled aplikace v tomto prohlížeči
        </span>
      </span>
      <Switch
        checked={isDark}
        onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      />
    </label>
  );
}
