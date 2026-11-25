'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';
import type { CompetenceStatsItem, Course, KrauuCompetence, Module } from '@/api';
import { getCompetenceStats, getKrauuCompetences, getModules } from '@/lib/api-client';
import { groupKrauuCompetences } from '@/lib/course-categories';
import { computeKrauuCoverage, computeKrauuEngagement, krauuAreaIndex } from '@/lib/krauu-stats';
import { EmptyChart, type CourseStats } from '../components';
import { KrauuCoverageTile } from './KrauuCoverageTile';
import { KrauuEngagementTile } from './KrauuEngagementTile';
import { KrauuResultsTile, type KrauuResultsState } from './KrauuResultsTile';

// Sekce "Kompetence KRAUU" v admin statistikách; courseStats = už vyfiltrované kurzy dashboardu
export function KrauuStatsSection({
  courseStats, modulesPreloaded, showResults, resultsCourse, filtersActive,
}: {
  courseStats: CourseStats[];
  // Lektorský view moduly do courseStats načítá, superadmin view ne (lazy po kurzech)
  modulesPreloaded: boolean;
  // /competences/stats je jen pro superadmina, lektor vidí pokrytí a zapojení
  showResults: boolean;
  // Endpoint filtruje jen jeden kurz; null = celá platforma
  resultsCourse: Course | null;
  // Aktivní filtr dashboardu, který se na výsledky nedá použít
  filtersActive: boolean;
}) {
  const headingId = useId();
  const [catalog, setCatalog] = useState<KrauuCompetence[] | null>(null);
  const [baseError, setBaseError] = useState(false);
  const [fetchedModules, setFetchedModules] = useState<Module[] | null>(null);
  const [modulesError, setModulesError] = useState(false);
  const [results, setResults] = useState<CompetenceStatsItem[]>([]);
  const [resultsState, setResultsState] = useState<KrauuResultsState>('loading');

  useEffect(() => {
    let cancelled = false;
    getKrauuCompetences()
      .then((krauu) => { if (!cancelled) setCatalog(krauu); })
      .catch(() => { if (!cancelled) setBaseError(true); });
    return () => { cancelled = true; };
  }, []);

  // Superadmin: všechny aktivní moduly jedním voláním (obsahují i obsah bloků, payload není malý)
  useEffect(() => {
    if (modulesPreloaded) return;
    let cancelled = false;
    getModules()
      .then((modules) => { if (!cancelled) setFetchedModules(modules); })
      .catch(() => { if (!cancelled) setModulesError(true); });
    return () => { cancelled = true; };
  }, [modulesPreloaded]);

  const resultsCourseId = resultsCourse?.courseId;
  useEffect(() => {
    if (!showResults) return;
    let cancelled = false;
    setResultsState('loading');
    getCompetenceStats(resultsCourseId)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setResultsState('ready');
      })
      .catch(() => {
        if (!cancelled) setResultsState('error');
      });
    return () => { cancelled = true; };
  }, [showResults, resultsCourseId]);

  const areas = useMemo(() => (catalog ? groupKrauuCompetences(catalog) : []), [catalog]);
  const areaIndex = useMemo(() => (catalog ? krauuAreaIndex(catalog) : new Map<number, number>()), [catalog]);
  const modulesReady = modulesPreloaded || fetchedModules !== null || modulesError;
  const modulesByCourse = useMemo(() => {
    const map = new Map<number, Module[]>();
    if (modulesPreloaded) {
      for (const cs of courseStats) map.set(cs.course.courseId, cs.modules);
      return map;
    }
    for (const m of fetchedModules ?? []) {
      const list = map.get(m.courseId);
      if (list) list.push(m);
      else map.set(m.courseId, [m]);
    }
    return map;
  }, [modulesPreloaded, courseStats, fetchedModules]);
  const coverage = useMemo(
    () => computeKrauuCoverage(courseStats.map((cs) => cs.course), modulesByCourse),
    [courseStats, modulesByCourse],
  );
  const engagement = useMemo(
    () => computeKrauuEngagement(courseStats, modulesByCourse, areaIndex),
    [courseStats, modulesByCourse, areaIndex],
  );
  const competenceCount = areas.reduce((n, a) => n + a.competences.length, 0);

  return (
    <section aria-labelledby={headingId} className="mb-5">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-3"
      >
        <h2 id={headingId} className="text-base font-bold text-foreground flex items-center gap-2">
          <GraduationCap size={16} className="text-gradient-r" />
          Kompetence KRAUU
        </h2>
        {competenceCount > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">
            {areas.length} oblastí a {competenceCount} kompetencí
          </p>
        )}
      </motion.div>

      {baseError ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <EmptyChart message="Číselník KRAUU se nepodařilo načíst" />
        </div>
      ) : !catalog ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" aria-busy="true">
          {showResults && <div className="lg:col-span-12 h-72 bg-card rounded-2xl border border-border animate-pulse" />}
          <div className="lg:col-span-7 h-72 bg-card rounded-2xl border border-border animate-pulse" />
          <div className="lg:col-span-5 h-72 bg-card rounded-2xl border border-border animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {showResults && (
            <KrauuResultsTile
              areas={areas}
              items={results}
              state={resultsState}
              scopeLabel={resultsCourse ? `kurz ${resultsCourse.title}` : 'všechny kurzy'}
              filterNote={
                filtersActive
                  ? 'Z filtrů dashboardu se na výsledky uplatní jen výběr právě jednoho kurzu. Stav, publikace ani výběr více kurzů je nemění.'
                  : undefined
              }
              className="lg:col-span-12"
              delay={0.5}
            />
          )}
          {!modulesReady ? (
            <>
              <div className="lg:col-span-7 h-72 bg-card rounded-2xl border border-border animate-pulse" aria-busy="true" />
              <div className="lg:col-span-5 h-72 bg-card rounded-2xl border border-border animate-pulse" aria-busy="true" />
            </>
          ) : (
            <>
              {modulesError ? (
                <div className="lg:col-span-7 bg-card rounded-2xl border border-border shadow-sm">
                  <EmptyChart message="Moduly se nepodařilo načíst, pokrytí rámce nejde spočítat" />
                </div>
              ) : (
                <KrauuCoverageTile areas={areas} coverage={coverage} className="lg:col-span-7" delay={0.55} />
              )}
              <KrauuEngagementTile areas={areas} engagement={engagement} className="lg:col-span-5" delay={0.6} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
