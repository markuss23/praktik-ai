'use client';

import { motion } from 'motion/react';

interface StatItem {
  value: string;
  label: string;
}

interface ProfileStatsGridProps {
  stats: StatItem[];
}

export function ProfileStatsGrid({ stats }: ProfileStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.08 }}
          className="bg-white rounded-xl shadow-sm p-5 flex flex-col items-center justify-center text-center"
        >
          <span className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</span>
          <span className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
