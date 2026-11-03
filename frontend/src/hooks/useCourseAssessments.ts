'use client';

import { useEffect, useState } from 'react';
import type { PretestSettings } from '@/api';
import { getPretestContent, listCourseAssessments, type CourseAssessmentConfig } from '@/lib/api-client';
import { readApiErrorStatus } from '@/lib/api-error';

/**
 * Formáty připojené ke kurzu. Číst je smí jen vlastník kurzu a superadmin —
 * ostatním (garant) zůstane prázdný seznam. null = načítá se.
 */
export function useCourseAssessments(courseId: number | undefined): CourseAssessmentConfig[] | null {
  const [configs, setConfigs] = useState<CourseAssessmentConfig[] | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setConfigs(null);
    listCourseAssessments(courseId)
      .then((data) => { if (!cancelled) setConfigs(data); })
      .catch(() => { if (!cancelled) setConfigs([]); });
    return () => { cancelled = true; };
  }, [courseId]);

  return configs;
}

/** Testy kurzu pro náhled — připojené formáty a obsah pretestů. */
export interface AssessmentContents {
  configs: CourseAssessmentConfig[];
  /** Obsah pretestů podle moduleId; pretest, který nejde načíst, má null. */
  pretests: Record<number, PretestSettings | null>;
  /** Proč testy chybí: číst je smí jen vlastník kurzu a superadmin (garant ne), nebo chyba. */
  loadError: 'denied' | 'failed' | null;
}

/** Testy kurzu pro náhled. Bez courseId nic nenačítá; null = načítá se. */
export function useAssessmentContents(courseId: number | undefined): AssessmentContents | null {
  const [contents, setContents] = useState<AssessmentContents | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setContents(null);
    listCourseAssessments(courseId)
      .then(async (configs) => {
        const pretests = configs.filter((c) => c.assessmentTypeCode === 'pretest' && c.moduleId !== null);
        const loaded = await Promise.allSettled(pretests.map((c) => getPretestContent(c.courseAssessmentId)));
        if (cancelled) return;
        const byModule: Record<number, PretestSettings | null> = {};
        pretests.forEach((c, i) => {
          const result = loaded[i];
          byModule[c.moduleId!] = result.status === 'fulfilled' ? result.value : null;
        });
        setContents({ configs, pretests: byModule, loadError: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setContents({ configs: [], pretests: {}, loadError: readApiErrorStatus(err) === 403 ? 'denied' : 'failed' });
      });
    return () => { cancelled = true; };
  }, [courseId]);

  return contents;
}
