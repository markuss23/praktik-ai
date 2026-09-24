'use client';

import { useState, useEffect } from 'react';
import { CourseBlock, CourseTarget, CourseSubject, CourseRequirement, CourseEqfLevel, CourseType } from '@/api';
import { getCourseBlocks, getCourseTargets, getCourseSubjects, getCourseRequirements, getCourseEqfLevels, getCourseTypes } from '@/lib/api-client';

interface UseCatalogDataResult {
  blocks: CourseBlock[];
  targets: CourseTarget[];
  subjects: CourseSubject[];
  requirements: CourseRequirement[];
  eqfLevels: CourseEqfLevel[];
  types: CourseType[];
  loading: boolean;
}

export function useCatalogData(): UseCatalogDataResult {
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [requirements, setRequirements] = useState<CourseRequirement[]>([]);
  const [eqfLevels, setEqfLevels] = useState<CourseEqfLevel[]>([]);
  const [types, setTypes] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, t, s, r, e, ty] = await Promise.all([
          getCourseBlocks(),
          getCourseTargets(),
          getCourseSubjects(),
          getCourseRequirements(),
          getCourseEqfLevels(),
          getCourseTypes(),
        ]);
        setBlocks(b);
        setTargets(t);
        setSubjects(s);
        setRequirements(r);
        setEqfLevels(e);
        setTypes(ty);
      } catch (err) {
        console.error('Failed to load catalogs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { blocks, targets, subjects, requirements, eqfLevels, types, loading };
}
