'use client';

import { motion } from 'motion/react';

const pulse = 'animate-pulse bg-gray-200 rounded';

// Reusable shimmer block
function S({ className }: { className: string }) {
  return <div className={`${pulse} ${className}`} />;
}

/**
  Skeleton knihovna, loading komponent s motion animacemi
  AdminDashboardSkeleton - řádky tabulky s pulse efektem (pro admin dashboard)
  AuthSkeleton - plynule rotující spinner s fade-in textem (pro přihlášení)
  ReviewCardsSkeleton - grid karet s pulse efektem (pro stránku ke schválení)
  AiMentorSkeleton - accordion karty s pulse efektem (pro AI Mentor nastavení)
  PageSpinner - univerzální motion spinner s volitelným textem (pro Suspense fallbacky)
  CourseDetailSkeleton - skeleton detailu kurzu
  ProfileSkeleton - spinner pro profil stránku
 */

/**
 * Admin dashboard / course list skeleton
 */
export function AdminDashboardSkeleton() {
  return (
    <motion.div
      className="flex-1 p-6 lg:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <S className="h-8 w-48 mb-6" />
      <div className="flex items-center gap-3 mb-6">
        <S className="h-10 w-64 rounded-md" />
        <S className="h-10 w-32 rounded-md" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
            <S className="h-5 w-5 rounded" />
            <S className="h-5 flex-1 max-w-[280px]" />
            <S className="h-5 w-20" />
            <S className="h-6 w-24 rounded-full" />
            <S className="h-5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Auth / login page skeleton
 */
export function AuthSkeleton() {
  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="text-center">
        <motion.div
          className="w-14 h-14 rounded-full mx-auto mb-5"
          style={{
            border: '3px solid #e5e7eb',
            borderTopColor: '#8B5BA8',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <motion.p
          className="text-gray-500 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Přihlašování…
        </motion.p>
      </div>
    </motion.div>
  );
}

/**
 * Review page card grid skeleton
 */
export function ReviewCardsSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <S className="h-4 w-32 mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 animate-pulse">
            <S className="h-5 w-20 rounded-full" />
            <div>
              <S className="h-5 w-3/4 mb-2" />
              <S className="h-4 w-24" />
            </div>
            <S className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * AI Mentor settings skeleton (accordion cards)
 */
export function AiMentorSkeleton() {
  return (
    <motion.div
      className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <S className="h-8 w-40 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <S className="h-6 w-48" />
              <S className="h-6 w-6 rounded" />
            </div>
            {i === 1 && (
              <>
                <S className="h-4 w-24 mb-2" />
                <S className="h-10 w-full rounded-md mb-4" />
                <S className="h-4 w-16 mb-2" />
                <S className="h-32 w-full rounded-md" />
              </>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Generic page-level spinner with motion (for Suspense fallbacks)
 */
export function PageSpinner({ message }: { message?: string }) {
  return (
    <motion.div
      className="flex-1 flex items-center justify-center min-h-[400px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{
            border: '3px solid #e5e7eb',
            borderTopColor: '#8B5BA8',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        {message && (
          <motion.span
            className="text-gray-400 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {message}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Course detail page skeleton
 */
export function CourseDetailSkeleton() {
  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: '#F0F0F0' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-5xl mx-auto px-4 py-10">
        <S className="h-8 w-2/3 mb-4" />
        <S className="h-4 w-full mb-2" />
        <S className="h-4 w-5/6 mb-6" />
        <div className="flex gap-3 mb-8">
          <S className="h-10 w-40 rounded-md" />
          <S className="h-10 w-32 rounded-md" />
        </div>
        <div className="bg-white rounded-xl p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100">
              <S className="h-8 w-8 rounded-full" />
              <S className="h-5 flex-1 max-w-[300px]" />
              <S className="h-6 w-20 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Profile page skeleton
 */
export function ProfileSkeleton() {
  return (
    <motion.div
      className="flex items-center justify-center min-h-[60vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{
            border: '3px solid #e5e7eb',
            borderTopColor: '#8B5BA8',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <span className="text-gray-400 text-sm">Načítání profilu…</span>
      </div>
    </motion.div>
  );
}
