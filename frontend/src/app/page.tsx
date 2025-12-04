'use client';

import { Hero } from "@/components/layout";
import { CourseCard } from "@/components/ui";
import { getCourses } from "@/lib/api-client";
import { useState, useEffect } from "react";

export default function Home() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadCourses = async () => {
    try {
      const data = await getCourses({ isPublished: true });
      setCourses(data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      // Fallback to sample data when API is unavailable
      setCourses([
        {
          id: 1,
          name: "Jak komunikovat s AI?",
          description: "V kurzu Jak komunikovat s AI? se dozvíte, jak správně a účinně zadávat, aby vám AI dávala přesné a praktické odpovědi k vaší práci.",
        },
        {
          id: 2,
          name: "Pokročilé techniky práce s AI",
          description: "V tomto kurzu se naučíte, jak pomocí AI strukturovaných promptů, rolí a vícekrokového zadávání dosáhnout přesnějších a profesionálních výstupů od AI.",
        },
        {
          id: 3,
          name: "AI jako váš osobní asistent",
          description: "Zjistěte, jak využít AI jako efektivního asistenta pro správu úkolů, komplexní analýzu textů, automatizaci každodenních činností a podporu při rozhodování.",
        },
      ]);
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
