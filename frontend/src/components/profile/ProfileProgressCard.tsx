'use client';

import { BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';

export interface ProgressItem {
  label: string;
  percentage: number;
  color?: string;
}

interface ProfileProgressCardProps {
  items: ProgressItem[];
}

function getBarColor(percentage: number, customColor?: string): string {
  if (customColor) return customColor;
  if (percentage >= 50) return 'bg-primary';
  if (percentage >= 25) return 'bg-brand-accent';
  return 'bg-destructive';
}

export function ProfileProgressCard({ items }: ProfileProgressCardProps) {
  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="size-5 text-foreground" />
        <h3 className="text-base font-bold text-foreground">Můj progress</h3>
      </div>

      {/* Progress rows */}
      <div className="flex flex-col gap-4">
        {items.map((item, idx) => {
          const barColor = getBarColor(item.percentage, item.color);
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-foreground">{item.percentage}%</span>
              </div>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.15, ease: 'easeOut' }}
                  className={`h-full rounded-full ${barColor}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
