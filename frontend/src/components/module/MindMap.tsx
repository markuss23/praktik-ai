'use client';

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { MindMap as MindMapData } from '@/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface MindMapNode {
  kind: 'root' | 'branch' | 'child';
  label: string;
  // Nazev vetve, pod kterou pojem patri (jen kind=child)
  branch?: string;
}

// Barvy vetvi z tokenu projektu; 7. vetev (max. pocet z backendu) dostane tlumenou
const BRANCH_COLORS = [
  'var(--tip)',
  'var(--primary)',
  'var(--brand-accent)',
  'var(--gradient-l)',
  'var(--gradient-r)',
  'var(--warning)',
  'var(--muted-foreground)',
];

// Pod touto sirkou kontejneru se strom zobrazi jako seznam temat; zpet na strom az o kus dal,
// aby se rozlozeni neprepinalo sem a tam, kdyz se objevi scrollbar
const TREE_MIN_WIDTH = 680;
const TREE_HYSTERESIS = 24;

const NODE_CLASS: Record<MindMapNode['kind'], string> = {
  root: 'max-w-44 justify-center rounded-xl bg-gradient-to-br from-gradient-l to-gradient-r px-4 py-3 text-center text-sm font-semibold text-primary-foreground',
  branch: 'max-w-40 rounded-lg border px-3 py-1.5 text-[13px] font-semibold text-foreground bg-[color-mix(in_oklch,var(--c)_14%,var(--card))] border-[color-mix(in_oklch,var(--c)_50%,transparent)]',
  child: 'max-w-44 gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground',
};

const INTERACTIVE_CLASS = cn(
  'cursor-pointer outline-none transition-shadow',
  'hover:ring-3 hover:ring-[color-mix(in_oklch,var(--c,var(--gradient-r))_25%,transparent)]',
  'focus-visible:ring-3 focus-visible:ring-ring/50',
  'data-[popup-open]:ring-3 data-[popup-open]:ring-gradient-r/40',
);

interface Edge {
  from: string;
  to: string;
  side: 'left' | 'right';
  color: string;
  width: number;
}

interface MindMapProps {
  map: MindMapData;
  // S renderActions je kazdy uzel tlacitko s nabidkou, bez nej jen ke cteni
  renderActions?: (node: MindMapNode, close: () => void) => ReactNode;
  // Vynuti rozlozeni; jinak podle sirky kontejneru
  layout?: 'tree' | 'outline';
  className?: string;
}

export function MindMap({ map, renderActions, layout, className }: MindMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  // null = jeste nezmereno
  const [autoMode, setAutoMode] = useState<'tree' | 'outline' | null>(null);
  const [paths, setPaths] = useState<{ d: string; color: string; width: number }[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const mode = layout ?? autoMode ?? 'outline';
  const rightCount = Math.ceil(map.branches.length / 2);

  const edges: Edge[] = map.branches.flatMap((branch, i) => {
    const side = i < rightCount ? 'right' : 'left';
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
    return [
      { from: 'root', to: `b${i}`, side, color, width: 2 },
      ...branch.children.map((_, j) => ({ from: `b${i}`, to: `b${i}-c${j}`, side, color, width: 1.5 }) as Edge),
    ];
  });

  // Spojnice z layout pozic uzlu (offset*), ne z getBoundingClientRect: ten zahrnuje transform
  // otviraci animace dialogu a ResizeObserver na zmenu transformu nereaguje
  const draw = useCallback(() => {
    const tree = treeRef.current;
    if (!tree) return;
    const rectIn = (el: HTMLElement | undefined) => {
      if (!el) return null;
      let left = 0;
      let top = 0;
      let cur: HTMLElement | null = el;
      while (cur && cur !== tree) {
        left += cur.offsetLeft;
        top += cur.offsetTop;
        cur = cur.offsetParent as HTMLElement | null;
      }
      if (cur !== tree) return null;
      return { left, top, right: left + el.offsetWidth, height: el.offsetHeight };
    };
    const next = edges.flatMap((edge) => {
      const a = rectIn(nodeRefs.current.get(edge.from));
      const b = rectIn(nodeRefs.current.get(edge.to));
      if (!a || !b) return [];
      const y1 = a.top + a.height / 2;
      const y2 = b.top + b.height / 2;
      const x1 = edge.side === 'right' ? a.right : a.left;
      const x2 = edge.side === 'right' ? b.left : b.right;
      const dx = (x2 - x1) / 2;
      return [{ d: `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, color: edge.color, width: edge.width }];
    });
    setPaths(next);
    // edges se odvozuji z map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      const w = wrapper.clientWidth;
      setAutoMode((prev) => {
        if (prev === 'outline') return w >= TREE_MIN_WIDTH + TREE_HYSTERESIS ? 'tree' : 'outline';
        return w >= TREE_MIN_WIDTH ? 'tree' : 'outline';
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (mode !== 'tree') return;
    draw();
    const tree = treeRef.current;
    if (!tree) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(tree);
    void document.fonts?.ready.then(() => draw());
    return () => observer.disconnect();
  }, [mode, draw]);

  const setNodeRef = (key: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(key, el);
    else nodeRefs.current.delete(key);
  };

  const renderNode = (key: string, node: MindMapNode, color?: string) => {
    const style = color ? ({ '--c': color } as CSSProperties) : undefined;
    const className = cn('relative inline-flex items-center text-left leading-snug', NODE_CLASS[node.kind]);
    const content = (
      <>
        {node.kind === 'child' && <span className="size-1.5 shrink-0 rounded-full" style={{ background: 'var(--c)' }} />}
        <span className="min-w-0 break-words">{node.label}</span>
      </>
    );
    if (!renderActions) {
      return <span key={key} ref={setNodeRef(key)} className={className} style={style}>{content}</span>;
    }
    return (
      // Zavreni A nesmi zavrit prave otevreny B
      <Popover key={key} open={openKey === key} onOpenChange={(open) => setOpenKey((cur) => (open ? key : cur === key ? null : cur))}>
        <PopoverTrigger ref={setNodeRef(key)} className={cn(className, INTERACTIVE_CLASS)} style={style}>
          {content}
        </PopoverTrigger>
        <PopoverContent side="bottom" className="w-64" aria-label={`Pojem ${node.label}`}>
          {renderActions(node, () => setOpenKey(null))}
        </PopoverContent>
      </Popover>
    );
  };

  const branchGroup = (index: number, side: 'left' | 'right') => {
    const branch = map.branches[index];
    const color = BRANCH_COLORS[index % BRANCH_COLORS.length];
    return (
      <div key={index} className={cn('flex items-center gap-7', side === 'left' && 'flex-row-reverse')}>
        {renderNode(`b${index}`, { kind: 'branch', label: branch.label }, color)}
        <div className={cn('flex min-w-0 flex-col gap-1.5', side === 'left' ? 'items-end' : 'items-start')}>
          {branch.children.map((child, j) =>
            renderNode(`b${index}-c${j}`, { kind: 'child', label: child, branch: branch.label }, color),
          )}
        </div>
      </div>
    );
  };

  const indexes = map.branches.map((_, i) => i);

  return (
    <div ref={wrapperRef} className={cn('w-full', className)} role="group" aria-label={`Myšlenková mapa: ${map.root}`}>
      {mode === 'tree' ? (
        <div ref={treeRef} className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-10 px-2 py-4">
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
            {paths.map((p, i) => (
              <path
                key={i}
                d={p.d}
                fill="none"
                strokeLinecap="round"
                style={{ stroke: p.color, strokeWidth: p.width, strokeOpacity: p.width > 1.6 ? 0.6 : 0.42 }}
              />
            ))}
          </svg>
          <div className="relative flex min-w-0 flex-col gap-4">
            {indexes.filter((i) => i >= rightCount).map((i) => branchGroup(i, 'left'))}
          </div>
          <div className="relative">{renderNode('root', { kind: 'root', label: map.root })}</div>
          <div className="relative flex min-w-0 flex-col gap-4">
            {indexes.filter((i) => i < rightCount).map((i) => branchGroup(i, 'right'))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-2">
          <div>{renderNode('root', { kind: 'root', label: map.root })}</div>
          {map.branches.map((branch, i) => {
            const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
            return (
              <div key={i} className="flex flex-col items-start gap-2 border-l-3 pl-3" style={{ borderColor: color }}>
                {renderNode(`b${i}`, { kind: 'branch', label: branch.label }, color)}
                <div className="flex flex-wrap gap-1.5">
                  {branch.children.map((child, j) =>
                    renderNode(`b${i}-c${j}`, { kind: 'child', label: child, branch: branch.label }, color),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
