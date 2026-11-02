'use client';

import { useEffect, useState } from 'react';
import type { PretestSettings } from '@/api';
import { getPretestContent, listCourseAssessments, type CourseAssessmentConfig } from '@/lib/api-client';

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

/**
 * Obsah pretestů podle moduleId (pro náhled). Modul bez pretestu nebo s
 * pretestem, který nejde načíst, má null. Bez courseId nic nenačítá.
 */
export function usePretestContents(courseId: number | undefined): Record<number, PretestSettings | null> | null {
  const [contents, setContents] = useState<Record<number, PretestSettings | null> | null>(null);

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
        setContents(byModule);
      })
      .catch(() => { if (!cancelled) setContents({}); });
    return () => { cancelled = true; };
  }, [courseId]);

  return contents;
}
