'use client';

import { useState, useEffect } from 'react';
import { LearnBlock } from '@/api';
import { updateModule, createModule, createLearnBlock, updateLearnBlock } from '@/lib/api-client';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState } from '@/components/admin';
import { Modal } from '@/components/ui/Modal';
import { useRichTextEditor } from '@/components/ui/RichTextEditor';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCourseData } from '@/hooks/useCourseData';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ModuleContent {
  content: string;
  learnId?: number;
}

interface LocalModule {
  moduleId: number;
  title: string;
  isActive?: boolean;
  courseId?: number;
  learnBlocks?: LearnBlock[];
  isTemporary?: boolean;
}

interface CourseContentViewProps {
  courseId: number;
  initialModuleId?: number;
}

// Položka modulu v osnově
function ModuleItem({
  module,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  onDelete,
}: {
  module: LocalModule;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-3 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-purple-50 border-l-4 border-l-purple-600'
          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
      } ${module.isTemporary ? 'bg-yellow-50' : ''}`}
      onClick={onSelect}
    >
      <button
        className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronUp size={14} className="text-gray-400" />
        )}
      </button>
      <span className="text-sm text-black font-medium flex-1 min-w-0 truncate">
        {module.title}
        {module.isTemporary && <span className="text-xs text-yellow-600 ml-2">(nový)</span>}
      </span>
      {module.isTemporary && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:bg-red-100 rounded text-red-500 flex-shrink-0"
          title="Odstranit modul"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// Editor obsahu kurzu s rich text editorem
export function CourseContentView({ courseId, initialModuleId }: CourseContentViewProps) {
  const { goToCourseTests, goBack } = useAdminNavigation();
  const { loading: courseLoading, error: courseError, courseTitle, courseData } = useCourseData({ courseId, initialModuleId });

  const [modules, setModules] = useState<LocalModule[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [nextTempId, setNextTempId] = useState(-1);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set([0]));
  const [moduleContents, setModuleContents] = useState<{[key: number]: ModuleContent}>({});

  // Rich text editor
  const { editor, EditorToolbar, EditorContent: EditorContentComponent, editorContentClass } = useRichTextEditor({
    content: '',
    onChange: (html) => {
      setModuleContents(prev => ({
        ...prev,
        [selectedModuleIndex]: {
          ...prev[selectedModuleIndex],
          content: html,
        },
      }));
    },
  });

  // Inicializace z courseData
  useEffect(() => {
    if (!courseData) return;

    const localModules: LocalModule[] = (courseData.modules || []).map((m) => ({
      moduleId: m.moduleId,
      title: m.title,
      isActive: m.isActive,
      courseId: m.courseId,
      learnBlocks: m.learnBlocks,
      isTemporary: false,
    }));
    setModules(localModules);

    if (initialModuleId) {
      const idx = localModules.findIndex(m => m.moduleId === initialModuleId);
      if (idx >= 0) {
        setSelectedModuleIndex(idx);
        setExpandedOutlineItems(new Set([idx]));
      }
    }

    const initialContents: {[key: number]: ModuleContent} = {};
    (courseData.modules || []).forEach((module, index) => {
      const learnBlock = module.learnBlocks && module.learnBlocks.length > 0
        ? module.learnBlocks[0]
        : null;
      const content = learnBlock ? learnBlock.content : (courseData.description || '');
      initialContents[index] = {
        content,
        learnId: learnBlock?.learnId,
      };
    });
    setModuleContents(initialContents);

    if (editor && initialContents[0]) {
      editor.commands.setContent(initialContents[0].content);
    }
  }, [courseData, editor, initialModuleId]);

  // Aktualizace obsahu editoru při změně modulu
  useEffect(() => {
    if (editor && moduleContents[selectedModuleIndex]) {
      const currentEditorContent = editor.getHTML();
      const moduleContent = moduleContents[selectedModuleIndex].content;
      if (currentEditorContent !== moduleContent) {
        editor.commands.setContent(moduleContent);
      }
    }
  }, [selectedModuleIndex, editor, moduleContents]);

  const toggleOutlineItem = (index: number) => {
    setExpandedOutlineItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    const newModule: LocalModule = {
      moduleId: nextTempId,
      title: newModuleTitle.trim(),
      isTemporary: true,
    };
    setModules([...modules, newModule]);
    setModuleContents(prev => ({ ...prev, [modules.length]: { content: '' } }));
    setNextTempId(nextTempId - 1);
    setNewModuleTitle('');
    setShowAddModuleModal(false);
    setSelectedModuleIndex(modules.length);
  };

  const handleDeleteModule = (index: number) => {
    const moduleToDelete = modules[index];
    if (!moduleToDelete.isTemporary) return;

    const newModules = modules.filter((_, i) => i !== index);
    setModules(newModules);

    const newContents: {[key: number]: ModuleContent} = {};
    newModules.forEach((_, idx) => {
      const oldIdx = idx >= index ? idx + 1 : idx;
      if (moduleContents[oldIdx]) newContents[idx] = moduleContents[oldIdx];
    });
    setModuleContents(newContents);

    if (selectedModuleIndex >= newModules.length) {
      setSelectedModuleIndex(Math.max(0, newModules.length - 1));
    } else if (selectedModuleIndex > index) {
      setSelectedModuleIndex(selectedModuleIndex - 1);
    }
  };

  const saveContent = async () => {
    if (!courseId) return;
    try {
      const updatedModules = [...modules];
      const updatedContents = { ...moduleContents };

      for (let i = 0; i < updatedModules.length; i++) {
        const module = updatedModules[i];
        const content = updatedContents[i];

        if (module.isTemporary) {
          const createdModule = await createModule({ courseId, title: module.title });
          updatedModules[i] = { ...module, moduleId: createdModule.moduleId, isTemporary: false };

          const createdLearnBlock = await createLearnBlock({
            moduleId: createdModule.moduleId,
            title: module.title || `Blok ${i + 1}`,
            content: content?.content || '',
          });
          updatedContents[i] = { ...content, content: content?.content || '', learnId: createdLearnBlock.learnId };
        }
      }

      setModules(updatedModules);
      setModuleContents(updatedContents);

      for (let i = 0; i < updatedModules.length; i++) {
        const module = updatedModules[i];
        if (module.isTemporary) continue;
        await updateModule(module.moduleId, { title: module.title });
      }

      const learnBlockPromises: Promise<unknown>[] = [];
      for (let i = 0; i < updatedModules.length; i++) {
        const module = updatedModules[i];
        const content = updatedContents[i];
        if (module.isTemporary) continue;
        if (content?.learnId) {
          learnBlockPromises.push(
            updateLearnBlock(content.learnId, {
              title: module.title || `Blok`,
              content: content.content,
            })
          );
        }
      }
      await Promise.all(learnBlockPromises);
    } catch (err) {
      console.error('Failed to save content:', err);
      alert('Nepodařilo se uložit obsah');
      throw err;
    }
  };

  const handleContinue = async () => {
    await saveContent();
    const selectedModule = modules[selectedModuleIndex];
    goToCourseTests(courseId, selectedModule?.moduleId);
  };

  const handleBack = async () => {
    await saveContent();
    goBack();
  };

  const handleSave = async () => {
    await saveContent();
    handleContinue();
  };

  if (courseLoading) return <LoadingState />;
  if (courseError) return <ErrorState message={courseError} />;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${courseTitle} / Tvorba obsahu kurzu`}
        title="Tvorba obsahu kurzu"
        onSave={handleSave}
        showButtons={false}
      />

      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Content - Editor */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Úpravy podkladů ke kurzu</h2>
          </div>

          <EditorToolbar editor={editor} />

          <div className="flex-1 overflow-y-auto">
            {modules.length > 0 ? (
              <EditorContentComponent editor={editor} className={editorContentClass} />
            ) : (
              <div className="text-center text-gray-500 py-12">
                Nejsou k dispozici žádné moduly k úpravě
              </div>
            )}
          </div>

          <PageFooterActions onBack={handleBack} onContinue={handleContinue} />
        </div>

        {/* Right Sidebar - Course Outline with DnD */}
        <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-black">Osnova kurzu</h2>
              <button
                className="p-1 hover:bg-gray-100 rounded"
                onClick={() => setShowAddModuleModal(true)}
                title="Přidat modul"
              >
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {modules.map((module, index) => (
              <div key={module.moduleId} className="border-b border-gray-100 last:border-b-0">
                <ModuleItem
                  module={module}
                  isSelected={selectedModuleIndex === index}
                  isExpanded={expandedOutlineItems.has(index)}
                  onSelect={() => setSelectedModuleIndex(index)}
                  onToggle={() => toggleOutlineItem(index)}
                  onDelete={module.isTemporary ? () => handleDeleteModule(index) : undefined}
                />
                {expandedOutlineItems.has(index) && moduleContents[index] && (
                  <div
                    className="pl-10 pr-4 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer truncate"
                    onClick={() => setSelectedModuleIndex(index)}
                  >
                    {moduleContents[index].content
                      ? moduleContents[index].content.replace(/<[^>]*>/g, '').substring(0, 40) + '...'
                      : 'Prázdný obsah'}
                  </div>
                )}
              </div>
            ))}

            {modules.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">Žádné moduly</div>
            )}
          </div>
        </div>

        {/* Add Module Modal */}
        <Modal
          isOpen={showAddModuleModal}
          onClose={() => { setShowAddModuleModal(false); setNewModuleTitle(''); }}
          title="Přidat nový modul"
          footer={
            <>
              <button
                onClick={() => { setShowAddModuleModal(false); setNewModuleTitle(''); }}
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
            </>
          }
        >
          <input
            type="text"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="Název modulu"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); }}
          />
        </Modal>
      </div>
    </div>
  );
}

export default CourseContentView;
