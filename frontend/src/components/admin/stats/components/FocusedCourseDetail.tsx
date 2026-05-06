'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Layers, X, Loader2 } from 'lucide-react';
import type { Module } from '@/api';
import { type CourseStats } from './constants';
import { AnimatedNumber, EmptyChart, CustomTooltip } from './StatsPrimitives';

interface FocusedCourseDetailProps {
  stats: CourseStats;
  color: string;
  onClose: () => void;
  /** Optional callback to lazy-load modules when none are available in stats */
  onRequestModules?: (courseId: number) => Promise<Module[]>;
}

export function FocusedCourseDetail({ stats, color, onClose, onRequestModules }: FocusedCourseDetailProps) {
  const completedCount = stats.enrollments.filter(e => e.completedAt !== null).length;
  const inProgress = stats.enrollments.length - completedCount;

  // Lazy-loaded modules (used by the superadmin view to avoid fetching every course's modules upfront)
  const [lazyModules, setLazyModules] = useState<Module[] | null>(null);
  const [modulesLoading, setModulesLoading] = useState(false);

  useEffect(() => {
    if (stats.modules.length > 0 || !onRequestModules) {
      setLazyModules(null);
      return;
    }
    let cancelled = false;
    setModulesLoading(true);
    onRequestModules(stats.course.courseId)
      .then(mods => { if (!cancelled) setLazyModules(mods); })
      .catch(() => { if (!cancelled) setLazyModules([]); })
      .finally(() => { if (!cancelled) setModulesLoading(false); });
    return () => { cancelled = true; };
  }, [stats.course.courseId, stats.modules.length, onRequestModules]);

  const modules = stats.modules.length > 0 ? stats.modules : (lazyModules ?? []);
  const activeModules = modules.filter(m => m.isActive);
  const inactiveModules = modules.length - activeModules.length;

  const enrollmentsByMonth = useMemo(() => {
    const map = new Map<string, { name: string; sortKey: number; Zápisy: number; Dokončili: number }>();
    const fmt = new Intl.DateTimeFormat('cs-CZ', { month: 'short', year: '2-digit' });
    stats.enrollments.forEach(e => {
      const created = new Date(e.createdAt);
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const label = fmt.format(created);
      const cur = map.get(key) ?? { name: label, sortKey: created.getFullYear() * 12 + created.getMonth(), Zápisy: 0, Dokončili: 0 };
      cur.Zápisy++;
      if (e.completedAt) cur.Dokončili++;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [stats]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-2 h-12 rounded-full" style={{ background: color }} />
          <div>
            <h3 className="text-lg font-bold text-gray-900">{stats.course.title}</h3>
            <p className="text-xs text-gray-500">
              Detailní přehled vybraného kurzu
              {stats.course.ownerDisplayName && (
                <> · vlastník <span className="font-medium text-gray-700">{stats.course.ownerDisplayName}</span></>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          title="Zavřít detail"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radial completion */}
        <div className="lg:col-span-4 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Míra dokončení</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hotovo', value: stats.completionRate, fill: color },
                    { name: 'Zbývá', value: 100 - stats.completionRate, fill: '#f3f4f6' },
                  ]}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={75}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  animationDuration={1000}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold text-gray-900 tabular-nums">
                <AnimatedNumber value={stats.completionRate} suffix="%" />
              </div>
              <div className="text-[11px] text-gray-500">úspěšnost</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center mt-3">
            <div>
              <div className="text-lg font-bold text-emerald-600 tabular-nums">{completedCount}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Dokončilo</div>
            </div>
            <div>
              <div className="text-lg font-bold text-indigo-600 tabular-nums">{inProgress}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Probíhá</div>
            </div>
          </div>
        </div>

        {/* Monthly cohort */}
        <div className="lg:col-span-8 bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vývoj v čase (po měsících)</p>
          {enrollmentsByMonth.length === 0 ? (
            <EmptyChart message="Žádné zápisy" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={enrollmentsByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Zápisy" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={800} />
                <Bar dataKey="Dokončili" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Module list */}
        <div className="lg:col-span-12 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Layers size={12} />
              Moduly kurzu
            </p>
            {modules.length > 0 && (
              <span className="text-[10px] text-gray-500">
                {activeModules.length} aktivních · {inactiveModules} neaktivních
              </span>
            )}
          </div>
          {modulesLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
              <Loader2 size={14} className="animate-spin" /> Načítání modulů…
            </div>
          ) : modules.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Žádné moduly</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {modules.map((mod, i) => (
                <motion.div
                  key={mod.moduleId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-lg p-3 flex items-center gap-2 border border-gray-100"
                >
                  <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-sm text-gray-800 flex-1 truncate">{mod.title}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${mod.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {mod.isActive ? 'Aktivní' : 'Neaktivní'}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
