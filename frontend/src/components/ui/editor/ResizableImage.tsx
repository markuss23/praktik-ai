'use client';

import Image from '@tiptap/extension-image';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Trash2, WrapText } from 'lucide-react';

type Align = 'none' | 'left' | 'center' | 'right';

const wrapperStyleFor = (align: Align, width: number | null): CSSProperties => {
  const base: CSSProperties = {
    position: 'relative',
    maxWidth: '100%',
    width: width ? `${width}px` : 'auto',
    lineHeight: 0,
  };
  if (align === 'left') {
    return { ...base, float: 'left', marginRight: '1rem', marginBottom: '0.5rem' };
  }
  if (align === 'right') {
    return { ...base, float: 'right', marginLeft: '1rem', marginBottom: '0.5rem' };
  }
  if (align === 'center') {
    return { ...base, display: 'block', marginLeft: 'auto', marginRight: 'auto' };
  }
  return { ...base, display: 'inline-block', verticalAlign: 'baseline' };
};

const HANDLE_SIZE = 12;

interface ResizeSession {
  direction: 'left' | 'right';
  startX: number;
  startWidth: number;
}

const ResizableImageView = ({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizeSession, setResizeSession] = useState<ResizeSession | null>(null);

  const align = (node.attrs.align as Align) || 'none';
  const width = node.attrs.width ? Number(node.attrs.width) : null;
  const isEditable = editor.isEditable;
  const resizing = resizeSession !== null;

  // Listeners are bound only while a session is active and reliably cleaned up via
  // useEffect — including the case where the node unmounts mid-drag.
  useEffect(() => {
    if (!resizeSession) return;
    const { direction, startX, startWidth } = resizeSession;

    const onMove = (ev: PointerEvent) => {
      const delta = direction === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const next = Math.max(60, Math.round(startWidth + delta));
      updateAttributes({ width: next });
    };
    const onUp = () => setResizeSession(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizeSession, updateAttributes]);

  const startResize = (direction: 'left' | 'right') => (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (!isEditable) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = imgRef.current?.getBoundingClientRect().width ?? wrapperRef.current?.offsetWidth ?? 0;
    setResizeSession({ direction, startX, startWidth });
  };

  const showOverlay = isEditable && (selected || resizing);
  const wrapperStyle = wrapperStyleFor(align, width);

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapperRef}
      style={wrapperStyle}
      data-drag-handle
      data-align={align}
      className={`resizable-image group ${selected ? 'is-selected' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        draggable={false}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: '0.5rem',
          outline: showOverlay ? '2px solid rgb(147 51 234)' : 'none',
          cursor: isEditable ? 'grab' : 'default',
          userSelect: 'none',
        }}
      />

      {showOverlay && (
        <>
          <span
            onPointerDown={startResize('left')}
            style={{
              position: 'absolute',
              left: -HANDLE_SIZE / 2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: 'rgb(147 51 234)',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'ew-resize',
              zIndex: 2,
            }}
            contentEditable={false}
          />
          <span
            onPointerDown={startResize('right')}
            style={{
              position: 'absolute',
              right: -HANDLE_SIZE / 2,
              top: '50%',
              transform: 'translateY(-50%)',
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: 'rgb(147 51 234)',
              border: '2px solid white',
              borderRadius: '50%',
              cursor: 'ew-resize',
              zIndex: 2,
            }}
            contentEditable={false}
          />

          <span
            contentEditable={false}
            style={{
              position: 'absolute',
              top: -36,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: '4px',
              background: 'white',
              border: '1px solid rgb(229 231 235)',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              zIndex: 3,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <AlignButton active={align === 'left'} title="Vlevo s obtékáním" onClick={() => updateAttributes({ align: 'left' })}>
              <AlignLeft size={14} />
            </AlignButton>
            <AlignButton active={align === 'center'} title="Na střed" onClick={() => updateAttributes({ align: 'center' })}>
              <AlignCenter size={14} />
            </AlignButton>
            <AlignButton active={align === 'right'} title="Vpravo s obtékáním" onClick={() => updateAttributes({ align: 'right' })}>
              <AlignRight size={14} />
            </AlignButton>
            <AlignButton active={align === 'none'} title="V řádku textu" onClick={() => updateAttributes({ align: 'none' })}>
              <WrapText size={14} />
            </AlignButton>
            <span style={{ width: 1, height: 16, background: 'rgb(229 231 235)', margin: '0 2px' }} />
            <AlignButton title="Smazat obrázek" onClick={() => deleteNode()} danger>
              <Trash2 size={14} />
            </AlignButton>
          </span>
        </>
      )}
    </NodeViewWrapper>
  );
};

function AlignButton({
  children,
  onClick,
  title,
  active = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  const color = danger ? 'rgb(220 38 38)' : active ? 'rgb(126 34 206)' : 'rgb(55 65 81)';
  const bg = active ? 'rgb(243 232 255)' : 'transparent';
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        padding: 4,
        background: bg,
        border: 'none',
        borderRadius: 4,
        color,
        cursor: 'pointer',
        display: 'inline-flex',
      }}
    >
      {children}
    </button>
  );
}

export const ResizableImage = Image.extend({
  name: 'image',
  inline: true,
  group: 'inline',
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute('width') || (element as HTMLElement).style.width;
          if (!w) return null;
          const parsed = parseInt(String(w), 10);
          return Number.isFinite(parsed) ? parsed : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}px` };
        },
      },
      align: {
        default: 'none',
        parseHTML: (element) => element.getAttribute('data-align') || 'none',
        renderHTML: (attributes) => {
          if (!attributes.align || attributes.align === 'none') return {};
          return { 'data-align': attributes.align };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;
