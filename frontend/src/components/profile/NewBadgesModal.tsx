'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Award, PartyPopper } from 'lucide-react';
import type { Badge } from './ProfileBadgesCard';

interface NewBadgesModalProps {
  isOpen: boolean;
  badges: Badge[];
  onConfirm: () => void;
}

const BADGE_COLORS: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-600 border-orange-200',
  green: 'bg-green-100 text-green-600 border-green-200',
  purple: 'bg-purple-100 text-purple-600 border-purple-200',
  blue: 'bg-blue-100 text-blue-600 border-blue-200',
  red: 'bg-red-100 text-red-600 border-red-200',
};

export function NewBadgesModal({ isOpen, badges, onConfirm }: NewBadgesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && badges.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Confetti header */}
            <div className="bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 px-6 py-8 text-center relative overflow-hidden">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
              >
                <PartyPopper className="w-12 h-12 text-white mx-auto mb-3" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-2xl font-bold text-white"
              >
                Nové odznaky!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-green-100 text-sm mt-1"
              >
                Gratulujeme k vašemu pokroku!
              </motion.p>
            </div>

            {/* Badges list */}
            <div className="px-6 py-5">
              <div className="flex flex-col gap-3">
                {badges.map((badge, idx) => {
                  const colorClass = BADGE_COLORS[badge.color] ?? BADGE_COLORS.green;
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.15, duration: 0.4, ease: 'easeOut' }}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${colorClass}`}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + idx * 0.15, duration: 0.3, type: 'spring', stiffness: 300 }}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm flex-shrink-0"
                      >
                        <span className="text-2xl">{badge.icon}</span>
                      </motion.div>
                      <div>
                        <p className="text-base font-bold text-gray-900">{badge.title}</p>
                        <p className="text-sm text-gray-600">{badge.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Confirm button */}
            <div className="px-6 pb-6">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + badges.length * 0.15, duration: 0.3 }}
                onClick={onConfirm}
                className="w-full py-3 text-white font-semibold bg-green-500 hover:bg-green-600 rounded-xl transition-colors shadow-sm"
              >
                Super, díky!
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
