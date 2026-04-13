'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getCourses, listEnrollments, getModules } from '@/lib/api-client';
import type { Course, Enrollment, Module } from '@/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Users, BookOpen, TrendingUp, Layers } from 'lucide-react';

interface CourseStats {
  course: Course;
  enrollments: Enrollment[];
  modules: Module[];
  completionRate: number;
}

const CHART_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export function LectorStatsView() {
  const { currentUser, loading: userLoading } = useCurrentUser();
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    async function loadStats() {
      try {
        const courses = await getCourses({ includeInactive: true });
        const myCourses = courses.filter(c => c.ownerId === currentUser!.userId && c.isActive);

        const statsPromises = myCourses.map(async (course) => {
          try {
            const [enrollments, modules] = await Promise.all([
              listEnrollments({ courseId: course.courseId }),
              getModules({ courseId: course.courseId }),
            ]);
            const completedCount = enrollments.filter(e => e.completedAt !== null).length;
            const completionRate = enrollments.length > 0
              ? Math.round((completedCount / enrollments.length) * 100)
              : 0;

            return {
              course,
              enrollments,
              modules: modules.filter(m => m.isActive),
              completionRate,
            } satisfies CourseStats;
          } catch {
            return {
              course,
              enrollments: [],
              modules: [],
              completionRate: 0,
            } satisfies CourseStats;
          }
        });

        const results = await Promise.all(statsPromises);
        if (!cancelled) {
          setCourseStats(results);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    loadStats();
    return () => { cancelled = true; };
  }, [currentUser]);

  const overviewChartData = useMemo(() => {
    return courseStats.map(cs => ({
      name: cs.course.title.length > 20 ? cs.course.title.slice(0, 20) + '…' : cs.course.title,
      'Zapsaných': cs.enrollments.length,
      'Dokončilo': cs.enrollments.filter(e => e.completedAt !== null).length,
    }));
  }, [courseStats]);

  const totalEnrolled = courseStats.reduce((sum, cs) => sum + cs.enrollments.length, 0);
  const totalModules = courseStats.reduce((sum, cs) => sum + cs.modules.length, 0);
  const avgCompletion = courseStats.length > 0
    ? Math.round(courseStats.reduce((sum, cs) => sum + cs.completionRate, 0) / courseStats.length)
    : 0;

  if (userLoading || loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6">Statistiky</h1>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-40 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-full">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold text-black mb-6"
      >
        Statistiky mých kurzů
      </motion.h1>

      {courseStats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Zatím nemáte žádné kurzy.</p>
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { icon: BookOpen, label: 'Moje kurzy', value: courseStats.length, color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Layers, label: 'Celkem modulů', value: totalModules, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: Users, label: 'Celkem zapsaných', value: totalEnrolled, color: 'text-green-600', bg: 'bg-green-50' },
              { icon: TrendingUp, label: 'Průměrná úspěšnost', value: `${avgCompletion}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${card.bg} ${card.color}`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Overview chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Přehled úspěšnosti kurzů</h2>
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={overviewChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis width={48} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Zapsaných" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dokončilo" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Per-course details */}
          <div className="flex flex-col gap-3">
            {courseStats.map((cs, idx) => {
              const isExpanded = expandedCourseId === cs.course.courseId;
              const enrolledCount = cs.enrollments.length;
              const completedCount = cs.enrollments.filter(e => e.completedAt !== null).length;
              const moduleCount = cs.modules.length;

              return (
                <motion.div
                  key={cs.course.courseId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCourseId(isExpanded ? null : cs.course.courseId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div
                        className="w-2 h-10 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{cs.course.title}</h3>
                        <p className="text-sm text-gray-500">
                          {enrolledCount} zapsaných · {completedCount} dokončilo · {moduleCount} modulů · {cs.completionRate}%
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-gray-900">{enrolledCount}</p>
                              <p className="text-xs text-gray-500">Zapsaných</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-green-600">{completedCount}</p>
                              <p className="text-xs text-gray-500">Dokončilo</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-orange-500">{enrolledCount - completedCount}</p>
                              <p className="text-xs text-gray-500">Rozpracovaných</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-indigo-600">{moduleCount}</p>
                              <p className="text-xs text-gray-500">Modulů</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-purple-600">{cs.completionRate}%</p>
                              <p className="text-xs text-gray-500">Úspěšnost</p>
                            </div>
                          </div>

                          {/* Completion progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Míra dokončení kurzu</span>
                              <span className="font-semibold text-gray-900">{cs.completionRate}%</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cs.completionRate}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                              />
                            </div>
                          </div>

                          {/* Module list */}
                          {cs.modules.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Layers size={14} />
                                Moduly kurzu ({cs.modules.length})
                              </h4>
                              <div className="space-y-2">
                                {cs.modules.map((mod, mIdx) => (
                                  <div key={mod.moduleId} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{mIdx + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800 truncate">{mod.title}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mod.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {mod.isActive ? 'Aktivní' : 'Neaktivní'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
