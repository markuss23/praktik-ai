'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import Link from "next/link";
import { getCourses } from "@/lib/api-client";
import { Course } from "@/api";
import { useState, useEffect } from "react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    }
    loadCourses();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-black">Courses</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Link key={course.courseId} href={`/courses/${course.courseId}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="text-black">{course.title}</CardTitle>
                <CardDescription>{course.description || 'No description available'}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}