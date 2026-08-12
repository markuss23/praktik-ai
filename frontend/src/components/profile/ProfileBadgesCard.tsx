'use client';

import { motion } from 'motion/react';
import { Award } from 'lucide-react';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface ProfileBadgesCardProps {
  badges: Badge[];
}

const BADGE_COLORS: Record<string, string> = {
  orange: 'bg-brand-accent/20 text-brand-accent',
  green: 'bg-success/20 text-success',
  purple: 'bg-gradient-r/20 text-gradient-r',
  blue: 'bg-tip/20 text-tip',
  red: 'bg-destructive/20 text-destructive',
};

export function ProfileBadgesCard({ badges }: ProfileBadgesCardProps) {
  if (badges.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="size-5 text-foreground" />
        <h3 className="text-base font-bold text-foreground">Odznaky</h3>
      </div>
      <div className="flex flex-col gap-3">
        {badges.map((badge, idx) => {
          const colorClass = BADGE_COLORS[badge.color] ?? BADGE_COLORS.green;
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                <span className="text-lg">{badge.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{badge.title}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
