'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Module, Practice, PracticeQuestion, QuestionType } from '@/api';
import { getCourse, getCourses } from '@/lib/api-client';
import { slugify } from '@/lib/utils';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState } from '@/components/admin';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  ArrowRight,
  Trash2
} from 'lucide-react';

interface QuestionItem {
  id: number;
  question: string;
  type: 'closed' | 'open';
  options: { id: number; text: string; isCorrect: boolean }[];
}

export default function TestContentPage() {
  const router = useRouter();
  const params = useParams();
  const courseSlug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set([0]));
  
  // Questions state
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 1,
      question: 'Jaký obsah kofeinu mají zrna Robusta?',
      type: 'closed',
      options: [
        { id: 1, text: 'Velmi jemné', isCorrect: true },
        { id: 2, text: 'Hrubé', isCorrect: false },
        { id: 3, text: 'Střední', isCorrect: false },
      ],
    },
    {
      id: 2,
      question: 'Pro kterou metodu přípravy kávy je ideální hrubé mletí?',
      type: 'closed',
      options: [
        { id: 1, text: 'French press', isCorrect: true },
        { id: 2, text: 'Espresso', isCorrect: false },
        { id: 3, text: 'Moka konvička', isCorrect: false },
      ],
    },
  ]);

  useEffect(() => {
    async function loadCourse() {
      try {
        // Get all courses and find the one matching the slug
        const courses = await getCourses();
        
        // Check if slug is a numeric ID (for backward compatibility)
        const isNumericId = /^\d+$/.test(courseSlug);
        
        const courseMatch = isNumericId 
          ? courses.find(c => c.courseId === Number(courseSlug))
          : courses.find(c => slugify(c.title) === courseSlug);
        
        if (!courseMatch) {
          setError('Kurz nebyl nalezen');
          return;
        }
        
        // Get full course details with modules
        const course = await getCourse(courseMatch.courseId);
        
        setCourseId(course.courseId);
        setCourseTitle(course.title);
        setModules(course.modules || []);
        
        // Load questions from first module's practices
        if (course.modules && course.modules.length > 0) {
          const firstModule = course.modules[0];
          if (firstModule.practices && firstModule.practices.length > 0) {
            const loadedQuestions: QuestionItem[] = [];
            firstModule.practices.forEach((practice) => {
              practice.questions?.forEach((q, qIndex) => {
                loadedQuestions.push({
                  id: q.questionId || qIndex + 1,
                  question: q.question,
                  type: q.questionType === 'closed' ? 'closed' : 'open',
                  options: q.closedOptions?.map((opt, oIndex) => ({
                    id: opt.optionId || oIndex + 1,
                    text: opt.text,
                    isCorrect: opt.text === q.correctAnswer,
                  })) || [],
                });
              });
            });
            if (loadedQuestions.length > 0) {
              setQuestions(loadedQuestions);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Nepodařilo se načíst kurz');
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseSlug]);

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
    const module = modules[index];
    
    // Load questions for selected module
    if (module?.practices && module.practices.length > 0) {
      const loadedQuestions: QuestionItem[] = [];
      module.practices.forEach((practice) => {
        practice.questions?.forEach((q, qIndex) => {
          loadedQuestions.push({
            id: q.questionId || qIndex + 1,
            question: q.question,
            type: q.questionType === 'closed' ? 'closed' : 'open',
            options: q.closedOptions?.map((opt, oIndex) => ({
              id: opt.optionId || oIndex + 1,
              text: opt.text,
              isCorrect: opt.text === q.correctAnswer,
            })) || [],
          });
        });
      });
      if (loadedQuestions.length > 0) {
        setQuestions(loadedQuestions);
      }
    }
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
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
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

  const handleSave = async () => {
    // TODO: Implement save functionality with backend
    console.log('Saving test content...', questions);
    // Navigate to course edit or overview page
    if (courseId) {
      router.push(`/admin/courses/${courseSlug}/edit`);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  // Create outline items from modules
  const outlineItems = modules.map((module, index) => ({
    id: index,
    title: module.title,
    isExpanded: expandedOutlineItems.has(index),
    subItems: module.practices?.flatMap(p => 
      p.questions?.map(q => q.question.substring(0, 30) + '...') || []
    ) || [],
  }));

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      {/* Header - buttons commented out via showButtons=false */}
      <CoursePageHeader
        breadcrumb="Kurzy / Přehled kurzů / Popis kurzu / Tvorba obsahu kurzu / Tvorba obsahu testu"
        title="Tvorba obsahu testu"
        onSave={handleSave}
        showButtons={false}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Sidebar - Course Outline */}
        <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
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
                    selectedModuleIndex === index ? 'bg-purple-50 border-l-2 border-purple-600' : ''
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
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b">
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
                      <option value="closed">Typ otázky</option>
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

          {/* Footer Actions */}
          <PageFooterActions
            onBack={() => router.push(`/admin/courses/${courseSlug}/content`)}
            onContinue={handleSave}
            continueLabel="Uložit"
          />
        </div>
      </div>
    </div>
  );
}
