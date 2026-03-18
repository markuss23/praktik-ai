'use client';

import { useState } from 'react';
import { QuestionType } from '@/api';
import { updatePracticeQuestion, updatePracticeOption, createPracticeQuestion, createPracticeOption } from '@/lib/api-client';
import { CoursePageHeader, LoadingState, ErrorState } from '@/components/admin';
import { CourseOutlineSidebar } from '@/components/admin/CourseOutlineSidebar';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCourseData } from '@/hooks/useCourseData';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
} from 'lucide-react';

// Přetahovatelná položka otázky v osnově
function SortableQuestionItem({
  id,
  label,
  onClick,
}: {
  id: string;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 pl-8 pr-4 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} className="text-gray-400" />
      </div>
      <span className="truncate">{label}</span>
    </div>
  );
}

interface QuestionItem {
  id: number;
  questionId?: number;
  position?: number;
  question: string;
  type: 'closed' | 'open';
  correctAnswer?: string;
  exampleAnswer?: string;
  options: { id: number; optionId?: number; text: string; isCorrect: boolean; position?: number }[];
}

interface ValidationError {
  moduleIndex: number;
  moduleName: string;
  questionIndex: number;
  message: string;
}

interface CourseTestsViewProps {
  courseId: number;
  initialModuleId?: number;
}

// Editor testů/otázek pro moduly kurzu
export function CourseTestsView({ courseId, initialModuleId }: CourseTestsViewProps) {
  const { goToCourseContent, goToCourseSummary } = useAdminNavigation();
  const {
    loading,
    error,
    courseTitle,
    modules,
    selectedModuleIndex,
    setSelectedModuleIndex,
    expandedOutlineItems,
    setExpandedOutlineItems,
    toggleOutlineItem,
    selectModule,
    courseData,
  } = useCourseData({ courseId, initialModuleId });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Stav otázek pro každý modul
  const [moduleQuestions, setModuleQuestions] = useState<{[key: number]: QuestionItem[]}>({});
  const [questionsInitialized, setQuestionsInitialized] = useState(false);

  // Inicializace otázek z courseData
  if (courseData && !questionsInitialized) {
    const allModuleQuestions: {[key: number]: QuestionItem[]} = {};
    (courseData.modules || []).forEach((module, moduleIndex) => {
      if (module.practiceQuestions && module.practiceQuestions.length > 0) {
        allModuleQuestions[moduleIndex] = module.practiceQuestions.map((q, qIndex) => ({
          id: qIndex + 1,
          questionId: q.questionId,
          position: q.position,
          question: q.question,
          type: q.questionType === QuestionType.Closed ? 'closed' : 'open',
          correctAnswer: q.correctAnswer ?? undefined,
          exampleAnswer: q.exampleAnswer ?? undefined,
          options: q.closedOptions?.map((opt, oIndex) => ({
            id: oIndex + 1,
            optionId: opt.optionId,
            position: opt.position,
            text: opt.text,
            isCorrect: opt.text === q.correctAnswer,
          })) || [],
        }));
      } else {
        allModuleQuestions[moduleIndex] = [];
      }
    });
    setModuleQuestions(allModuleQuestions);
    setQuestionsInitialized(true);
  }

  const questions = moduleQuestions[selectedModuleIndex] || [];

  const setQuestions = (newQuestions: QuestionItem[] | ((prev: QuestionItem[]) => QuestionItem[])) => {
    setModuleQuestions(prev => ({
      ...prev,
      [selectedModuleIndex]: typeof newQuestions === 'function'
        ? newQuestions(prev[selectedModuleIndex] || [])
        : newQuestions
    }));
  };

  const handleQuestionDragEnd = (moduleIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const questionsForModule = moduleQuestions[moduleIndex] || [];
    const oldIdx = questionsForModule.findIndex(q => `q-${moduleIndex}-${q.id}` === active.id);
    const newIdx = questionsForModule.findIndex(q => `q-${moduleIndex}-${q.id}` === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    setReordering(true);
    const reordered = arrayMove(questionsForModule, oldIdx, newIdx).map((q, idx) => ({
      ...q,
      position: idx + 1,
    }));

    setTimeout(() => {
      setModuleQuestions(prev => ({ ...prev, [moduleIndex]: reordered }));
      setReordering(false);
    }, 600);
  };

  const addQuestion = () => {
    const newId = Math.max(...questions.map(q => q.id), 0) + 1;
    setQuestions([
      ...questions,
      {
        id: newId,
        question: '',
        type: 'closed',
        options: [
          { id: 1, text: '', isCorrect: false },
          { id: 2, text: '', isCorrect: false },
          { id: 3, text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const updateQuestion = (id: number, field: keyof QuestionItem, value: string | 'closed' | 'open') => {
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;
      if (field === 'type') {
        if (value === 'closed' && q.type === 'open') {
          return {
            ...q,
            type: 'closed' as const,
            options: q.options.length > 0 ? q.options : [
              { id: 1, text: '', isCorrect: false },
              { id: 2, text: '', isCorrect: false },
              { id: 3, text: '', isCorrect: false },
            ],
          };
        } else if (value === 'open' && q.type === 'closed') {
          return { ...q, type: 'open' as const };
        }
      }
      return { ...q, [field]: value };
    }));
  };

  const updateOption = (questionId: number, optionId: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: q.options.map(opt => opt.id === optionId ? { ...opt, text } : opt) };
      }
      return q;
    }));
  };

  const setCorrectOption = (questionId: number, optionId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: q.options.map(opt => ({ ...opt, isCorrect: opt.id === optionId })) };
      }
      return q;
    }));
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const saveTestContent = async () => {
    try {
      const questionUpdates: { questionId: number; data: Parameters<typeof updatePracticeQuestion>[1] }[] = [];
      const optionUpdatePromises: Promise<unknown>[] = [];
      const createdQuestions: { moduleIndex: number; questionIndex: number; question: QuestionItem }[] = [];
      const newOptionsForExistingQuestions: { moduleIndex: number; questionIndex: number; optionIndex: number; option: QuestionItem['options'][0]; questionId: number }[] = [];

      for (const moduleIndex of Object.keys(moduleQuestions)) {
        const questionsForModule = moduleQuestions[Number(moduleIndex)] || [];
        const module = modules[Number(moduleIndex)];

        for (let qIndex = 0; qIndex < questionsForModule.length; qIndex++) {
          const question = questionsForModule[qIndex];

          if (question.questionId) {
            const correctOption = question.options.find(opt => opt.isCorrect);
            questionUpdates.push({
              questionId: question.questionId,
              data: {
                position: question.position ?? question.id,
                question: question.question,
                questionType: question.type === 'closed' ? QuestionType.Closed : QuestionType.Open,
                correctAnswer: correctOption?.text ?? question.correctAnswer,
                exampleAnswer: question.exampleAnswer,
              },
            });

            if (question.type === 'closed') {
              for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
                const option = question.options[optIndex];
                if (option.optionId) {
                  optionUpdatePromises.push(
                    updatePracticeOption(option.optionId, { text: option.text, position: option.position ?? option.id })
                  );
                } else {
                  newOptionsForExistingQuestions.push({
                    moduleIndex: Number(moduleIndex), questionIndex: qIndex, optionIndex: optIndex, option, questionId: question.questionId,
                  });
                }
              }
            }
          } else if (module?.moduleId) {
            createdQuestions.push({ moduleIndex: Number(moduleIndex), questionIndex: qIndex, question });
          }
        }
      }

      for (let i = 0; i < questionUpdates.length; i++) {
        const { questionId, data } = questionUpdates[i];
        await updatePracticeQuestion(questionId, { ...data, position: 9000 + i });
      }
      for (const { questionId, data } of questionUpdates) {
        await updatePracticeQuestion(questionId, data);
      }

      await Promise.all(optionUpdatePromises);

      for (const { moduleIndex, questionIndex, optionIndex, option, questionId } of newOptionsForExistingQuestions) {
        const createdOption = await createPracticeOption({ questionId, position: option.position ?? option.id, text: option.text });
        setModuleQuestions(prev => {
          const updated = { ...prev };
          if (updated[moduleIndex] && updated[moduleIndex][questionIndex]) {
            const questionCopy = { ...updated[moduleIndex][questionIndex] };
            questionCopy.options = [...questionCopy.options];
            questionCopy.options[optionIndex] = { ...questionCopy.options[optionIndex], optionId: createdOption.optionId };
            updated[moduleIndex] = [...updated[moduleIndex]];
            updated[moduleIndex][questionIndex] = questionCopy;
          }
          return updated;
        });
      }

      for (const { moduleIndex, questionIndex, question } of createdQuestions) {
        const module = modules[moduleIndex];
        if (!module?.moduleId) continue;
        const correctOption = question.options.find(opt => opt.isCorrect);
        const createdQuestion = await createPracticeQuestion({
          moduleId: module.moduleId,
          position: question.position ?? question.id,
          questionType: question.type === 'closed' ? QuestionType.Closed : QuestionType.Open,
          question: question.question,
          correctAnswer: correctOption?.text ?? question.correctAnswer,
          exampleAnswer: question.exampleAnswer,
        });

        setModuleQuestions(prev => {
          const updated = { ...prev };
          if (updated[moduleIndex]) {
            updated[moduleIndex] = [...updated[moduleIndex]];
            updated[moduleIndex][questionIndex] = { ...updated[moduleIndex][questionIndex], questionId: createdQuestion.questionId };
          }
          return updated;
        });

        if (question.type === 'closed' && createdQuestion.questionId) {
          for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
            const option = question.options[optIndex];
            const createdOption = await createPracticeOption({
              questionId: createdQuestion.questionId, position: option.position ?? option.id, text: option.text,
            });
            setModuleQuestions(prev => {
              const updated = { ...prev };
              if (updated[moduleIndex] && updated[moduleIndex][questionIndex]) {
                const questionCopy = { ...updated[moduleIndex][questionIndex] };
                questionCopy.options = [...questionCopy.options];
                questionCopy.options[optIndex] = { ...questionCopy.options[optIndex], optionId: createdOption.optionId };
                updated[moduleIndex] = [...updated[moduleIndex]];
                updated[moduleIndex][questionIndex] = questionCopy;
              }
              return updated;
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to save test content:', err);
      alert('Nepodařilo se uložit obsah testu');
      throw err;
    }
  };

  const validateQuestions = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    for (const moduleIndexStr of Object.keys(moduleQuestions)) {
      const moduleIndex = Number(moduleIndexStr);
      const questionsForModule = moduleQuestions[moduleIndex] || [];
      const module = modules[moduleIndex];
      const moduleName = module?.title || `Modul ${moduleIndex + 1}`;

      questionsForModule.forEach((question, qIndex) => {
        if (!question.question.trim()) {
          errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá zadaný text otázky` });
        }
        if (question.type === 'closed') {
          if (!question.options.some(opt => opt.text.trim())) {
            errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá žádné možnosti odpovědí` });
          }
          if (!question.options.some(opt => opt.isCorrect && opt.text.trim())) {
            errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá označenou správnou odpověď` });
          }
        } else if (question.type === 'open') {
          if (!question.exampleAnswer?.trim()) {
            errors.push({ moduleIndex, moduleName, questionIndex: qIndex, message: `Otázka ${qIndex + 1} nemá příklad odpovědi` });
          }
        }
      });
    }
    return errors;
  };

  const handleFinish = async () => {
    const errors = validateQuestions();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    await saveTestContent();
    goToCourseSummary(courseId);
  };

  const handleNextModule = async () => {
    await saveTestContent();
    if (selectedModuleIndex < modules.length - 1) {
      const nextIndex = selectedModuleIndex + 1;
      setSelectedModuleIndex(nextIndex);
      setExpandedOutlineItems(prev => new Set(prev).add(nextIndex));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = async () => {
    await saveTestContent();
    goToCourseContent(courseId);
  };

  const isLastModule = selectedModuleIndex >= modules.length - 1;

  const scrollToQuestion = (moduleIndex: number, questionIndex: number) => {
    setSelectedModuleIndex(moduleIndex);
    if (!expandedOutlineItems.has(moduleIndex)) {
      setExpandedOutlineItems(prev => new Set(prev).add(moduleIndex));
    }
    setTimeout(() => {
      const el = document.getElementById(`question-${moduleIndex}-${questionIndex}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  // Outline items pro sidebar
  const outlineItems = modules.map((module, index) => {
    const questionsForModule = moduleQuestions[index] || [];
    return {
      id: index,
      title: module.title,
      isExpanded: expandedOutlineItems.has(index),
      isSelected: selectedModuleIndex === index,
      subItems: questionsForModule.map((q, qIdx) => ({
        sortId: `q-${index}-${q.id}`,
        label: q.question ? (q.question.substring(0, 30) + (q.question.length > 30 ? '...' : '')) : `Otázka ${qIdx + 1}`,
        questionIndex: qIdx,
      })),
    };
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${courseTitle} / Tvorba obsahu testu`}
        title="Tvorba obsahu testu"
        onSave={handleFinish}
        showButtons={false}
      />

      {validationErrors.length > 0 && (
        <div className="mx-4 sm:mx-6 mt-2 bg-red-50 rounded-lg p-2">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <span>Opravte následující chyby:</span>
          </div>
          <ul className="list-disc list-inside text-black text-sm space-y-1">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="cursor-pointer hover:underline" onClick={() => selectModule(err.moduleIndex)}>
                <span className="font-medium">{err.moduleName}</span>, otázka {err.questionIndex + 1}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Content - Test Editor */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Úprava testu</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
            {reordering && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-purple-600" />
                  <span className="text-sm text-gray-500">Přeřazuji otázky...</span>
                </div>
              </div>
            )}
            {questions.map((question, qIndex) => (
              <div key={question.id} id={`question-${selectedModuleIndex}-${qIndex}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-black mb-2">Otázka {qIndex + 1}</label>
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm"
                      placeholder="Zadejte otázku..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(question.id, 'type', e.target.value as 'closed' | 'open')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-sm bg-white"
                    >
                      <option value="closed">Uzavřená</option>
                      <option value="open">Otevřená</option>
                    </select>
                    <button onClick={() => removeQuestion(question.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {question.type === 'closed' && (
                  <div className="space-y-2 ml-4">
                    {question.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          checked={option.isCorrect}
                          onChange={() => setCorrectOption(question.id, option.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                        />
                        <span className={`w-4 h-4 rounded-full flex-shrink-0 ${option.isCorrect ? 'bg-purple-600' : 'border-2 border-gray-300'}`} />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-black text-sm"
                          placeholder="Možnost odpovědi..."
                        />
                      </div>
                    ))}
                    {question.correctAnswer && (
                      <p className="mt-3 ml-1 text-xs text-green-600">
                        <span className="font-semibold">Správná odpověď:</span> {question.correctAnswer}
                      </p>
                    )}
                  </div>
                )}

                {question.type === 'open' && (
                  <div className="ml-4">
                    <label className="block text-xs text-gray-500 mb-1">Příklad odpovědi</label>
                    <textarea
                      value={question.exampleAnswer || ''}
                      onChange={(e) => updateQuestion(question.id, 'exampleAnswer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-black text-sm resize-none"
                      rows={2}
                      placeholder="Zadejte příklad správné odpovědi..."
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-gray-600 hover:text-purple-600 w-full justify-center"
            >
              <Plus size={16} />
              <span className="text-sm">Přidat otázku</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
            <button type="button" onClick={handleBack} className="text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium">
              Zpět
            </button>
            <div className="flex items-center gap-3">
              {!isLastModule && (
                <button
                  onClick={handleNextModule}
                  className="flex items-center gap-2 px-5 py-2 rounded-md transition-colors text-sm bg-purple-600 text-white hover:bg-purple-700"
                >
                  <span>Pokračovat na modul {selectedModuleIndex + 2}</span>
                </button>
              )}
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 px-5 py-2 rounded-md transition-colors text-sm bg-green-600 text-white hover:bg-green-700"
              >
                <span>Dokončit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Course Outline */}
        <CourseOutlineSidebar
          items={outlineItems}
          onToggle={(index) => {
            const isOpening = !expandedOutlineItems.has(index);
            toggleOutlineItem(index);
            if (isOpening) selectModule(index);
          }}
          onSelect={selectModule}
          renderSubItems={(item, index) => {
            const subItems = (item as typeof outlineItems[number]).subItems;
            if (!subItems || subItems.length === 0) return null;
            return (
              <div className="pb-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd(index)}>
                  <SortableContext items={subItems.map(s => s.sortId)} strategy={verticalListSortingStrategy}>
                    {subItems.map((subItem) => (
                      <SortableQuestionItem
                        key={subItem.sortId}
                        id={subItem.sortId}
                        label={subItem.label}
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToQuestion(index, subItem.questionIndex);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

export default CourseTestsView;
