'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent, Editor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Blockquote from '@tiptap/extension-blockquote';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { ResizableImage } from './editor/ResizableImage';
import { Modal } from './Modal';
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
  Upload,
  Loader2,
  Trash2,
  Quote,
} from 'lucide-react';

// Toolbar Button

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

// Image Dialog 

function ImageDialog({
  isOpen,
  onClose,
  onInsert,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, alt: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setPreviewUrl('');
      setUploading(false);
      setError(null);
    }
  }, [isOpen]);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/editor-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nahrání selhalo');
      setUrl(data.url);
      setPreviewUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nahrání obrázku selhalo');
    } finally {
      setUploading(false);
    }
  };

  const handleInsert = () => {
    const finalUrl = url.trim();
    if (!finalUrl) return;
    onInsert(finalUrl, '');
    onClose();
  };

  const onUrlChange = (value: string) => {
    setUrl(value);
    setPreviewUrl(value);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vložit obrázek"
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleInsert}
            disabled={!url.trim() || uploading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Vložit
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nahrát z počítače
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-purple-400 hover:bg-purple-50 transition-colors text-gray-600 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="text-sm">
              {uploading ? 'Nahrávání…' : 'Vybrat obrázek (JPG, PNG, WebP, GIF, SVG, max 10 MB)'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">nebo</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL obrázku</label>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://… nebo /uploads/editor/…"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {previewUrl && !error && (
          <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">Náhled:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Náhled"
              className="max-h-48 mx-auto rounded"
              onError={() => setPreviewUrl('')}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// Link Dialog

function LinkDialog({
  isOpen,
  onClose,
  initialUrl,
  initialText,
  hasSelection,
  onApply,
  onRemove,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialUrl: string;
  initialText: string;
  hasSelection: boolean;
  onApply: (url: string, text: string) => void;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText(initialText);
    }
  }, [isOpen, initialUrl, initialText]);

  const handleApply = () => {
    const finalUrl = url.trim();
    if (!finalUrl) return;
    onApply(finalUrl, text.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialUrl ? 'Upravit odkaz' : 'Vložit odkaz'}
      maxWidth="max-w-md"
      footer={
        <>
          {initialUrl && (
            <button
              onClick={() => { onRemove(); onClose(); }}
              className="mr-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1.5 text-sm"
            >
              <Trash2 size={14} /> Odstranit odkaz
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleApply}
            disabled={!url.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {initialUrl ? 'Uložit' : 'Vložit'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
            onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
          />
        </div>

        {!hasSelection && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text odkazu <span className="text-gray-400 font-normal">— co se zobrazí</span>
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Zobrazený text (volitelné)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
              onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Pokud necháte prázdné, použije se URL.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

//  Helpers 

function normalizeLinkHref(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  // Already has a scheme (http, https, mailto, tel, ftp, …) or is a fragment / relative path
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return trimmed;
  if (trimmed.includes('@') && !trimmed.includes(' ')) return `mailto:${trimmed}`;
  return `https://${trimmed}`;
}

// Toolbar 

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInitial, setLinkInitial] = useState({ url: '', text: '', hasSelection: false });

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to, empty } = editor.state.selection;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
    setLinkInitial({ url: previousUrl, text: selectedText, hasSelection: !empty });
    setLinkDialogOpen(true);
  }, [editor]);

  const applyLink = useCallback((url: string, text: string) => {
    if (!editor) return;
    const href = normalizeLinkHref(url);
    const { empty } = editor.state.selection;
    if (empty && text) {
      editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run();
    } else if (empty) {
      editor.chain().focus().insertContent(`<a href="${href}">${url}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
  }, [editor]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  const insertImage = useCallback((src: string, alt: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src, alt: alt || undefined }).run();
  }, [editor]);

  const activeState = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      return {
        isH1: e.isActive('heading', { level: 1 }),
        isH2: e.isActive('heading', { level: 2 }),
        isH3: e.isActive('heading', { level: 3 }),
        isBold: e.isActive('bold'),
        isItalic: e.isActive('italic'),
        isUnderline: e.isActive('underline'),
        isStrike: e.isActive('strike'),
        isAlignLeft: e.isActive({ textAlign: 'left' }),
        isAlignCenter: e.isActive({ textAlign: 'center' }),
        isAlignRight: e.isActive({ textAlign: 'right' }),
        isBulletList: e.isActive('bulletList'),
        isOrderedList: e.isActive('orderedList'),
        isBlockquote: e.isActive('blockquote'),
        isLink: e.isActive('link'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  if (!editor) return null;

  const headingValue = activeState?.isH1 ? 'h1' : activeState?.isH2 ? 'h2' : activeState?.isH3 ? 'h3' : 'p';

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!activeState?.canUndo}
          title="Zpět (Ctrl+Z)"
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!activeState?.canRedo}
          title="Vpřed (Ctrl+Y)"
        >
          <Redo size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <select
          className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-black min-w-[100px]"
          value={headingValue}
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

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={!!activeState?.isBold} title="Tučné (Ctrl+B)">
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={!!activeState?.isItalic} title="Kurzíva (Ctrl+I)">
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={!!activeState?.isUnderline} title="Podtržené (Ctrl+U)">
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={!!activeState?.isStrike} title="Přeškrtnuté">
          <Strikethrough size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={!!activeState?.isAlignLeft} title="Zarovnat vlevo">
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={!!activeState?.isAlignCenter} title="Zarovnat na střed">
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={!!activeState?.isAlignRight} title="Zarovnat vpravo">
          <AlignRight size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={!!activeState?.isBulletList} title="Odrážkový seznam">
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={!!activeState?.isOrderedList} title="Číslovaný seznam">
          <ListOrdered size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={!!activeState?.isBlockquote} title="Citace">
          <Quote size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton onClick={() => setImageDialogOpen(true)} title="Vložit obrázek">
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={openLinkDialog} isActive={!!activeState?.isLink} title="Vložit odkaz">
          <LinkIcon size={16} />
        </ToolbarButton>
      </div>

      <ImageDialog
        isOpen={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onInsert={insertImage}
      />
      <LinkDialog
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        initialUrl={linkInitial.url}
        initialText={linkInitial.text}
        hasSelection={linkInitial.hasSelection}
        onApply={applyLink}
        onRemove={removeLink}
      />
    </>
  );
}

// ─── Editor Configuration ────────────────────────────────────────────────────

const EDITOR_CONTENT_CLASS = "min-h-[300px] [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:p-6 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_p:has(+_*)]:clear-none [&_.ProseMirror_p:after]:content-[''] [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none text-black";

const EDITOR_EXTENSIONS = (placeholder: string) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
    },
    blockquote: false,
  }),
  Blockquote.configure({
    HTMLAttributes: {
      class: 'border-l-4 border-gray-300 pl-4 my-3 italic text-gray-600',
    },
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ResizableImage.configure({
    HTMLAttributes: { class: 'rounded-lg' },
  }),
  Placeholder.configure({ placeholder }),
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Napište obsah modulu...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS(placeholder),
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
    extensions: EDITOR_EXTENSIONS(placeholder),
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
