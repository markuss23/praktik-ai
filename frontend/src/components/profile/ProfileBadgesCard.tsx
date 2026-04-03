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
  orange: 'bg-orange-100 text-orange-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
};

export function ProfileBadgesCard({ badges }: ProfileBadgesCardProps) {
  if (badges.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-gray-700" />
        <h3 className="text-base font-bold text-gray-900">Odznaky</h3>
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <span className="text-lg">{badge.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{badge.title}</p>
                <p className="text-xs text-gray-500">{badge.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
