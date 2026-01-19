'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Module } from '@/api';
import { getCourse, getCourses } from '@/lib/api-client';
import { slugify } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState } from '@/components/admin';
import { 
  Plus, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  GripVertical,
  Image as ImageIcon,
  Strikethrough,
  Undo,
  Redo,
  Trash2,
  X
} from 'lucide-react';

interface ModuleContent {
  content: string;
}

// Extended module interface for local state (includes temporary modules)
interface LocalModule extends Partial<Module> {
  moduleId: number;
  title: string;
  position: number;
  isTemporary?: boolean;
}

// Sortable module item component
function SortableModuleItem({ 
  module, 
  index, 
  isSelected, 
  onSelect, 
  onDelete,
  isTemporary 
}: { 
  module: LocalModule; 
  index: number; 
  isSelected: boolean; 
  onSelect: () => void;
  onDelete?: () => void;
  isTemporary?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.moduleId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
        isSelected 
          ? 'bg-purple-50 border-l-4 border-l-purple-600' 
          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      } ${isTemporary ? 'bg-yellow-50' : ''}`}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
      </div>
      <span className={`text-sm flex-1 ${
        isSelected ? 'text-purple-900 font-medium' : 'text-black'
      } ${isTemporary ? 'italic' : ''}`}>
        {module.title}
        {isTemporary && <span className="text-xs text-yellow-600 ml-2">(nový)</span>}
      </span>
      {isTemporary && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:bg-red-100 rounded text-red-500"
          title="Odstranit modul"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export default function CourseContentPage() {
  const router = useRouter();
  const params = useParams();
  const courseSlug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<LocalModule[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [nextTempId, setNextTempId] = useState(-1); // Negative IDs for temporary modules

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Editor content state for each module
  const [moduleContents, setModuleContents] = useState<{[key: number]: ModuleContent}>({});

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder: 'Napište obsah modulu...',
      }),
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setModuleContents(prev => ({
        ...prev,
        [selectedModuleIndex]: {
          content: html
        }
      }));
    },
  });

  // Update editor content when module changes
  useEffect(() => {
    if (editor && moduleContents[selectedModuleIndex]) {
      const currentEditorContent = editor.getHTML();
      const moduleContent = moduleContents[selectedModuleIndex].content;
      if (currentEditorContent !== moduleContent) {
        editor.commands.setContent(moduleContent);
      }
    }
  }, [selectedModuleIndex, editor, moduleContents]);

  useEffect(() => {
    async function loadCourse() {
      try {
        const courses = await getCourses();
        const isNumericId = /^\d+$/.test(courseSlug);
        
        const courseMatch = isNumericId 
          ? courses.find(c => c.courseId === Number(courseSlug))
          : courses.find(c => slugify(c.title) === courseSlug);
        
        if (!courseMatch) {
          setError('Kurz nebyl nalezen');
          return;
        }
        
        const course = await getCourse(courseMatch.courseId);
        
        setCourseId(course.courseId);
        setCourseTitle(course.title);
        
        // Map API modules to LocalModule format
        const localModules: LocalModule[] = (course.modules || []).map((m, idx) => ({
          moduleId: m.moduleId,
          title: m.title,
          position: m.position ?? idx + 1,
          isActive: m.isActive,
          courseId: m.courseId,
          learnBlocks: m.learnBlocks,
          practices: m.practices,
          isTemporary: false,
        }));
        setModules(localModules);
        
        // Initialize content for each module
        const initialContents: {[key: number]: ModuleContent} = {};
        (course.modules || []).forEach((module, index) => {
          const content = module.learnBlocks && module.learnBlocks.length > 0
            ? module.learnBlocks[0].content
            : course.description || '';
          initialContents[index] = {
            content: content,
          };
        });
        setModuleContents(initialContents);
        
        // Set initial editor content
        if (editor && initialContents[0]) {
          editor.commands.setContent(initialContents[0].content);
        }
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Nepodařilo se načíst kurz');
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseSlug, editor]);

  const selectModule = (index: number) => {
    setSelectedModuleIndex(index);
  };

  // Handle drag end for reordering modules
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setModules((items) => {
        const oldIndex = items.findIndex((item) => item.moduleId === active.id);
        const newIndex = items.findIndex((item) => item.moduleId === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update positions
        return newItems.map((item, idx) => ({
          ...item,
          position: idx + 1,
        }));
      });

      // Update selected index if needed
      const oldIndex = modules.findIndex((item) => item.moduleId === active.id);
      const newIndex = modules.findIndex((item) => item.moduleId === over.id);
      if (selectedModuleIndex === oldIndex) {
        setSelectedModuleIndex(newIndex);
      } else if (selectedModuleIndex > oldIndex && selectedModuleIndex <= newIndex) {
        setSelectedModuleIndex(selectedModuleIndex - 1);
      } else if (selectedModuleIndex < oldIndex && selectedModuleIndex >= newIndex) {
        setSelectedModuleIndex(selectedModuleIndex + 1);
      }
    }
  };

  // Add a new module
  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;

    const newModule: LocalModule = {
      moduleId: nextTempId,
      title: newModuleTitle.trim(),
      position: modules.length + 1,
      isTemporary: true,
    };

    setModules([...modules, newModule]);
    setModuleContents(prev => ({
      ...prev,
      [modules.length]: { content: '' }
    }));
    setNextTempId(nextTempId - 1);
    setNewModuleTitle('');
    setShowAddModuleModal(false);
    setSelectedModuleIndex(modules.length); // Select the new module
  };

  // Delete a temporary module
  const handleDeleteModule = (index: number) => {
    const moduleToDelete = modules[index];
    if (!moduleToDelete.isTemporary) return; // Only allow deleting temporary modules

    const newModules = modules.filter((_, i) => i !== index).map((m, idx) => ({
      ...m,
      position: idx + 1,
    }));
    setModules(newModules);

    // Update module contents
    const newContents: {[key: number]: ModuleContent} = {};
    newModules.forEach((_, idx) => {
      const oldIdx = idx >= index ? idx + 1 : idx;
      if (moduleContents[oldIdx]) {
        newContents[idx] = moduleContents[oldIdx];
      }
    });
    setModuleContents(newContents);

    // Adjust selected index
    if (selectedModuleIndex >= newModules.length) {
      setSelectedModuleIndex(Math.max(0, newModules.length - 1));
    } else if (selectedModuleIndex > index) {
      setSelectedModuleIndex(selectedModuleIndex - 1);
    }
  };

  // Toolbar button helper
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false,
    title,
    children 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
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

  const handleContinue = () => {
    if (courseId) {
      // Store modules data in sessionStorage to pass to next page
      sessionStorage.setItem(`course_${courseId}_modules`, JSON.stringify(modules));
      sessionStorage.setItem(`course_${courseId}_moduleContents`, JSON.stringify(moduleContents));
      router.push(`/admin/courses/${courseSlug}/test`);
    }
  };

  const handleSave = async () => {
    // TODO: Implement save functionality with backend
    console.log('Saving content...', moduleContents);
    handleContinue();
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      {/* Header - buttons commented out via showButtons=false */}
      <CoursePageHeader
        breadcrumb="Kurzy / Přehled kurzů / Popis kurzu / Tvorba obsahu kurzu"
        title="Tvorba obsahu kurzu"
        onSave={handleSave}
        showButtons={false}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Sidebar - Course Outline */}
        <div className="w-72 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-black">Osnova kurzu</h2>
              <button 
                className="p-1 hover:bg-gray-100 rounded"
                onClick={() => setShowAddModuleModal(true)}
                title="Přidat modul"
              >
                <Plus size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={modules.map(m => m.moduleId)}
                strategy={verticalListSortingStrategy}
              >
                {modules.map((module, index) => (
                  <SortableModuleItem
                    key={module.moduleId}
                    module={module}
                    index={index}
                    isSelected={selectedModuleIndex === index}
                    onSelect={() => selectModule(index)}
                    onDelete={module.isTemporary ? () => handleDeleteModule(index) : undefined}
                    isTemporary={module.isTemporary}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {modules.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Žádné moduly
              </div>
            )}
          </div>

          {/* Add Module Modal */}
          {showAddModuleModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-black">Přidat nový modul</h3>
                  <button
                    onClick={() => {
                      setShowAddModuleModal(false);
                      setNewModuleTitle('');
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Název modulu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black mb-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddModule();
                    }
                  }}
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddModuleModal(false);
                      setNewModuleTitle('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleAddModule}
                    disabled={!newModuleTitle.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Přidat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Content - Editor */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Úpravy podkladů ke kurzu</h2>
          </div>
          
          {/* Editor Toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white">
            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              title="Zpět (Ctrl+Z)"
            >
              <Undo size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              title="Vpřed (Ctrl+Y)"
            >
              <Redo size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {/* Heading levels */}
            <select 
              className="px-2 py-1 text-sm border border-gray-300 rounded bg-white text-black min-w-[100px]"
              value={
                editor?.isActive('heading', { level: 1 }) ? 'h1' :
                editor?.isActive('heading', { level: 2 }) ? 'h2' :
                editor?.isActive('heading', { level: 3 }) ? 'h3' : 'p'
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'p') {
                  editor?.chain().focus().setParagraph().run();
                } else if (value === 'h1') {
                  editor?.chain().focus().toggleHeading({ level: 1 }).run();
                } else if (value === 'h2') {
                  editor?.chain().focus().toggleHeading({ level: 2 }).run();
                } else if (value === 'h3') {
                  editor?.chain().focus().toggleHeading({ level: 3 }).run();
                }
              }}
            >
              <option value="p">Odstavec</option>
              <option value="h1">Nadpis 1</option>
              <option value="h2">Nadpis 2</option>
              <option value="h3">Nadpis 3</option>
            </select>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {/* Text formatting */}
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold') ?? false}
              title="Tučné (Ctrl+B)"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic') ?? false}
              title="Kurzíva (Ctrl+I)"
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              isActive={editor?.isActive('underline') ?? false}
              title="Podtržené (Ctrl+U)"
            >
              <UnderlineIcon size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              isActive={editor?.isActive('strike') ?? false}
              title="Přeškrtnuté"
            >
              <Strikethrough size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {/* Text alignment */}
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              isActive={editor?.isActive({ textAlign: 'left' }) ?? false}
              title="Zarovnat vlevo"
            >
              <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              isActive={editor?.isActive({ textAlign: 'center' }) ?? false}
              title="Zarovnat na střed"
            >
              <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              isActive={editor?.isActive({ textAlign: 'right' }) ?? false}
              title="Zarovnat vpravo"
            >
              <AlignRight size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {/* Lists */}
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList') ?? false}
              title="Odrážkový seznam"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList') ?? false}
              title="Číslovaný seznam"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {/* Media */}
            <ToolbarButton
              onClick={addImage}
              title="Vložit obrázek"
            >
              <ImageIcon size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={setLink}
              isActive={editor?.isActive('link') ?? false}
              title="Vložit odkaz"
            >
              <LinkIcon size={16} />
            </ToolbarButton>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto">
            {modules.length > 0 ? (
              <EditorContent 
                editor={editor} 
                className="min-h-[300px] [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:p-6 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-4 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:my-3 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_a]:text-blue-600 [&_.ProseMirror_a]:underline [&_.ProseMirror_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_.is-editor-empty:first-child::before]:pointer-events-none text-black"
              />
                        ) : (
              <div className="text-center text-gray-500 py-12">
                Nejsou k dispozici žádné moduly k úpravě
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <PageFooterActions
            onBack={() => router.back()}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  );
}
