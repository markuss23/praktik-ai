'use client';

import { useState, useEffect } from 'react';
import { CourseBlock, CourseTarget, CourseSubject } from '@/api';
import { getCourseBlocks, getCourseTargets, getCourseSubjects } from '@/lib/api-client';

interface UseCatalogDataResult {
  blocks: CourseBlock[];
  targets: CourseTarget[];
  subjects: CourseSubject[];
  loading: boolean;
}

export function useCatalogData(): UseCatalogDataResult {
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, t, s] = await Promise.all([
          getCourseBlocks(),
          getCourseTargets(),
          getCourseSubjects(),
        ]);
        setBlocks(b);
        setTargets(t);
        setSubjects(s);
      } catch (err) {
        console.error('Failed to load catalogs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { blocks, targets, subjects, loading };
}
