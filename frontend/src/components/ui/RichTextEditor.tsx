'use client';

import { useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Strikethrough,
  Undo,
  Redo,
} from 'lucide-react';

// ─── Toolbar Button ──────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors ${
        isActive
          ? 'bg-purple-100 text-purple-700'
          : 'hover:bg-gray-100 text-black'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL obrázku');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Zpět (Ctrl+Z)"
      >
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Vpřed (Ctrl+Y)"
      >
        <Redo size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <select
        className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-black min-w-[100px]"
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' :
          editor.isActive('heading', { level: 2 }) ? 'h2' :
          editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
        }
        onChange={(e) => {
          const value = e.target.value;
          if (value === 'p') editor.chain().focus().setParagraph().run();
          else if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
          else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
          else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}
      >
        <option value="p">Odstavec</option>
        <option value="h1">Nadpis 1</option>
        <option value="h2">Nadpis 2</option>
        <option value="h3">Nadpis 3</option>
      </select>

      <ToolbarDivider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Tučné (Ctrl+B)">
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Kurzíva (Ctrl+I)">
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Podtržené (Ctrl+U)">
        <UnderlineIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Přeškrtnuté">
        <Strikethrough size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Zarovnat vlevo">
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Zarovnat na střed">
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Zarovnat vpravo">
        <AlignRight size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Odrážkový seznam">
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Číslovaný seznam">
        <ListOrdered size={16} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton onClick={addImage} title="Vložit obrázek">
        <ImageIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Vložit odkaz">
        <LinkIcon size={16} />
      </ToolbarButton>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const EDITOR_CONTENT_CLASS = "min-h-[300px] [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:p-6 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none text-black";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Napište obsah modulu...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <>
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className={EDITOR_CONTENT_CLASS} />
      </div>
    </>
  );
}

export function useRichTextEditor({ content, onChange, placeholder = 'Napište obsah modulu...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  return { editor, EditorToolbar, EditorContent, editorContentClass: EDITOR_CONTENT_CLASS };
}
