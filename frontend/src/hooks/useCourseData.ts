'use client';

import { useState, useEffect } from 'react';
import { Module } from '@/api';
import { getCourse } from '@/lib/api-client';

interface UseCourseDataOptions {
  courseId: number;
  initialModuleId?: number;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(0);
  const [expandedOutlineItems, setExpandedOutlineItems] = useState<Set<number>>(new Set([0]));
  const [courseData, setCourseData] = useState<Awaited<ReturnType<typeof getCourse>> | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        const course = await getCourse(courseId);
        setCourseData(course);
        setCourseTitle(course.title);
        setModules(course.modules || []);

        if (initialModuleId && course.modules) {
          const idx = course.modules.findIndex(m => m.moduleId === initialModuleId);
          if (idx >= 0) {
            setSelectedModuleIndex(idx);
            setExpandedOutlineItems(new Set([idx]));
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
