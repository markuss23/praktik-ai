'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { LearnBlock, FeedbackItem, Status } from '@/api';
import {
  updateModule, createModule, createLearnBlock, updateLearnBlock,
  getFeedbackSection, replyToFeedback, resolveFeedback, updateCourseStatus,
} from '@/lib/api-client';
import { UpdateCourseStatusStatusEnum } from '@/api/apis/CoursesApi';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState, CourseCreationTabs, CourseRubric, CourseStepNav, type CreationTab, type CourseStep } from '@/components/admin';
import { Drawer, DrawerContent, Modal } from '@/components/ui';
import { useRichTextEditor } from '@/components/ui/RichTextEditor';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCourseData, invalidateCourseCache } from '@/hooks/useCourseData';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAutosave } from '@/hooks/useAutosave';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  CornerDownRight,
  ArrowUpCircle,
  X,
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

// Hlavička osnovy s tlačítky pro přidání a (na mobilu) zavření drawer
function OutlineHeader({ onAdd, onClose }: { onAdd: () => void; onClose?: () => void }) {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
      <h2 className="font-semibold text-foreground">Osnova kurzu</h2>
      <div className="flex items-center gap-1">
        <button
          className="p-1 hover:bg-muted rounded"
          onClick={onAdd}
          title="Přidat modul"
        >
          <Plus size={16} className="text-muted-foreground" />
        </button>
        {onClose && (
          <button
            className="p-1 hover:bg-muted rounded"
            onClick={onClose}
            title="Zavřít"
            aria-label="Zavřít osnovu"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// Seznam modulů v osnově (sdílený mezi desktop sidebarem a mobile drawerem)
function OutlineList({
  modules,
  selectedModuleIndex,
  expandedOutlineItems,
  moduleContents,
  feedbackCountByModule,
  onSelect,
  onToggle,
  onDelete,
}: {
  modules: LocalModule[];
  selectedModuleIndex: number;
  expandedOutlineItems: Set<number>;
  moduleContents: { [key: number]: ModuleContent };
  feedbackCountByModule: (moduleId: number) => number;
  onSelect: (index: number) => void;
  onToggle: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {modules.map((module, index) => (
        <div key={module.moduleId} className="border-b border-border last:border-b-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-3 cursor-pointer transition-colors ${
              selectedModuleIndex === index
                ? 'bg-gradient-r/10 border-l-4 border-l-purple-600'
                : 'hover:bg-muted/50 border-l-4 border-l-transparent'
            } ${module.isTemporary ? 'bg-warning/10' : ''}`}
            onClick={() => onSelect(index)}
          >
            <button
              className="shrink-0 p-0.5 hover:bg-muted rounded"
              onClick={(e) => { e.stopPropagation(); onToggle(index); }}
            >
              {expandedOutlineItems.has(index) ? (
                <ChevronDown size={14} className="text-muted-foreground" />
              ) : (
                <ChevronUp size={14} className="text-muted-foreground" />
              )}
            </button>
            <span className="text-sm text-foreground font-medium flex-1 min-w-0 truncate">
              {module.title}
              {module.isTemporary && <span className="text-xs text-warning ml-2">(nový)</span>}
            </span>
            {feedbackCountByModule(module.moduleId) > 0 && (
              <span className="shrink-0 bg-brand-accent text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {feedbackCountByModule(module.moduleId)}
              </span>
            )}
            {module.isTemporary && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                className="p-1 hover:bg-destructive/20 rounded text-destructive shrink-0"
                title="Odstranit modul"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {expandedOutlineItems.has(index) && moduleContents[index] && (
            <div
              className="pl-10 pr-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer truncate"
              onClick={() => onSelect(index)}
            >
              {moduleContents[index].content
                ? moduleContents[index].content.replace(/<[^>]*>/g, '').substring(0, 40) + '...'
                : 'Prázdný obsah'}
            </div>
          )}
        </div>
      ))}

      {modules.length === 0 && (
        <div className="p-4 text-center text-muted-foreground text-sm">Žádné moduly</div>
      )}
    </div>
  );
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
          ? 'bg-gradient-r/10 border-l-4 border-l-purple-600'
          : 'hover:bg-muted/50 border-l-4 border-l-transparent'
      } ${module.isTemporary ? 'bg-warning/10' : ''}`}
      onClick={onSelect}
    >
      <button
        className="shrink-0 p-0.5 hover:bg-muted rounded"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronUp size={14} className="text-muted-foreground" />
        )}
      </button>
      <span className="text-sm text-foreground font-medium flex-1 min-w-0 truncate">
        {module.title}
        {module.isTemporary && <span className="text-xs text-warning ml-2">(nový)</span>}
      </span>
      {module.isTemporary && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:bg-destructive/20 rounded text-destructive shrink-0"
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
  const { goToCourseTests, goToCourseSummary, goBack } = useAdminNavigation();
  const { loading: courseLoading, error: courseError, courseTitle, courseData } = useCourseData({ courseId, initialModuleId });
  const { isOwner } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<CreationTab>('general');
  const [modules, setModules] = useState<LocalModule[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [nextTempId, setNextTempId] = useState(-1);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set([0]));
  const [moduleContents, setModuleContents] = useState<{[key: number]: ModuleContent}>({});
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);

  const selectModuleAndClose = (index: number) => {
    setSelectedModuleIndex(index);
    setMobileOutlineOpen(false);
  };

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

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [showReplyFor, setShowReplyFor] = useState<number | null>(null);
  const [submittingReply, setSubmittingReply] = useState<number | null>(null);
  const [resolvingFeedback, setResolvingFeedback] = useState<number | null>(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const courseStatus = courseData?.status as string | undefined;
  const isEdited = courseStatus === Status.Edited;
  const hasFeedbacks = feedbacks.length > 0;
  const showCommentsPanel = isEdited && hasFeedbacks;
  const allResolved = feedbacks.length > 0 && feedbacks.every(fb => fb.isResolved);
  const canResubmit = isEdited && allResolved && courseData && isOwner(courseData.ownerId);

  // Load feedbacks
  useEffect(() => {
    if (!courseId) return;
    getFeedbackSection(courseId)
      .then(section => setFeedbacks(section.feedbacks))
      .catch(() => {}); // feedback may not exist
  }, [courseId]);

  const currentModuleFeedbacks = modules[selectedModuleIndex]
    ? feedbacks.filter(fb => fb.moduleId === modules[selectedModuleIndex].moduleId)
    : [];

  const feedbackCountByModule = (moduleId: number) =>
    feedbacks.filter(fb => fb.moduleId === moduleId).length;

  const feedbackContextLabel = (fb: FeedbackItem) => {
    if (fb.contentType === 'learn_block' && fb.contentRef) return `Příručka – str. ${fb.contentRef}`;
    if (fb.contentType === 'practice' && fb.contentRef) return `Procvičování – ot. ${fb.contentRef}`;
    return null;
  };

  const handleReply = async (feedbackId: number) => {
    const text = replyTexts[feedbackId]?.trim();
    if (!text) return;
    setSubmittingReply(feedbackId);
    try {
      const updated = await replyToFeedback(feedbackId, text);
      setFeedbacks(prev => prev.map(fb => fb.feedbackId === feedbackId ? updated : fb));
      setShowReplyFor(null);
      setReplyTexts(prev => ({ ...prev, [feedbackId]: '' }));
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleToggleResolve = async (fb: FeedbackItem) => {
    setResolvingFeedback(fb.feedbackId);
    try {
      const updated = await resolveFeedback(fb.feedbackId, !fb.isResolved);
      setFeedbacks(prev => prev.map(f => f.feedbackId === fb.feedbackId ? updated : f));
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolvingFeedback(null);
    }
  };

  const handleResubmit = async () => {
    setResubmitLoading(true);
    try {
      await updateCourseStatus(courseId, UpdateCourseStatusStatusEnum.InReview);
    } catch (err) {
      console.error('Failed to resubmit:', err);
    } finally {
      setResubmitLoading(false);
    }
  };

  // Inicializace z courseData – proběhne jen jednou (jakmile jsou data i editor k dispozici).
  // Díky tomu revalidace dat na pozadí (z cache v useCourseData) nepřepíše rozepsané úpravy.
  const initRef = useRef(false);
  // Stav (ne jen ref) pro zapnutí autosave až po inicializaci dat.
  const [contentInitialized, setContentInitialized] = useState(false);
  useEffect(() => {
    if (!courseData || !editor || initRef.current) return;

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

    if (initialContents[0]) {
      editor.commands.setContent(initialContents[0].content);
    }
    initRef.current = true;
    setContentInitialized(true);
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
    if (!courseId) return modules;
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
      invalidateCourseCache(courseId);
      return updatedModules;
    } catch (err) {
      console.error('Failed to save content:', err);
      alert('Nepodařilo se uložit obsah');
      throw err;
    }
  };

  const handleContinue = async () => {
    const savedModules = await saveContent();
    const selectedModule = (savedModules ?? modules)[selectedModuleIndex];
    goToCourseTests(courseId, selectedModule?.moduleId);
  };

  const handleBack = async () => {
    await saveContent();
    goBack();
  };

  // Přepnutí mezi fázemi tvorby přes krokový přepínač
  const handleStepNavigate = async (step: CourseStep) => {
    if (step === 'content') return;
    let savedModules: LocalModule[] | undefined;
    try {
      savedModules = await saveContent();
    } catch {
      return; // uložení selhalo (alert je zobrazen), zůstaneme na místě
    }
    if (step === 'tests') {
      const selectedModule = (savedModules ?? modules)[selectedModuleIndex];
      goToCourseTests(courseId, selectedModule?.moduleId);
    } else {
      goToCourseSummary(courseId);
    }
  };

  // Pro autosave sledujeme jen názvy a text obsahu, ne ID/learnId
  // (ty se mění po uložení temp modulů a vznikla by smyčka ukládání).
  const autosaveValue = useMemo(() => ({
    titles: modules.map(m => m.title),
    contents: modules.map((_, i) => moduleContents[i]?.content ?? ''),
  }), [modules, moduleContents]);

  const { status: saveStatus } = useAutosave(
    autosaveValue,
    async () => { await saveContent(); },
    { delay: 3000, enabled: contentInitialized },
  );

  if (courseLoading) return <LoadingState />;
  if (courseError) return <ErrorState message={courseError} />;

  const commentsPanelInner = (
    <>
      <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-foreground">
          Komentáře{currentModuleFeedbacks.length > 0 && ` (${currentModuleFeedbacks.length})`}
        </h2>
        <button
          className="lg:hidden p-1 hover:bg-muted rounded"
          onClick={() => setMobileCommentsOpen(false)}
          aria-label="Zavřít komentáře"
        >
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {currentModuleFeedbacks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Žádné komentáře pro tento modul</p>
        ) : (
          currentModuleFeedbacks.map(fb => (
            <div key={fb.feedbackId} className={`rounded-xl border ${fb.isResolved ? 'border-success/30 bg-success/10/50' : 'border-border'}`}>
              <div className="px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-foreground text-xs">
                    {fb.author.displayName ?? 'Uživatel'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleResolve(fb)}
                      disabled={resolvingFeedback === fb.feedbackId}
                      className={`p-0.5 rounded transition-colors ${
                        fb.isResolved
                          ? 'text-success hover:text-success'
                          : 'text-muted-foreground hover:text-success'
                      }`}
                      title={fb.isResolved ? 'Označit jako nevyřešené' : 'Označit jako vyřešené'}
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                </div>

                {feedbackContextLabel(fb) && (
                  <p className="text-[10px] text-gradient-r font-medium mb-1">{feedbackContextLabel(fb)}</p>
                )}

                <p className="text-foreground text-xs leading-relaxed">{fb.feedback}</p>
              </div>

              {fb.reply && (
                <div className="px-3.5 pb-2.5">
                  <div className="ml-3 bg-gradient-r/10 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <CornerDownRight size={10} className="text-gradient-r" />
                      <span className="text-[10px] text-gradient-r font-medium">Vaše odpověď</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{fb.reply}</p>
                  </div>
                </div>
              )}

              {!fb.reply && (
                <div className="px-3.5 pb-2.5">
                  {showReplyFor === fb.feedbackId ? (
                    <div>
                      <textarea
                        value={replyTexts[fb.feedbackId] ?? ''}
                        onChange={e => setReplyTexts(prev => ({ ...prev, [fb.feedbackId]: e.target.value }))}
                        rows={2}
                        placeholder="Napište odpověď..."
                        className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gradient-r/30 resize-none"
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleReply(fb.feedbackId)}
                          disabled={submittingReply === fb.feedbackId}
                          className="flex-1 py-1 bg-gradient-r text-primary-foreground rounded-lg text-xs font-medium hover:bg-gradient-r/80 disabled:opacity-50"
                        >
                          Odeslat
                        </button>
                        <button
                          onClick={() => setShowReplyFor(null)}
                          className="px-2 py-1 text-muted-foreground hover:text-foreground text-xs"
                        >
                          Zrušit
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowReplyFor(fb.feedbackId)}
                      className="text-xs text-gradient-r hover:underline flex items-center gap-0.5"
                    >
                      <CornerDownRight size={11} /> Odpovědět
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Vyřešeno: {feedbacks.filter(fb => fb.isResolved).length}/{feedbacks.length}
          </span>
          {allResolved && (
            <span className="text-success font-medium flex items-center gap-1">
              <CheckCircle size={12} /> Vše vyřešeno
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-muted">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${courseTitle} / Tvorba obsahu kurzu`}
        title="Tvorba obsahu kurzu"
        saveStatus={saveStatus}
        showButtons={true}
        onMenuClick={() => setMobileOutlineOpen(true)}
        onCommentsClick={showCommentsPanel ? () => setMobileCommentsOpen(true) : undefined}
        commentsCount={showCommentsPanel ? currentModuleFeedbacks.length : undefined}
      />
      <CourseStepNav current="content" onNavigate={handleStepNavigate} />
      <CourseCreationTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'rubric' ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 view-fade-in">
          <CourseRubric />
        </div>
      ) : (
      <>
      {/* Resubmit banner */}
      {/* {isEdited && hasFeedbacks && (
        <div className="bg-warning/10 border-b border-warning/30 px-6 py-2.5 flex items-center justify-between shrink-0">
          <p className="text-sm text-warning">
            Kurz byl zamítnut — vyřešte komentáře a odešlete znovu ke kontrole.
          </p>
          {canResubmit && (
            <button
              onClick={handleResubmit}
              disabled={resubmitLoading}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-r text-primary-foreground rounded-lg text-sm font-medium hover:bg-gradient-r/80 transition-colors disabled:opacity-50"
            >
              <ArrowUpCircle size={14} />
              {resubmitLoading ? 'Odesílání...' : 'Odeslat ke kontrole'}
            </button>
          )}
        </div>
      )} */}

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lg:gap-6 min-h-0 view-fade-in">
        {/* Left Sidebar - Course Outline (desktop) */}
        <div className="hidden lg:flex w-56 shrink-0 bg-card rounded-lg shadow-sm overflow-hidden border border-border flex-col">
          <OutlineHeader
            onAdd={() => setShowAddModuleModal(true)}
          />
          <OutlineList
            modules={modules}
            selectedModuleIndex={selectedModuleIndex}
            expandedOutlineItems={expandedOutlineItems}
            moduleContents={moduleContents}
            feedbackCountByModule={feedbackCountByModule}
            onSelect={setSelectedModuleIndex}
            onToggle={toggleOutlineItem}
            onDelete={handleDeleteModule}
          />
        </div>

        {/* Mobile Outline Drawer — kitový Drawer řeší overlay i stacking */}
        <Drawer open={mobileOutlineOpen} onOpenChange={setMobileOutlineOpen} swipeDirection="left">
          <DrawerContent className="lg:hidden" aria-label="Struktura kurzu">
            <OutlineHeader
              onAdd={() => setShowAddModuleModal(true)}
              onClose={() => setMobileOutlineOpen(false)}
            />
            <OutlineList
              modules={modules}
              selectedModuleIndex={selectedModuleIndex}
              expandedOutlineItems={expandedOutlineItems}
              moduleContents={moduleContents}
              feedbackCountByModule={feedbackCountByModule}
              onSelect={selectModuleAndClose}
              onToggle={toggleOutlineItem}
              onDelete={handleDeleteModule}
            />
          </DrawerContent>
        </Drawer>

        {/* Center - Editor */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 bg-card rounded-lg shadow-sm overflow-hidden flex flex-col border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Úpravy podkladů ke kurzu</h2>
          </div>

          <EditorToolbar editor={editor} />

          <div className="flex-1 overflow-y-auto">
            {modules.length > 0 ? (
              <EditorContentComponent editor={editor} className={editorContentClass} />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Nejsou k dispozici žádné moduly k úpravě
              </div>
            )}
          </div>

          <PageFooterActions onBack={handleBack} onContinue={handleContinue} continueLabel="Uložit a pokračovat" />
        </div>

        {/* Right - Comments panel (desktop, only when course has feedbacks from review) */}
        {showCommentsPanel && (
          <div className="hidden lg:flex w-72 shrink-0 bg-card rounded-lg shadow-sm overflow-hidden border border-border flex-col">
            {commentsPanelInner}
          </div>
        )}

        {/* Mobile Comments Drawer */}
        {showCommentsPanel && (
          <Drawer open={mobileCommentsOpen} onOpenChange={setMobileCommentsOpen} swipeDirection="right">
            <DrawerContent className="lg:hidden" aria-label="Komentáře ke kurzu">
              {commentsPanelInner}
            </DrawerContent>
          </Drawer>
        )}

        {/* Add Module Modal */}
        <Modal
          isOpen={showAddModuleModal}
          onClose={() => { setShowAddModuleModal(false); setNewModuleTitle(''); }}
          title="Přidat nový modul"
          footer={
            <>
              <button
                onClick={() => { setShowAddModuleModal(false); setNewModuleTitle(''); }}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={handleAddModule}
                disabled={!newModuleTitle.trim()}
                className="px-4 py-2 bg-gradient-r text-primary-foreground rounded-md hover:bg-gradient-r/80 transition-colors disabled:bg-muted disabled:cursor-not-allowed"
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
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-gradient-r/30 text-foreground"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddModule(); }}
          />
        </Modal>
      </div>
      </>
      )}
    </div>
  );
}

export default CourseContentView;
