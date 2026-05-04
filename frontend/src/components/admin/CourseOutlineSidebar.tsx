'use client';

import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

export interface OutlineSubItem {
  id: string;
  label: string;
}

export interface OutlineItem {
  id: number;
  title: string;
  isExpanded: boolean;
  isSelected: boolean;
  isTemporary?: boolean;
  feedbackCount?: number;
  subItems?: OutlineSubItem[];
  subContent?: string;
}

interface CourseOutlineSidebarProps {
  items: OutlineItem[];
  onToggle: (index: number) => void;
  onSelect: (index: number) => void;
  onAddClick?: () => void;
  onClose?: () => void;
  renderSubItems?: (item: OutlineItem, index: number) => React.ReactNode;
  className?: string;
}

export function CourseOutlineSidebar({
  items,
  onToggle,
  onSelect,
  onAddClick,
  onClose,
  renderSubItems,
  className,
}: CourseOutlineSidebarProps) {
  const containerClass = className ?? 'hidden lg:flex w-64 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 flex-col';
  return (
    <div className={containerClass}>
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-black">Osnova kurzu</h2>
          <div className="flex items-center gap-1">
            {onAddClick && (
              <button
                className="p-1 hover:bg-gray-100 rounded"
                onClick={onAddClick}
                title="Přidat modul"
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            )}
            {onClose && (
              <button
                className="p-1 hover:bg-gray-100 rounded"
                onClick={onClose}
                title="Zavřít"
                aria-label="Zavřít osnovu"
              >
                <X size={16} className="text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.map((item, index) => (
          <div key={item.id} className="border-b border-gray-100 last:border-b-0">
            <div
              className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                item.isSelected
                  ? 'bg-purple-50 border-l-4 border-l-purple-600'
                  : 'border-l-4 border-l-transparent'
              } ${item.isTemporary ? 'bg-yellow-50' : ''}`}
              onClick={() => {
                onToggle(index);
                onSelect(index);
              }}
            >
              {item.isExpanded ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronUp size={16} className="text-gray-400" />
              )}
              <span className="text-sm text-black font-medium truncate flex-1">
                {item.title}
                {item.isTemporary && <span className="text-xs text-yellow-600 ml-2">(nový)</span>}
              </span>
              {(item.feedbackCount ?? 0) > 0 && (
                <span className="flex-shrink-0 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.feedbackCount}
                </span>
              )}
            </div>
            {item.isExpanded && renderSubItems && renderSubItems(item, index)}
            {item.isExpanded && !renderSubItems && item.subContent && (
              <div
                className="pl-10 pr-4 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer truncate"
                onClick={() => onSelect(index)}
              >
                {item.subContent}
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            Žádné moduly
          </div>
        )}
      </div>
    </div>
  );
}
