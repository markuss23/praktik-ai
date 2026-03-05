import { BarChart2 } from 'lucide-react';

export interface ProgressItem {
  label: string;
  percentage: number;
  color?: string; // tailwind bg color class, e.g. 'bg-green-500'
}

interface ProfileProgressCardProps {
  items: ProgressItem[];
}

function getBarColor(percentage: number, customColor?: string): string {
  if (customColor) return customColor;
  if (percentage >= 50) return 'bg-green-500';
  if (percentage >= 25) return 'bg-orange-400';
  return 'bg-red-400';
}

export function ProfileProgressCard({ items }: ProfileProgressCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <BarChart2 className="w-5 h-5 text-gray-700" />
        <h3 className="text-base font-bold text-gray-900">Můj progress</h3>
      </div>

      {/* Progress rows */}
      <div className="flex flex-col gap-4">
        {items.map((item, idx) => {
          const barColor = getBarColor(item.percentage, item.color);
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-gray-800">{item.label}</span>
                <span className="text-sm font-semibold text-gray-800">{item.percentage}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
