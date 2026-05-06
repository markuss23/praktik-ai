'use client';

export type CreationTab = 'general' | 'rubric';

interface CourseCreationTabsProps {
  activeTab: CreationTab;
  onChange: (tab: CreationTab) => void;
}

// Sdílená navigace záložek "Obecné" / "Rubrika" pro stránky tvorby kurzu.
export function CourseCreationTabs({ activeTab, onChange }: CourseCreationTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6">
        <nav className="flex gap-1" role="tablist">
          <TabButton
            label="Obecné"
            active={activeTab === 'general'}
            onClick={() => onChange('general')}
          />
          <TabButton
            label="Rubrika"
            active={activeTab === 'rubric'}
            onClick={() => onChange('rubric')}
          />
        </nav>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'text-purple-700'
          : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      <span>{label}</span>
      <span
        className={`absolute left-2 right-2 -bottom-px h-0.5 rounded-full transition-colors ${
          active ? 'bg-purple-600' : 'bg-transparent'
        }`}
      />
    </button>
  );
}

export default CourseCreationTabs;
