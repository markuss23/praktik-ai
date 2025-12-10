'use client';

import { Hero } from "@/components/layout";
import { CourseCard } from "@/components/ui";
import { getCourses } from "@/lib/api-client";
import { useState, useEffect } from "react";

export default function Home() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadCourses = async () => {
    try {
      setError(null);
      const data = await getCourses({ isPublished: true });
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setError('Backend server is currently unavailable. Please make sure the API is running.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <Hero />

      {/* Courses Section */}
      <div className="py-8 sm:py-12 lg:py-16" style={{ backgroundColor: '#F0F0F0' }}>
        <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
          <div className="mb-6 sm:mb-8">
            <p className="text-sm text-gray-500">Home</p>
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6">
            {loading ? (
              <p className="text-gray-500">Načítání kurzů...</p>
            ) : error ? (
              <div className="col-span-full">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Backend Není Dostupný</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={loadCourses}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Zkusit Znovu
                  </button>
                </div>
              </div>
            ) : courses.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                Zatím nejsou k dispozici žádné publikované kurzy.
              </div>
            ) : (
              courses.map((course: any) => (
                <CourseCard
                  key={course.courseId || course.id}
                  id={String(course.courseId || course.id)}
                  title={course.title || course.name}
                  description={course.description || ''}
                  duration={86}
                  difficulty="Začátečník"
                  completedModules={0}
                  totalModules={4}
                  isPublished={course.isPublished}
                  onUpdate={loadCourses}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
