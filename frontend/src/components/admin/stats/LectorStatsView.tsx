'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getCourses, listEnrollments, getCourseProgress } from '@/lib/api-client';
import type { Course, Enrollment, ModuleCompletionStatus } from '@/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Users, BookOpen, TrendingUp } from 'lucide-react';

interface CourseStats {
  course: Course;
  enrollments: Enrollment[];
  moduleProgress: Map<number, ModuleCompletionStatus[]>;
  completionRate: number;
  avgScore: number;
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
        const myCourses = courses.filter(c => c.ownerId === currentUser!.userId);

        const statsPromises = myCourses.map(async (course) => {
          try {
            const enrollments = await listEnrollments({ courseId: course.courseId });
            const completedCount = enrollments.filter(e => e.completedAt !== null).length;
            const completionRate = enrollments.length > 0
              ? Math.round((completedCount / enrollments.length) * 100)
              : 0;

            let moduleProgress = new Map<number, ModuleCompletionStatus[]>();
            // Load module progress for each enrolled user (sample first 20)
            const sampleEnrollments = enrollments.slice(0, 20);
            for (const enrollment of sampleEnrollments) {
              try {
                const progress = await getCourseProgress(course.courseId);
                if (!cancelled) {
                  moduleProgress.set(enrollment.userId, progress);
                }
              } catch {
                // skip individual failures
              }
            }

            return {
              course,
              enrollments,
              moduleProgress,
              completionRate,
              avgScore: 0,
            } satisfies CourseStats;
          } catch {
            return {
              course,
              enrollments: [],
              moduleProgress: new Map(),
              completionRate: 0,
              avgScore: 0,
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
      fullName: cs.course.title,
      enrolled: cs.enrollments.length,
      completed: cs.enrollments.filter(e => e.completedAt !== null).length,
      completionRate: cs.completionRate,
    }));
  }, [courseStats]);

  const totalEnrolled = courseStats.reduce((sum, cs) => sum + cs.enrollments.length, 0);
  const totalCompleted = courseStats.reduce((sum, cs) => sum + cs.enrollments.filter(e => e.completedAt !== null).length, 0);
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { icon: BookOpen, label: 'Moje kurzy', value: courseStats.length, color: 'text-blue-600' },
              { icon: Users, label: 'Celkem zapsaných', value: totalEnrolled, color: 'text-green-600' },
              { icon: TrendingUp, label: 'Průměrná úspěšnost', value: `${avgCompletion}%`, color: 'text-purple-600' },
            ].map((card, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
              >
                <div className={`p-3 rounded-lg bg-gray-50 ${card.color}`}>
                  <card.icon size={24} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.label}</p>
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overviewChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === 'enrolled' ? 'Zapsaných' : 'Dokončilo',
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName ?? label;
                  }}
                />
                <Bar dataKey="enrolled" name="Zapsaných" radius={[4, 4, 0, 0]}>
                  {overviewChartData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} opacity={0.4} />
                  ))}
                </Bar>
                <Bar dataKey="completed" name="Dokončilo" radius={[4, 4, 0, 0]}>
                  {overviewChartData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Per-course details */}
          <div className="flex flex-col gap-3">
            {courseStats.map((cs, idx) => {
              const isExpanded = expandedCourseId === cs.course.courseId;
              const enrolledCount = cs.enrollments.length;
              const completedCount = cs.enrollments.filter(e => e.completedAt !== null).length;

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
                          {enrolledCount} zapsaných · {completedCount} dokončilo · {cs.completionRate}% úspěšnost
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
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
                              <p className="text-xl font-bold text-purple-600">{cs.completionRate}%</p>
                              <p className="text-xs text-gray-500">Úspěšnost</p>
                            </div>
                          </div>

                          {/* Completion progress bar */}
                          <div className="mb-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Míra dokončení</span>
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

                          {/* Module count info */}
                          <p className="text-sm text-gray-500 mt-3">
                            Kurz obsahuje {cs.course.modulesCount ?? 0} modulů
                          </p>
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
