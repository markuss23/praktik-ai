'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { Course } from '@/api';
import { getRecommendedCourses } from '@/lib/api-client';
import { CourseCard } from '@/components/ui';

const LIMIT = 3;

export function RecommendedCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getRecommendedCourses(LIMIT)
      .then((data) => {
        if (alive) setCourses(data);
      })
      .catch(() => {
        if (alive) setCourses([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!loading && courses.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={22} className="text-purple-600" />
            Mohlo by tě zajímat
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Kurzy podle tvého zájmu, do kterých ještě nejsi zapsaný/á.
          </p>
        </div>
        <Link
          href="/courses"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:text-purple-900"
        >
          Všechny kurzy
          <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.from({ length: LIMIT }, (_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 h-[530px] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {courses.map((c) => (
            <CourseCard
              key={c.courseId}
              id={String(c.courseId)}
              title={c.title}
              description={c.description ?? ''}
              duration={c.durationMinutes ?? (c.modulesCount ? c.modulesCount * 20 : 60)}
              difficulty={c.difficulty}
              completedModules={0}
              totalModules={c.modulesCount ?? 0}
            />
          ))}
        </div>
      )}

      <div className="sm:hidden mt-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-purple-700"
        >
          Všechny kurzy
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
