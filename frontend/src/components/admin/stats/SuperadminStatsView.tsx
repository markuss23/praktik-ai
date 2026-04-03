'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getCourses, listEnrollments } from '@/lib/api-client';
import type { Course, Enrollment } from '@/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, ChevronUp, Users, BookOpen, TrendingUp, GraduationCap, Loader2 } from 'lucide-react';

interface CourseWithStats {
  course: Course;
  enrollments: Enrollment[];
  completedCount: number;
  completionRate: number;
}

const PAGE_SIZE = 10;
const CHART_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#10b981', '#f97316', '#6366f1'];

export function SuperadminStatsView() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courseStats, setCourseStats] = useState<Map<number, CourseWithStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [statsLoadedUpTo, setStatsLoadedUpTo] = useState(0);

  // Load all courses
  useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      try {
        const courses = await getCourses({ includeInactive: true });
        if (!cancelled) {
          setAllCourses(courses);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    loadCourses();
    return () => { cancelled = true; };
  }, []);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return allCourses;
    const q = searchQuery.toLowerCase();
    return allCourses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q))
    );
  }, [allCourses, searchQuery]);

  // Visible courses
  const visibleCourses = useMemo(() => {
    return filteredCourses.slice(0, visibleCount);
  }, [filteredCourses, visibleCount]);

  const hasMore = visibleCount < filteredCourses.length;

  // Load stats for visible courses
  const loadStatsForCourses = useCallback(async (courses: Course[]) => {
    const newStats = new Map(courseStats);
    const toLoad = courses.filter(c => !newStats.has(c.courseId));
    if (toLoad.length === 0) return;

    const promises = toLoad.map(async (course) => {
      try {
        const enrollments = await listEnrollments({ courseId: course.courseId });
        const completedCount = enrollments.filter(e => e.completedAt !== null).length;
        const completionRate = enrollments.length > 0
          ? Math.round((completedCount / enrollments.length) * 100)
          : 0;
        return {
          course,
          enrollments,
          completedCount,
          completionRate,
        } satisfies CourseWithStats;
      } catch {
        return {
          course,
          enrollments: [] as Enrollment[],
          completedCount: 0,
          completionRate: 0,
        } satisfies CourseWithStats;
      }
    });

    const results = await Promise.all(promises);
    results.forEach(r => newStats.set(r.course.courseId, r));
    setCourseStats(newStats);
  }, [courseStats]);

  // Load stats when visible courses change
  useEffect(() => {
    if (visibleCourses.length > statsLoadedUpTo) {
      loadStatsForCourses(visibleCourses);
      setStatsLoadedUpTo(visibleCourses.length);
    }
  }, [visibleCourses, statsLoadedUpTo, loadStatsForCourses]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setVisibleCount(prev => prev + PAGE_SIZE);
    // Stats will load via the useEffect above
    setTimeout(() => setLoadingMore(false), 500);
  };

  // Global stats
  const globalStats = useMemo(() => {
    const loadedStats = Array.from(courseStats.values());
    const totalEnrolled = loadedStats.reduce((sum, cs) => sum + cs.enrollments.length, 0);
    const totalCompleted = loadedStats.reduce((sum, cs) => sum + cs.completedCount, 0);
    const avgCompletion = loadedStats.length > 0
      ? Math.round(loadedStats.reduce((sum, cs) => sum + cs.completionRate, 0) / loadedStats.length)
      : 0;
    return { totalEnrolled, totalCompleted, avgCompletion, coursesCount: allCourses.length };
  }, [courseStats, allCourses]);

  // Top courses chart data
  const topCoursesChartData = useMemo(() => {
    return Array.from(courseStats.values())
      .sort((a, b) => b.enrollments.length - a.enrollments.length)
      .slice(0, 8)
      .map(cs => ({
        name: cs.course.title.length > 18 ? cs.course.title.slice(0, 18) + '…' : cs.course.title,
        fullName: cs.course.title,
        enrolled: cs.enrollments.length,
        completed: cs.completedCount,
      }));
  }, [courseStats]);

  // Completion pie chart data
  const pieData = useMemo(() => {
    const total = globalStats.totalEnrolled;
    if (total === 0) return [];
    return [
      { name: 'Dokončeno', value: globalStats.totalCompleted, fill: '#22c55e' },
      { name: 'Rozpracováno', value: total - globalStats.totalCompleted, fill: '#e5e7eb' },
    ];
  }, [globalStats]);

  if (loading) {
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
        Statistiky platformy
      </motion.h1>

      {/* Global overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: BookOpen, label: 'Kurzů celkem', value: globalStats.coursesCount, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Users, label: 'Celkem zapsaných', value: globalStats.totalEnrolled, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: GraduationCap, label: 'Celkem dokončilo', value: globalStats.totalCompleted, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: TrendingUp, label: 'Prům. úspěšnost', value: `${globalStats.avgCompletion}%`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top kurzy dle zápisů</h2>
          {topCoursesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topCoursesChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === 'enrolled' ? 'Zapsaných' : 'Dokončilo',
                  ]}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName ?? '';
                  }}
                />
                <Bar dataKey="enrolled" name="Zapsaných" radius={[4, 4, 0, 0]}>
                  {topCoursesChartData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} opacity={0.4} />
                  ))}
                </Bar>
                <Bar dataKey="completed" name="Dokončilo" radius={[4, 4, 0, 0]}>
                  {topCoursesChartData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Žádná data k zobrazení</p>
          )}
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Míra dokončení</h2>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    strokeWidth={0}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Studentů']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  Dokončeno
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-200" />
                  Rozpracováno
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Žádná data</p>
          )}
        </motion.div>
      </div>

      {/* Search + course list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Všechny kurzy</h2>
          <span className="text-sm text-gray-500">{filteredCourses.length} kurzů</span>
        </div>

        {/* Search field */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
              setStatsLoadedUpTo(0);
            }}
            placeholder="Hledat kurz podle názvu..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
          />
        </div>

        {/* Course list */}
        <div className="flex flex-col gap-2">
          {visibleCourses.map((course, idx) => {
            const stats = courseStats.get(course.courseId);
            const isExpanded = expandedCourseId === course.courseId;
            const enrolledCount = stats?.enrollments.length ?? 0;
            const completedCount = stats?.completedCount ?? 0;
            const completionRate = stats?.completionRate ?? 0;

            return (
              <motion.div
                key={course.courseId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCourseId(isExpanded ? null : course.courseId)}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left min-w-0">
                    <div
                      className="w-2 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{course.title}</h3>
                      <p className="text-xs text-gray-500">
                        {stats
                          ? `${enrolledCount} zapsaných · ${completedCount} dokončilo · ${completionRate}%`
                          : 'Načítání...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {stats && (
                      <div className="hidden sm:flex items-center gap-1">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 w-8 text-right">{completionRate}%</span>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && stats && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">{enrolledCount}</p>
                            <p className="text-xs text-gray-500">Zapsaných</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-green-600">{completedCount}</p>
                            <p className="text-xs text-gray-500">Dokončilo</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-orange-500">{enrolledCount - completedCount}</p>
                            <p className="text-xs text-gray-500">Rozpracovaných</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-lg font-bold text-purple-600">{completionRate}%</p>
                            <p className="text-xs text-gray-500">Úspěšnost</p>
                          </div>
                        </div>

                        {/* Completion bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Míra dokončení</span>
                            <span className="font-semibold text-gray-900">{completionRate}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${completionRate}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full bg-green-500"
                            />
                          </div>
                        </div>

                        {/* Module info */}
                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs font-bold">{course.modulesCount ?? 0}</span>
                            modulů v kurzu
                          </span>
                          <span>Stav: <span className="font-medium text-gray-700">{course.status}</span></span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Načítání...
                </>
              ) : (
                `Zobrazit další (${Math.min(PAGE_SIZE, filteredCourses.length - visibleCount)} z ${filteredCourses.length - visibleCount})`
              )}
            </button>
          </div>
        )}

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Search size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? `Žádné kurzy nenalezeny pro "${searchQuery}"` : 'Zatím nejsou žádné kurzy.'}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
