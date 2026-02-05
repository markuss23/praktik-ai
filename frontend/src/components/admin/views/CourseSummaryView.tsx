'use client';

import { useState, useEffect } from 'react';
import { Module, Course } from '@/api';
import { getCourse, updateCourse } from '@/lib/api-client';
import { CoursePageHeader, PageFooterActions, LoadingState, ErrorState } from '@/components/admin';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { 
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CourseSummaryViewProps {
  courseId: number;
}

// Souhrn kurzu s přehledem modulů
export function CourseSummaryView({ courseId }: CourseSummaryViewProps) {
  const { goToCourseTests, goToCourses } = useAdminNavigation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set());
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    async function loadCourse() {
      try {
        const courseData = await getCourse(courseId);
        setCourse(courseData);
        setModules(courseData.modules || []);
        setEditedTitle(courseData.title || '');
        setEditedDescription(courseData.description || '');
        // Rozbalit všechny moduly
        setExpandedOutlineItems(new Set((courseData.modules || []).map((_, i) => i)));
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

  const getTotalQuestions = () => {
    return modules.reduce((total, module) => {
      return total + (module.practiceQuestions?.length || 0);
    }, 0);
  };

  const handleBack = () => {
    goToCourseTests(courseId);
  };

  const handleFinish = async () => {
    if (!course) return;
    
    setSaving(true);
    try {
      await updateCourse(courseId, {
        title: editedTitle,
        description: editedDescription,
        categoryId: course.categoryId || 1,
      });
      goToCourses();
    } catch (err) {
      console.error('Failed to save course:', err);
      setError('Nepodařilo se uložit kurz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !course) {
    return <ErrorState message={error || 'Kurz nenalezen'} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100">
      <CoursePageHeader
        breadcrumb={`Kurzy / ${course.title} / Souhrn kurzu`}
        title="Souhrn kurzu"
        onSave={handleFinish}
        showButtons={false}
      />

      <div className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6">
        {/* Left Sidebar - Course Outline */}
        <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Osnova kurzu</h2>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {modules.map((module, index) => (
              <div key={module.moduleId} className="border-b border-gray-100 last:border-b-0">
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 border-l-4 border-l-transparent"
                  onClick={() => toggleOutlineItem(index)}
                >
                  {expandedOutlineItems.has(index) ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronUp size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-black font-medium truncate">{module.title}</span>
                </div>
                {expandedOutlineItems.has(index) && (
                  <div className="pb-2 pl-10 pr-4">
                    <span className="text-xs text-gray-500">
                      {module.practiceQuestions?.length || 0} otázek
                    </span>
                  </div>
                )}
              </div>
            ))}
            
            {modules.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                Žádné moduly
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Summary */}
        <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-black">Přehled kurzu</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Editable Course Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název kurzu</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                  placeholder="Zadejte název kurzu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Popis kurzu</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-black"
                  placeholder="Zadejte popis kurzu"
                />
              </div>
            </div>

            {/* Statistics - compact inline */}
            <div className="text-sm text-gray-500">
              {modules.length} modulů • {getTotalQuestions()} otázek
            </div>

            {/* Modules List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-black text-sm">Přehled modulů</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {modules.map((module, index) => (
                  <div key={module.moduleId} className="p-3 flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-black">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black truncate">{module.title}</p>
                      <p className="text-xs text-gray-500">
                        {module.practiceQuestions?.length || 0} otázek
                      </p>
                    </div>
                  </div>
                ))}
                
                {modules.length === 0 && (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Kurz zatím nemá žádné moduly
                  </div>
                )}
              </div>
            </div>

          </div>

          <PageFooterActions
            onBack={handleBack}
            onContinue={handleFinish}
            continueLabel={saving ? 'Ukládám...' : 'Dokončit'}
            backLabel="Zpět k testům"
            continueDisabled={saving}
          />
        </div>
      </div>
    </div>
  );
}

export default CourseSummaryView;
