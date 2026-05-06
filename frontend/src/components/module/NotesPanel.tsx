'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent, Editor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  NotebookText,
  X,
  Pin,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
} from 'lucide-react';

const STORAGE_KEY = 'praktik-course-notes';
const PANEL_WIDTH = 380;

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function NotesToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      return {
        isHeading2: e.isActive('heading', { level: 2 }),
        isBold: e.isActive('bold'),
        isItalic: e.isActive('italic'),
        isUnderline: e.isActive('underline'),
        isStrike: e.isActive('strike'),
        isBulletList: e.isActive('bulletList'),
        isOrderedList: e.isActive('orderedList'),
      };
    },
  });

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50/60">
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={!!state?.isHeading2}
        title="Nadpis"
      >
        <Heading2 size={15} />
      </ToolbarBtn>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={!!state?.isBold}
        title="Tučné (Ctrl+B)"
      >
        <Bold size={15} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={!!state?.isItalic}
        title="Kurzíva (Ctrl+I)"
      >
        <Italic size={15} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={!!state?.isUnderline}
        title="Podtržené (Ctrl+U)"
      >
        <UnderlineIcon size={15} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={!!state?.isStrike}
        title="Přeškrtnuté"
      >
        <Strikethrough size={15} />
      </ToolbarBtn>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={!!state?.isBulletList}
        title="Odrážkový seznam"
      >
        <List size={15} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={!!state?.isOrderedList}
        title="Číslovaný seznam"
      >
        <ListOrdered size={15} />
      </ToolbarBtn>
    </div>
  );
}

export default function NotesPanel() {
  // pinned   = uživatelská preference — panel zůstává otevřený a po hoveru se nezavírá
  // dismissed = dočasné zavření křížkem; resetuje se, jakmile uživatel znovu najede na úchyt
  // hovering  = myš je nad úchytem nebo panelem (otevírá při hoveru)
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const open = !dismissed && (pinned || hovering);

  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleEnter = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    // Návrat na úchyt/panel ruší dočasné dismissnutí — pin preference zůstává.
    setDismissed(false);
    setHovering(true);
  };
  const handleLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovering(false), 180);
  };
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Křížek panel jen schová — pin preference se zachovává, takže další hover ho zase otevře už v připnutém stavu.
  const closePanel = () => {
    setDismissed(true);
    setHovering(false);
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const [initialContent, setInitialContent] = useState<string | null>(null);

  // Load saved notes from localStorage once on mount (client-side)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setInitialContent(saved ?? '');
    } catch {
      setInitialContent('');
    }
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2] },
        }),
        Placeholder.configure({
          placeholder: 'Zapiš si své nápady a postřehy z této lekce…',
        }),
      ],
      content: initialContent ?? '',
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: 'notes-editor focus:outline-none',
        },
      },
      onUpdate: ({ editor }) => {
        try {
          localStorage.setItem(STORAGE_KEY, editor.getHTML());
        } catch {
          /* quota exceeded — silently ignore */
        }
      },
    },
    [initialContent !== null],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-focus editor pouze při explicitním otevření kliknutím (pinned),
  // hover-otevření focus nepropouští (uživatel by stejně musel kliknout).
  useEffect(() => {
    if (pinned && editor) {
      const t = setTimeout(() => editor.commands.focus('end'), 280);
      return () => clearTimeout(t);
    }
  }, [pinned, editor]);

  return (
    <>
      {/* Collapsed handle — vertical tab on the right edge */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="notes-handle"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onFocus={handleEnter}
            onBlur={handleLeave}
            onClick={() => setPinned(true)}
            aria-label="Otevřít poznámky"
            className="fixed right-0 z-40 flex flex-col items-center gap-2.5 bg-white rounded-l-xl shadow-lg border border-r-0 border-gray-200 px-2.5 py-4 hover:bg-gray-50 transition-colors group"
            style={{ top: 140, color: '#8B5BA8' }}
          >
            <NotebookText size={20} />
            <span
              className="text-[11px] font-semibold tracking-[0.15em] uppercase"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Poznámky
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Slide-out panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="notes-panel"
            role="dialog"
            aria-label="Poznámkový blok"
            initial={{ x: PANEL_WIDTH + 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: PANEL_WIDTH + 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onMouseDown={() => setPinned(true)}
            className="fixed right-4 bottom-4 z-40 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
            style={{
              top: 110, //odstup od navbaru
              width: PANEL_WIDTH,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <NotebookText size={20} style={{ color: '#8B5BA8' }} />
                <h3 className="font-semibold text-gray-800">Poznámky</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setPinned((p) => !p)}
                  aria-label={pinned ? 'Odepnout poznámky' : 'Připnout poznámky'}
                  aria-pressed={pinned}
                  title={pinned ? 'Odepnout (zavře se po opuštění myši)' : 'Připnout — zůstane otevřené'}
                  className={`p-1.5 rounded-md transition-all ${
                    pinned
                      ? 'bg-purple-100 hover:bg-purple-200'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  style={pinned ? { color: '#8B5BA8' } : undefined}
                >
                  <Pin
                    size={16}
                    strokeWidth={pinned ? 2.4 : 2}
                    fill={pinned ? '#8B5BA8' : 'none'}
                    style={{
                      transform: pinned ? 'rotate(0deg)' : 'rotate(-35deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={closePanel}
                  aria-label="Zavřít poznámky"
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            {editor && <NotesToolbar editor={editor} />}

            {/* Lined editor area */}
            <div className="flex-1 overflow-y-auto notes-paper">
              <EditorContent editor={editor} className="notes-paper-content" />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
