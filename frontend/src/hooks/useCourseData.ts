'use client';

import { useState, useEffect } from 'react';
import { Module } from '@/api';
import { getCourse } from '@/lib/api-client';

interface UseCourseDataOptions {
  courseId: number;
  initialModuleId?: number;
}

// Cache načtených kurzů v rámci sezení – přepínání fází (podklady ↔ testy)
// se tak vykreslí okamžitě z cache a data se jen na pozadí revalidují.
type CourseData = Awaited<ReturnType<typeof getCourse>>;
const courseCache = new Map<number, CourseData>();

interface UseCourseDataResult {
  loading: boolean;
  error: string;
  courseTitle: string;
  modules: Module[];
  selectedModuleIndex: number;
  setSelectedModuleIndex: (index: number) => void;
  expandedOutlineItems: Set<number>;
  setExpandedOutlineItems: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleOutlineItem: (index: number) => void;
  selectModule: (index: number) => void;
  courseData: Awaited<ReturnType<typeof getCourse>> | null;
}

export function useCourseData({ courseId, initialModuleId }: UseCourseDataOptions): UseCourseDataResult {
  const cached = courseCache.get(courseId) ?? null;
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');
  const [courseTitle, setCourseTitle] = useState(cached?.title ?? '');
  const [modules, setModules] = useState<Module[]>(cached?.modules ?? []);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set([0]));
  const [courseData, setCourseData] = useState<CourseData | null>(cached);

  useEffect(() => {
    let cancelled = false;

    const applyInitialModule = (course: CourseData) => {
      if (initialModuleId && course.modules) {
        const idx = course.modules.findIndex(m => m.moduleId === initialModuleId);
        if (idx >= 0) {
          setSelectedModuleIndex(idx);
          setExpandedOutlineItems(new Set([idx]));
        }
      }
    };

    // Pokud máme kurz v cache, vykreslíme ho okamžitě (bez loading spinneru)
    const cachedNow = courseCache.get(courseId);
    if (cachedNow) {
      setCourseData(cachedNow);
      setCourseTitle(cachedNow.title);
      setModules(cachedNow.modules || []);
      setLoading(false);
      applyInitialModule(cachedNow);
    } else {
      setLoading(true);
    }

    async function loadCourse() {
      try {
        const course = await getCourse(courseId);
        if (cancelled) return;
        courseCache.set(courseId, course);
        setCourseData(course);
        setCourseTitle(course.title);
        setModules(course.modules || []);
        applyInitialModule(course);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load course:', err);
        // Chybu hlásíme jen pokud nemáme co zobrazit z cache
        if (!courseCache.has(courseId)) setError('Nepodařilo se načíst kurz');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCourse();

    return () => { cancelled = true; };
  }, [courseId, initialModuleId]);

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

  return {
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
  };
}
