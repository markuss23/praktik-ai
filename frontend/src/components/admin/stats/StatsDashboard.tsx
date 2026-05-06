'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, BookOpen, TrendingUp, Layers, CheckCircle2, BarChart3,
  X, Activity, Sparkles, Clock, ArrowRight,
} from 'lucide-react';
import type { Module } from '@/api';
import { czechPlural } from '@/lib/utils';
import {
  StatCard, ChartTile, EmptyChart, CustomTooltip,
  TimeRangeToggle, CourseFilterDropdown, StatusFilterChips, PublishFilterChips,
  CompactCourseTile, FocusedCourseDetail,
  COURSE_PALETTE, RANGE_DAYS, RANGE_LABELS, STATUS_COLORS, STATUS_LABELS, TILES_PER_PAGE,
  type CourseStats, type TimeRange, type PublishState,
} from './components';

interface StatsDashboardProps {
  /** Page heading shown next to the sparkles icon. */
  title: string;
  /** Optional subheading below the title. */
  subtitle?: string;
  /** Course statistics to render — empty array shows the empty-state. */
  courseStats: CourseStats[];
  /** Whether the parent is still fetching `courseStats` (renders the skeleton). */
  loading: boolean;
  /** When true, course tiles and detail header surface the course owner's display name. */
  showOwner?: boolean;
  /** Message shown when there are no courses at all (no filters applied). */
  emptyMessage?: string;
  /**
   * Optional async loader for a course's modules. Used when the parent doesn't pre-load
   * modules into `courseStats` (e.g. the superadmin view) — invoked when the focused
   * course detail mounts and `stats.modules` is empty.
   */
  onRequestModules?: (courseId: number) => Promise<Module[]>;
}

export function StatsDashboard({
  title,
  subtitle,
  courseStats,
  loading,
  showOwner = false,
  emptyMessage = 'Zatím nemáte žádné kurzy.',
  onRequestModules,
}: StatsDashboardProps) {
  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedPublishStates, setSelectedPublishStates] = useState<Set<PublishState>>(new Set());
  const [focusedCourseId, setFocusedCourseId] = useState<number | null>(null);
  const [tilesPage, setTilesPage] = useState(0);

  // Available statuses from full set (for chips)
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    courseStats.forEach(cs => set.add(cs.course.status as string));
    return Array.from(set).sort();
  }, [courseStats]);

  // Apply filters
  const filtered = useMemo(() =>
    courseStats.filter(cs => {
      if (selectedCourseIds.size > 0 && !selectedCourseIds.has(cs.course.courseId)) return false;
      if (selectedStatuses.size > 0 && !selectedStatuses.has(cs.course.status as string)) return false;
      if (selectedPublishStates.size > 0) {
        const isPub = !!cs.course.isPublished;
        const matches =
          (isPub && selectedPublishStates.has('published')) ||
          (!isPub && selectedPublishStates.has('unpublished'));
        if (!matches) return false;
      }
      return true;
    }),
  [courseStats, selectedCourseIds, selectedStatuses, selectedPublishStates]);

  // Reset pagination + focus when filters change
  useEffect(() => {
    setTilesPage(0);
    setFocusedCourseId(null);
  }, [selectedCourseIds, selectedStatuses, selectedPublishStates]);

  // Stable color per course (mapped against the full unfiltered set so colors don't shift)
  const courseColors = useMemo(() => {
    const map = new Map<number, string>();
    courseStats.forEach((cs, i) => map.set(cs.course.courseId, COURSE_PALETTE[i % COURSE_PALETTE.length]));
    return map;
  }, [courseStats]);

  // KPI totals
  const totals = useMemo(() => {
    const totalEnrolled = filtered.reduce((sum, cs) => sum + cs.enrollments.length, 0);
    const totalCompleted = filtered.reduce((sum, cs) => sum + cs.enrollments.filter(e => e.completedAt !== null).length, 0);
    const avgCompletion = filtered.length > 0
      ? Math.round(filtered.reduce((sum, cs) => sum + cs.completionRate, 0) / filtered.length)
      : 0;
    return { totalEnrolled, totalCompleted, avgCompletion };
  }, [filtered]);

  // Time-series enrollments + completions
  const timeSeries = useMemo(() => {
    const days = RANGE_DAYS[timeRange];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = days ? today.getTime() - (days - 1) * 86400000 : 0;

    const buckets = new Map<string, { date: string; new: number; completed: number; sortKey: number }>();
    const fmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' });

    if (days) {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000);
        const key = fmt.format(d);
        buckets.set(key, { date: key, new: 0, completed: 0, sortKey: d.getTime() });
      }
    }

    filtered.forEach(cs => {
      cs.enrollments.forEach(e => {
        const created = new Date(e.createdAt).getTime();
        if (created >= startTime) {
          const d = new Date(created); d.setHours(0, 0, 0, 0);
          const key = fmt.format(d);
          const b = buckets.get(key) ?? { date: key, new: 0, completed: 0, sortKey: d.getTime() };
          b.new++;
          buckets.set(key, b);
        }
        if (e.completedAt) {
          const completed = new Date(e.completedAt).getTime();
          if (completed >= startTime) {
            const d = new Date(completed); d.setHours(0, 0, 0, 0);
            const key = fmt.format(d);
            const b = buckets.get(key) ?? { date: key, new: 0, completed: 0, sortKey: d.getTime() };
            b.completed++;
            buckets.set(key, b);
          }
        }
      });
    });

    return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [filtered, timeRange]);

  // Status distribution (from full set — global overview)
  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    courseStats.forEach(cs => {
      const s = cs.course.status as string;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([status, value]) => ({
      name: STATUS_LABELS[status] ?? status,
      value,
      color: STATUS_COLORS[status] ?? '#9ca3af',
    }));
  }, [courseStats]);

  // Top courses by completion rate (filtered)
  const topByCompletion = useMemo(() => (
    [...filtered]
      .filter(cs => cs.enrollments.length > 0)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 6)
      .map(cs => ({
        name: cs.course.title.length > 22 ? cs.course.title.slice(0, 22) + '…' : cs.course.title,
        courseId: cs.course.courseId,
        Úspěšnost: cs.completionRate,
        color: courseColors.get(cs.course.courseId) ?? '#6366f1',
      }))
  ), [filtered, courseColors]);

  // Enrollments per course (stacked: completed vs in-progress)
  const enrollmentsPerCourse = useMemo(() => (
    filtered
      .map(cs => {
        const completed = cs.enrollments.filter(e => e.completedAt !== null).length;
        return {
          name: cs.course.title.length > 18 ? cs.course.title.slice(0, 18) + '…' : cs.course.title,
          Dokončilo: completed,
          Probíhá: cs.enrollments.length - completed,
        };
      })
      .filter(d => d.Dokončilo > 0 || d.Probíhá > 0)
      .slice(0, 8)
  ), [filtered]);

  // Pagination (max 8 tiles per page = 2 rows × 4 cols on xl)
  const totalPages = Math.max(1, Math.ceil(filtered.length / TILES_PER_PAGE));
  const safePage = Math.min(tilesPage, totalPages - 1);
  const visibleTiles = useMemo(
    () => filtered.slice(safePage * TILES_PER_PAGE, (safePage + 1) * TILES_PER_PAGE),
    [filtered, safePage],
  );
  const hasMorePages = totalPages > 1;

  const focused = focusedCourseId != null ? filtered.find(cs => cs.course.courseId === focusedCourseId) ?? null : null;
  const hasActiveFilters = selectedCourseIds.size > 0 || selectedStatuses.size > 0 || selectedPublishStates.size > 0;

  // Stable handlers — without these, memoized children (CompactCourseTile, dropdowns)
  // re-render every keystroke because parent passes a fresh inline arrow each render.
  const resetFilters = useCallback(() => {
    setSelectedCourseIds(new Set());
    setSelectedStatuses(new Set());
    setSelectedPublishStates(new Set());
    setFocusedCourseId(null);
  }, []);

  const handleCourseFilterChange = useCallback((s: Set<number>) => {
    setSelectedCourseIds(s);
    setFocusedCourseId(null);
  }, []);

  const handleTileSelect = useCallback((courseId: number) => {
    setFocusedCourseId(prev => (prev === courseId ? null : courseId));
  }, []);

  const closeFocused = useCallback(() => setFocusedCourseId(null), []);

  const goToNextPage = useCallback(() => {
    setTilesPage(p => (p + 1) % totalPages);
  }, [totalPages]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8 bg-gray-100 min-h-full">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 h-72 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          <div className="lg:col-span-4 h-72 bg-white rounded-2xl border border-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-1"
      >
        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-md">
          <Sparkles size={18} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black">{title}</h1>
      </motion.div>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-gray-500 mb-6 ml-12"
        >
          {subtitle}
        </motion.p>
      )}

      {courseStats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Filter bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Období</span>
                <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
              </div>
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <CourseFilterDropdown
                courses={courseStats.map(cs => cs.course)}
                selected={selectedCourseIds}
                onChange={handleCourseFilterChange}
              />
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <StatusFilterChips
                available={availableStatuses}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
              />
              <div className="h-6 w-px bg-gray-200 hidden sm:block" />
              <PublishFilterChips
                selected={selectedPublishStates}
                onChange={setSelectedPublishStates}
              />
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-purple-700 transition-colors"
                >
                  <X size={12} /> Resetovat filtry
                </button>
              )}
            </div>
          </motion.div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard
              icon={BookOpen}
              label="Filtrované kurzy"
              value={filtered.length}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              delay={0.1}
            />
            <StatCard
              icon={Users}
              label="Celkem zapsaných"
              value={totals.totalEnrolled}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
              delay={0.15}
            />
            <StatCard
              icon={CheckCircle2}
              label="Dokončilo"
              value={totals.totalCompleted}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              delay={0.2}
            />
            <StatCard
              icon={TrendingUp}
              label="Průměrná úspěšnost"
              value={totals.avgCompletion}
              suffix="%"
              gradient="bg-gradient-to-br from-purple-500 to-fuchsia-600"
              delay={0.25}
            />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
            <ChartTile
              title="Vývoj zápisů a dokončení"
              subtitle={`Posledních ${RANGE_LABELS[timeRange].toLowerCase()}`}
              icon={Activity}
              className="lg:col-span-8"
              delay={0.3}
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-new" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-completed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="new" name="Nové zápisy" stroke="#6366f1" strokeWidth={2} fill="url(#grad-new)" />
                  <Area type="monotone" dataKey="completed" name="Dokončili" stroke="#10b981" strokeWidth={2} fill="url(#grad-completed)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-5 text-xs text-gray-600 pt-2 border-t border-gray-100 mt-2">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Nové zápisy</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Dokončili</span>
              </div>
            </ChartTile>

            <ChartTile
              title="Stav kurzů"
              subtitle={`${courseStats.length} ${czechPlural(courseStats.length, 'kurz', 'kurzy', 'kurzů')} celkem`}
              icon={Layers}
              className="lg:col-span-4"
              delay={0.35}
            >
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    isAnimationActive
                    animationDuration={800}
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {statusDistribution.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded-full px-2 py-0.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                    {s.name} <strong className="text-gray-900">{s.value}</strong>
                  </span>
                ))}
              </div>
            </ChartTile>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
            <ChartTile
              title="Top kurzy podle úspěšnosti"
              subtitle="Žebříček dokončení"
              icon={TrendingUp}
              className="lg:col-span-6"
              delay={0.4}
            >
              {topByCompletion.length === 0 ? (
                <EmptyChart message="Zatím žádné dokončené zápisy" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, topByCompletion.length * 38)}>
                  <BarChart data={topByCompletion} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#374151' }} stroke="#e5e7eb" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Úspěšnost" radius={[0, 6, 6, 0]} animationDuration={800}>
                      {topByCompletion.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartTile>

            <ChartTile
              title="Zápisy podle kurzů"
              subtitle="Probíhající vs dokončené"
              icon={BarChart3}
              className="lg:col-span-6"
              delay={0.45}
            >
              {enrollmentsPerCourse.length === 0 ? (
                <EmptyChart message="Žádné zápisy pro vybraný filtr" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={enrollmentsPerCourse} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Dokončilo" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} animationDuration={800} />
                    <Bar dataKey="Probíhá" stackId="a" fill="#6366f1" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center justify-center gap-5 text-xs text-gray-600 pt-2 border-t border-gray-100 mt-1">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Dokončilo</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Probíhá</span>
              </div>
            </ChartTile>
          </div>

          {/* Course tiles header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between mb-3 gap-3 flex-wrap"
          >
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen size={16} className="text-purple-600" />
              {filtered.length === 0
                ? 'Žádné kurzy odpovídající filtru'
                : hasMorePages
                  ? `Detail kurzů (${safePage * TILES_PER_PAGE + 1}–${safePage * TILES_PER_PAGE + visibleTiles.length} z ${filtered.length})`
                  : `Detail kurzů (${filtered.length})`}
            </h2>
            {hasMorePages && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setTilesPage(i)}
                      aria-label={`Přejít na stránku ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === safePage ? 'w-6 bg-purple-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={goToNextPage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                >
                  <span>Načíst další</span>
                  <motion.span
                    key={safePage}
                    initial={{ x: -4, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ArrowRight size={13} />
                  </motion.span>
                </button>
              </div>
            )}
          </motion.div>

          {/* Compact course tiles grid (paginated, max 8 per page = 2 rows × 4) */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={safePage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              >
                {visibleTiles.map((cs, idx) => (
                  <CompactCourseTile
                    key={cs.course.courseId}
                    stats={cs}
                    color={courseColors.get(cs.course.courseId) ?? '#6366f1'}
                    onSelect={handleTileSelect}
                    isSelected={cs.course.courseId === focusedCourseId}
                    idx={idx}
                    showOwner={showOwner}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Focused course detail */}
          <AnimatePresence>
            {focused && (
              <motion.div
                key={focused.course.courseId}
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-5 overflow-hidden"
              >
                <FocusedCourseDetail
                  stats={focused}
                  color={courseColors.get(focused.course.courseId) ?? '#6366f1'}
                  onClose={closeFocused}
                  onRequestModules={onRequestModules}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
