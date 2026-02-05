'use client';

import { useState, useEffect } from 'react';
import { Module, PracticeQuestion, QuestionType } from '@/api';
import { getCourse, updatePracticeQuestion, updatePracticeOption, createPracticeQuestion, createPracticeOption } from '@/lib/api-client';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState } from '@/components/admin';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';

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
}

// Editor testů/otázek pro moduly kurzu
export function CourseTestsView({ courseId }: CourseTestsViewProps) {
  const { goToCourseContent, goToCourseSummary } = useAdminNavigation();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set([0]));
  
  // Stav otázek pro každý modul
  const [moduleQuestions, setModuleQuestions] = useState<{[key: number]: QuestionItem[]}>({});
  
  // Otázky aktuálního modulu
  const questions = moduleQuestions[selectedModuleIndex] || [];
  
  // Nastavení otázek pro aktuální modul
  const setQuestions = (newQuestions: QuestionItem[] | ((prev: QuestionItem[]) => QuestionItem[])) => {
    setModuleQuestions(prev => ({
      ...prev,
      [selectedModuleIndex]: typeof newQuestions === 'function' 
        ? newQuestions(prev[selectedModuleIndex] || [])
        : newQuestions
    }));
  };

  useEffect(() => {
    async function loadCourse() {
      try {
        const course = await getCourse(courseId);
        
        setCourseTitle(course.title);
        setModules(course.modules || []);
        
        // Načtení otázek pro všechny moduly
        if (course.modules && course.modules.length > 0) {
          const allModuleQuestions: {[key: number]: QuestionItem[]} = {};
          
          course.modules.forEach((module, moduleIndex) => {
            if (module.practiceQuestions && module.practiceQuestions.length > 0) {
              const loadedQuestions: QuestionItem[] = module.practiceQuestions.map((q, qIndex) => ({
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
              allModuleQuestions[moduleIndex] = loadedQuestions;
            } else {
              allModuleQuestions[moduleIndex] = [];
            }
          });
          
          setModuleQuestions(allModuleQuestions);
        }
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Nepodařilo se načíst kurz');
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

  const toggleOutlineItem = (index: number) => {
    setExpandedOutlineItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectModule = (index: number) => {
    setSelectedModuleIndex(index);
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
          return {
            ...q,
            type: 'open' as const,
          };
        }
      }
      
      return { ...q, [field]: value };
    }));
  };

  const updateOption = (questionId: number, optionId: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(opt => 
            opt.id === optionId ? { ...opt, text } : opt
          ),
        };
      }
      return q;
    }));
  };

  const setCorrectOption = (questionId: number, optionId: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(opt => ({
            ...opt,
            isCorrect: opt.id === optionId,
          })),
        };
      }
      return q;
    }));
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const saveTestContent = async () => {
    try {
      const updatePromises: Promise<unknown>[] = [];
      const createdQuestions: { moduleIndex: number; questionIndex: number; question: QuestionItem }[] = [];
      const newOptionsForExistingQuestions: { moduleIndex: number; questionIndex: number; optionIndex: number; option: QuestionItem['options'][0]; questionId: number }[] = [];
      
      for (const moduleIndex of Object.keys(moduleQuestions)) {
        const questionsForModule = moduleQuestions[Number(moduleIndex)] || [];
        const module = modules[Number(moduleIndex)];
        
        for (let qIndex = 0; qIndex < questionsForModule.length; qIndex++) {
          const question = questionsForModule[qIndex];
          
          if (question.questionId) {
            const correctOption = question.options.find(opt => opt.isCorrect);
            
            updatePromises.push(
              updatePracticeQuestion(question.questionId, {
                position: question.position ?? question.id,
                question: question.question,
                questionType: question.type === 'closed' ? QuestionType.Closed : QuestionType.Open,
                correctAnswer: correctOption?.text ?? question.correctAnswer,
                exampleAnswer: question.exampleAnswer,
              })
            );
            
            if (question.type === 'closed') {
              for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
                const option = question.options[optIndex];
                if (option.optionId) {
                  updatePromises.push(
                    updatePracticeOption(option.optionId, {
                      text: option.text,
                      position: option.position ?? option.id,
                    })
                  );
                } else {
                  newOptionsForExistingQuestions.push({
                    moduleIndex: Number(moduleIndex),
                    questionIndex: qIndex,
                    optionIndex: optIndex,
                    option,
                    questionId: question.questionId,
                  });
                }
              }
            }
          } else if (module?.moduleId) {
            createdQuestions.push({
              moduleIndex: Number(moduleIndex),
              questionIndex: qIndex,
              question,
            });
          }
        }
      }
      
      await Promise.all(updatePromises);
      
      for (const { moduleIndex, questionIndex, optionIndex, option, questionId } of newOptionsForExistingQuestions) {
        const createdOption = await createPracticeOption({
          questionId,
          position: option.position ?? option.id,
          text: option.text,
        });
        
        setModuleQuestions(prev => {
          const updated = { ...prev };
          if (updated[moduleIndex] && updated[moduleIndex][questionIndex]) {
            const questionCopy = { ...updated[moduleIndex][questionIndex] };
            questionCopy.options = [...questionCopy.options];
            questionCopy.options[optionIndex] = {
              ...questionCopy.options[optionIndex],
              optionId: createdOption.optionId,
            };
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
            updated[moduleIndex][questionIndex] = {
              ...updated[moduleIndex][questionIndex],
              questionId: createdQuestion.questionId,
            };
          }
          return updated;
        });
        
        if (question.type === 'closed' && createdQuestion.questionId) {
          for (let optIndex = 0; optIndex < question.options.length; optIndex++) {
            const option = question.options[optIndex];
            const createdOption = await createPracticeOption({
              questionId: createdQuestion.questionId,
              position: option.position ?? option.id,
              text: option.text,
            });
            
            setModuleQuestions(prev => {
              const updated = { ...prev };
              if (updated[moduleIndex] && updated[moduleIndex][questionIndex]) {
                const questionCopy = { ...updated[moduleIndex][questionIndex] };
                questionCopy.options = [...questionCopy.options];
                questionCopy.options[optIndex] = {
                  ...questionCopy.options[optIndex],
                  optionId: createdOption.optionId,
                };
                updated[moduleIndex] = [...updated[moduleIndex]];
                updated[moduleIndex][questionIndex] = questionCopy;
              }
              return updated;
            });
          }
        }
      }
      
      console.log('Test content saved successfully');
    } catch (err) {
      console.error('Failed to save test content:', err);
      alert('Nepodařilo se uložit obsah testu');
      throw err;
    }
  };

  // Validace všech otázek ve všech modulech
  const validateQuestions = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    for (const moduleIndexStr of Object.keys(moduleQuestions)) {
      const moduleIndex = Number(moduleIndexStr);
      const questionsForModule = moduleQuestions[moduleIndex] || [];
      const module = modules[moduleIndex];
      const moduleName = module?.title || `Modul ${moduleIndex + 1}`;
      
      questionsForModule.forEach((question, qIndex) => {
        // Kontrola textu otázky
        if (!question.question.trim()) {
          errors.push({
            moduleIndex,
            moduleName,
            questionIndex: qIndex,
            message: `Otázka ${qIndex + 1} nemá zadaný text otázky`,
          });
        }
        
        if (question.type === 'closed') {
          // Kontrola možností odpovědí
          const hasAnyOption = question.options.some(opt => opt.text.trim());
          if (!hasAnyOption) {
            errors.push({
              moduleIndex,
              moduleName,
              questionIndex: qIndex,
              message: `Otázka ${qIndex + 1} nemá žádné možnosti odpovědí`,
            });
          }
          
          // Kontrola správné odpovědi
          const hasCorrectAnswer = question.options.some(opt => opt.isCorrect && opt.text.trim());
          if (!hasCorrectAnswer) {
            errors.push({
              moduleIndex,
              moduleName,
              questionIndex: qIndex,
              message: `Otázka ${qIndex + 1} nemá označenou správnou odpověď`,
            });
          }
        } else if (question.type === 'open') {
          // Kontrola příkladu odpovědi
          if (!question.exampleAnswer?.trim()) {
            errors.push({
              moduleIndex,
              moduleName,
              questionIndex: qIndex,
              message: `Otázka ${qIndex + 1} nemá příklad odpovědi`,
            });
          }
        }
      });
    }
    
    return errors;
  };

  const handleContinue = async () => {
    // Nejdřív validace otázek
    const errors = validateQuestions();
    if (errors.length > 0) {
      setValidationErrors(errors);
      // Scroll nahoru pro zobrazení chyb
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setValidationErrors([]);
    await saveTestContent();
    goToCourseSummary(courseId);
  };

  const handleBack = async () => {
    await saveTestContent();
    goToCourseContent(courseId);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const outlineItems = modules.map((module, index) => ({
    id: index,
    title: module.title,
    isExpanded: expandedOutlineItems.has(index),
    subItems: module.practiceQuestions?.map((q: PracticeQuestion) => 
      q.question.substring(0, 30) + '...'
    ) || [],
  }));

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${courseTitle} / Tvorba obsahu testu`}
        title="Tvorba obsahu testu"
        onSave={handleContinue}
        showButtons={false}
      />

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="mx-4 sm:mx-6 mt-2 bg-red-50 rounded-lg p-2">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <span>Opravte následující chyby:</span>
          </div>
          <ul className="list-disc list-inside text-black text-sm space-y-1">
            {validationErrors.map((err, idx) => (
              <li 
                key={idx}
                className="cursor-pointer hover:underline"
                onClick={() => selectModule(err.moduleIndex)}
              >
                <span className="font-medium">{err.moduleName}</span>, otázka {err.questionIndex + 1}: {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Sidebar - Course Outline */}
        <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-black">Osnova kurzu</h2>
              <button className="p-1 hover:bg-gray-100 rounded">
                <Plus size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {outlineItems.map((item, index) => (
              <div key={item.id} className="border-b border-gray-100 last:border-b-0">
                <div
                  className={`flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    selectedModuleIndex === index ? 'bg-purple-50 border-l-4 border-l-purple-600' : 'border-l-4 border-l-transparent'
                  }`}
                  onClick={() => {
                    selectModule(index);
                    toggleOutlineItem(index);
                  }}
                >
                  {item.isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronUp size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-black font-medium truncate">{item.title}</span>
                </div>
                {item.isExpanded && item.subItems && item.subItems.length > 0 && (
                  <div className="pb-2">
                    {item.subItems.map((subItem, subIndex) => (
                      <div
                        key={subIndex}
                        className="pl-10 pr-4 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer truncate"
                      >
                        {subItem}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Content - Test Editor */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Úprava testu</h2>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-black mb-2">
                      Otázka {qIndex + 1}
                    </label>
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
                    <button
                      onClick={() => removeQuestion(question.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Options for closed questions */}
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
                        <span
                          className={`w-4 h-4 rounded-full flex-shrink-0 ${
                            option.isCorrect ? 'bg-purple-600' : 'border-2 border-gray-300'
                          }`}
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(question.id, option.id, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-black text-sm"
                          placeholder="Možnost odpovědi..."
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Open question - example answer field */}
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

            {/* Add Question Button */}
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-gray-600 hover:text-purple-600 w-full justify-center"
            >
              <Plus size={16} />
              <span className="text-sm">Přidat otázku</span>
            </button>
          </div>

          <PageFooterActions
            onBack={handleBack}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  );
}

export default CourseTestsView;
