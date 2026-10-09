'use client';

import { useState, useEffect } from 'react';
import {
  CourseBlock, CourseTarget, CourseSubject, CourseRequirement, CourseEqfLevel, CourseType,
  NeuroPrinciple, KrauuCompetence, BloomLevel, CrossSubject,
} from '@/api';
import {
  getCourseBlocks, getCourseTargets, getCourseSubjects, getCourseRequirements, getCourseEqfLevels, getCourseTypes,
  getNeuroPrinciples, getKrauuCompetences, getBloomLevels, getCrossSubjects,
} from '@/lib/api-client';

export interface CatalogData {
  blocks: CourseBlock[];
  targets: CourseTarget[];
  subjects: CourseSubject[];
  requirements: CourseRequirement[];
  eqfLevels: CourseEqfLevel[];
  types: CourseType[];
  neuroPrinciples: NeuroPrinciple[];
  krauuCompetences: KrauuCompetence[];
  bloomLevels: BloomLevel[];
  crossSubjects: CrossSubject[];
}

interface UseCatalogDataResult extends CatalogData {
  loading: boolean;
  error: boolean;
}

const EMPTY: CatalogData = {
  blocks: [],
  targets: [],
  subjects: [],
  requirements: [],
  eqfLevels: [],
  types: [],
  neuroPrinciples: [],
  krauuCompetences: [],
  bloomLevels: [],
  crossSubjects: [],
};

// Číselníky se za běhu nemění a hook používá většina admin pohledů — jedno
// načtení na celou session místo deseti requestů při každé navigaci.
// Při chybě se promise zahodí, aby další mount zkusil načíst znovu.
let catalogsPromise: Promise<CatalogData> | null = null;

function loadCatalogs(): Promise<CatalogData> {
  if (!catalogsPromise) {
    catalogsPromise = Promise.all([
      getCourseBlocks(),
      getCourseTargets(),
      getCourseSubjects(),
      getCourseRequirements(),
      getCourseEqfLevels(),
      getCourseTypes(),
      getNeuroPrinciples(),
      getKrauuCompetences(),
      getBloomLevels(),
      getCrossSubjects(),
    ]).then(([blocks, targets, subjects, requirements, eqfLevels, types, neuroPrinciples, krauuCompetences, bloomLevels, crossSubjects]) => ({
      blocks, targets, subjects, requirements, eqfLevels, types, neuroPrinciples, krauuCompetences, bloomLevels, crossSubjects,
    }));
    catalogsPromise.catch(() => {
      catalogsPromise = null;
    });
  }
  return catalogsPromise;
}

export function useCatalogData(): UseCatalogDataResult {
  const [data, setData] = useState<CatalogData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCatalogs()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((err) => {
        console.error('Failed to load catalogs:', err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { ...data, loading, error };
}
