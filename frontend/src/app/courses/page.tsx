'use client';

import Link from "next/link";
import { getCourses } from "@/lib/api-client";
import { Course } from "@/api";
import { useState, useEffect } from "react";
import { CourseCard } from "@/components/ui";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await getCourses({ isPublished: true });
        setCourses(data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  return (
    <div style={{ backgroundColor: '#F0F0F0' }} className="min-h-screen">
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px] py-8" style={{ maxWidth: '1440px' }}>
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700">Home</Link>
          </p>
          <h1 className="text-3xl font-bold text-black">Přehled kurzů</h1>
        </div>

        {loading ? (
          <p className="text-gray-500">Načítání kurzů...</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-500">Žádné kurzy nejsou k dispozici.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.courseId}
                id={String(course.courseId)}
                title={course.title}
                description={course.description || ''}
                duration={course.modulesCount ? course.modulesCount * 20 : 60}
                difficulty="Začátečník"
                completedModules={0}
                totalModules={course.modulesCount || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}