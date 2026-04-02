'use client';

import { getCourses } from "@/lib/api-client";
import { Course } from "@/api";
import { useState, useEffect } from "react";
import { CourseCard } from "@/components/ui";

export default function CoursesContent() {
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

  if (loading) {
    return <p className="text-gray-500">Načítání kurzů...</p>;
  }

  if (courses.length === 0) {
    return <p className="text-gray-500">Žádné kurzy nejsou k dispozici.</p>;
  }

  return (
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
  );
}
