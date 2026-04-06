'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from './ConfirmModal';
import type { MyEnrollment } from '@/api';

interface ProfileModulesSectionProps {
  enrollments: MyEnrollment[];
}

function ModuleCard({ enrollment, onRepeatClick }: { enrollment: MyEnrollment; onRepeatClick: (e: MyEnrollment) => void }) {
  const isCompleted = !!enrollment.completedAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between min-w-[260px] max-w-[340px] w-full"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">
            Modul {enrollment.completedModules ?? 0}/{enrollment.totalModules ?? 0}
          </span>
          {isCompleted && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Splněno
            </span>
          )}
        </div>
        <h4
          className="text-base font-semibold mb-0.5"
          style={isCompleted
            ? { color: '#16a34a' }
            : { background: 'linear-gradient(90deg, #6366F1, #8B5BA8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
          }
        >
          {enrollment.course.title}
        </h4>
        {enrollment.course.description && (
          <p className="text-sm text-gray-500 line-clamp-1">{enrollment.course.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <BookOpen size={14} />
          <span>{enrollment.totalModules ?? 0} lekce</span>
        </div>
        {/* {isCompleted && (
          <button
            onClick={() => onRepeatClick(enrollment)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
          >
            Zopakovat kurz
          </button>
        )} */}
      </div>
    </motion.div>
  );
}

export function ProfileModulesSection({ enrollments }: ProfileModulesSectionProps) {
  const [showInProgress, setShowInProgress] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [repeatConfirm, setRepeatConfirm] = useState<MyEnrollment | null>(null);

  const inProgress = enrollments.filter(e => !e.completedAt);
  const completed = enrollments.filter(e => !!e.completedAt);

  function handleRepeatConfirm() {
    if (repeatConfirm) {
      window.location.href = `/courses/${repeatConfirm.courseId}`;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rozpracované kurzy */}
      {inProgress.length > 0 && (
        <div>
          <button
            onClick={() => setShowInProgress(!showInProgress)}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="text-lg font-bold text-gray-900">Rozpracované kurzy</h3>
            {showInProgress ? (
              <ChevronDown size={22} className="text-gray-400" />
            ) : (
              <ChevronUp size={22} className="text-gray-400" />
            )}
          </button>
          <AnimatePresence>
            {showInProgress && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {inProgress.map(e => (
                    <ModuleCard key={e.enrollmentId} enrollment={e} onRepeatClick={setRepeatConfirm} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Dokončené kurzy */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full mb-3"
          >
            <h3 className="text-lg font-bold text-gray-900">Dokončené kurzy</h3>
            {showCompleted ? (
              <ChevronUp size={22} className="text-gray-400" />
            ) : (
              <ChevronDown size={22} className="text-gray-400" />
            )}
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {completed.map(e => (
                    <ModuleCard key={e.enrollmentId} enrollment={e} onRepeatClick={setRepeatConfirm} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {enrollments.length === 0 && (
        <p className="text-sm text-gray-500">Nejste zapsáni v žádném kurzu.</p>
      )}

      {/* Repeat confirmation modal */}
      <ConfirmModal
        isOpen={!!repeatConfirm}
        title="Zopakovat kurz?"
        message={`Opravdu chcete znovu začít kurz „${repeatConfirm?.course.title ?? ''}"? Váš předchozí pokrok zůstane zachován.`}
        confirmLabel="Ano, zopakovat"
        cancelLabel="Zrušit"
        onConfirm={handleRepeatConfirm}
        onCancel={() => setRepeatConfirm(null)}
      />
    </div>
  );
}
