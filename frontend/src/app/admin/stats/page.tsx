import { BarChart3 } from 'lucide-react';

export default function StatsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6">Statistiky</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center justify-center text-center">
        <BarChart3 size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg font-medium">Bude implementováno později</p>
      </div>
    </div>
  );
}
