'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';

export type CreationTab = 'general' | 'rubric';

interface CourseCreationTabsProps {
  activeTab: CreationTab;
  onChange: (tab: CreationTab) => void;
}

// Kitový `line` variant kreslí podtržení přes `after:`. Přebarvíme ho na
// gradient-r a posadíme na spodní border lišty — tj. přesně tam, kde bylo
// dřív ručně vykreslené <span>. Modifikátory musí být uvedené se stejným
// prefixem jako v kitu, jinak by se kvůli specificitě neuplatnily.
const TAB_CLASS = [
  'flex-none rounded-none px-4 py-2.5 text-sm font-medium',
  'text-muted-foreground hover:text-foreground data-active:text-gradient-r',
  'after:rounded-full after:bg-gradient-r',
  'group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-[-1px]',
].join(' ');

// Sdílená navigace záložek "Obecné" / "Rubrika" pro stránky tvorby kurzu.
export function CourseCreationTabs({ activeTab, onChange }: CourseCreationTabsProps) {
  return (
    <div className="bg-card border-b border-border">
      <div className="px-4 sm:px-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onChange(value as CreationTab)}
          className="gap-0"
        >
          <TabsList
            variant="line"
            className="gap-1 p-0 group-data-horizontal/tabs:h-auto"
          >
            <TabsTrigger value="general" className={TAB_CLASS}>
              Obecné
            </TabsTrigger>
            <TabsTrigger value="rubric" className={TAB_CLASS}>
              Rubrika
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}

export default CourseCreationTabs;
