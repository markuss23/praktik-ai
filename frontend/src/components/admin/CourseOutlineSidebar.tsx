'use client';

import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

export interface OutlineSubItem {
  label: string;
  onClick?: () => void;
}

export interface OutlineModule {
  id: number;
  title: string;
  subItems?: OutlineSubItem[];
}

interface CourseOutlineSidebarProps {
  /** Normalized module data for built-in rendering. Ignored when children are provided. */
  modules?: OutlineModule[];
  /** Index of the currently active module (highlighted in purple). */
  selectedIndex?: number;
  /** Set of indices whose sub-item list is currently expanded. */
  expandedItems?: Set<number>;
  /** Called when the user clicks a module row to toggle its sub-items. */
  onToggleExpand?: (index: number) => void;
  /** Called when a collapsed module is opened (i.e. when it becomes the active one). */
  onSelectModule?: (index: number) => void;
  /** When provided, shows a + button in the header and calls this on click. */
  onAddModule?: () => void;
  /** Tailwind width class, defaults to "w-64". */
  width?: string;
  /** Custom list content (e.g. DnD list). Replaces built-in module rendering. */
  children?: React.ReactNode;
}

export function CourseOutlineSidebar({
  modules = [],
  selectedIndex,
  expandedItems = new Set(),
  onToggleExpand,
  onSelectModule,
  onAddModule,
  width = 'w-64',
  children,
}: CourseOutlineSidebarProps) {
  return (
    <div className={`${width} flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 flex flex-col`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-black">Osnova kurzu</h2>
          {onAddModule && (
            <button
              className="p-1 hover:bg-gray-100 rounded"
              onClick={onAddModule}
              title="Přidat modul"
            >
              <Plus size={18} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {children ?? (
          <>
            {modules.map((module, index) => {
              const isExpanded = expandedItems.has(index);
              const isSelected = selectedIndex === index;
              return (
                <div key={module.id} className="border-b border-gray-100 last:border-b-0">
                  <div
                    className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                      isSelected
                        ? 'bg-purple-50 border-l-4 border-l-purple-600'
                        : 'border-l-4 border-l-transparent'
                    }`}
                    onClick={() => {
                      if (!isExpanded) {
                        onSelectModule?.(index);
                      }
                      onToggleExpand?.(index);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-gray-400" />
                    ) : (
                      <ChevronUp size={16} className="text-gray-400" />
                    )}
                    <span className="text-sm text-black font-medium truncate">{module.title}</span>
                  </div>

                  {isExpanded && module.subItems && module.subItems.length > 0 && (
                    <div className="pb-2">
                      {module.subItems.map((subItem, subIndex) => (
                        <div
                          key={subIndex}
                          className={`pl-10 pr-4 py-2 text-xs text-gray-600 truncate ${
                            subItem.onClick ? 'hover:bg-gray-50 cursor-pointer' : ''
                          }`}
                          onClick={subItem.onClick}
                        >
                          {subItem.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {modules.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Žádné moduly
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CourseOutlineSidebar;
