'use client';

import { useEffect, type ReactNode, type ElementType } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { BarChart3 } from 'lucide-react';

export function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 18, mass: 1 });
  const display = useTransform(spring, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => { motionValue.set(value); }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
}

export function StatCard({
  icon: Icon, label, value, gradient, delay = 0, suffix,
}: {
  icon: ElementType;
  label: string;
  value: number;
  gradient: string;
  delay?: number;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', damping: 18, stiffness: 180 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10 ${gradient}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">
            <AnimatedNumber value={value} suffix={suffix} />
          </p>
        </div>
        <div className={`p-2.5 rounded-xl ${gradient} text-white shadow-sm`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}

export function ChartTile({
  title, subtitle, icon: Icon, children, className = '', delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            {Icon && <Icon size={15} className="text-purple-600" />}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-56 text-gray-400 text-sm">
      <BarChart3 size={32} className="mb-2 opacity-50" />
      {message}
    </div>
  );
}

interface TooltipPayloadEntry { color?: string; name?: string | number; value?: number | string }
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      {label !== undefined && <p className="font-semibold text-gray-900 mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-gray-700">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span>{entry.name}:</span>
          <strong className="ml-auto tabular-nums">{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg py-1.5 text-center">
      <div className="text-sm font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
