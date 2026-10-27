'use client';

import { useState, useEffect } from 'react';
import type { Module } from '@/api';
import { getCourse, getModules, modulesApi } from '@/lib/api-client';
import { useAdminNavigation } from '@/hooks/useAdminNavigation';
import { useCatalogData } from '@/hooks/useCatalogData';
import { LoadingState, ErrorState } from '@/components/admin';
import { ModuleCategoryFields } from '@/components/admin/ModuleCategoryFields';
import { Button, Input, Textarea } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import {
  moduleCategoryValues, moduleToUpdate, validateModuleCategories, type ModuleCategoryValues,
} from '@/lib/course-categories';
import { readApiErrorDetail } from '@/lib/api-error';

const PEREX_MAX_LENGTH = 255;

interface ModuleEditViewProps {
  moduleId: number;
  courseId?: number;
}

// Formulář pro editaci modulu
export function ModuleEditView({ moduleId, courseId: propsCourseId }: ModuleEditViewProps) {
  const { goToCourses, goBack } = useAdminNavigation();
  const { neuroPrinciples, krauuCompetences, bloomLevels, loading: catalogsLoading } = useCatalogData();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [module, setModule] = useState<Module | null>(null);
  const [showCategoryErrors, setShowCategoryErrors] = useState(false);

  const [formData, setFormData] = useState<{ title: string; perex: string } & ModuleCategoryValues>({
    title: '',
    perex: '',
    neuroPrincipleIds: [],
    krauuCompetenceIds: [],
    bloomLevelIds: [],
  });

  useEffect(() => {
    // Výchozí princip (NP-01) se dohledává v číselníku — modul načteme až s ním.
    if (catalogsLoading) return;
    async function loadModule() {
      try {
        // Načtení modulů pro daný kurz
        if (propsCourseId) {
          const [modules, course] = await Promise.all([
            getModules({ courseId: propsCourseId }),
            getCourse(propsCourseId),
          ]);
          const mod = modules.find(m => m.moduleId === moduleId);

          if (!mod) {
            setError('Modul nebyl nalezen');
            return;
          }

          setModule(mod);
          setFormData({
            title: mod.title,
            perex: mod.perex ?? '',
            // Chybějící KRAUU / Bloom modul zdědí z kurzu — autor je vidí a může upravit.
            ...moduleCategoryValues(mod, course, neuroPrinciples),
          });
        } else {
          // Záložní stav - courseId by mělo být vždy k dispozici
          setError('Chybí ID kurzu');
        }
      } catch (err) {
        console.error('Failed to load module:', err);
        setError('Nepodařilo se načíst data modulu');
      } finally {
        setInitialLoading(false);
      }
    }
    loadModule();
  }, [moduleId, propsCourseId, catalogsLoading, neuroPrinciples]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;

    const categoryError = validateModuleCategories(formData);
    if (categoryError) {
      setShowCategoryErrors(true);
      setError(categoryError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await modulesApi.updateModule({
        moduleId: moduleId,
        moduleUpdate: moduleToUpdate(module, formData, {
          title: formData.title,
          perex: formData.perex.trim(),
        }),
      });

      goToCourses();
    } catch (err) {
      setError((await readApiErrorDetail(err)) ?? (err instanceof Error ? err.message : 'Nepodařilo se aktualizovat modul'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <LoadingState />;
  }

  if (error && !formData.title) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">Editovat modul</h1>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-card p-4 sm:p-6 rounded-lg shadow">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Název modulu *
            </label>
            <Input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={cn("h-auto", "w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tip/30 text-foreground text-sm sm:text-base")}
              placeholder="Název modulu"
            />
          </div>

          <div>
            <label htmlFor="perex" className="block text-sm font-medium text-foreground mb-2">
              Perex
            </label>
            <Textarea
              id="perex"
              rows={3}
              maxLength={PEREX_MAX_LENGTH}
              value={formData.perex}
              onChange={(e) => setFormData({ ...formData, perex: e.target.value })}
              className={cn("field-sizing-fixed min-h-0", "w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tip/30 text-foreground text-sm sm:text-base resize-none")}
              placeholder="Krátké shrnutí, o čem modul je..."
            />
            <span className="text-xs text-muted-foreground">{formData.perex.length}/{PEREX_MAX_LENGTH}</span>
          </div>

          <ModuleCategoryFields
            values={formData}
            onChange={(next) => setFormData({ ...formData, ...next })}
            neuroPrinciples={neuroPrinciples}
            krauuCompetences={krauuCompetences}
            bloomLevels={bloomLevels}
            showErrors={showCategoryErrors}
            columns={1}
            triggerClassName="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-tip/30 text-foreground text-sm bg-card data-[size=default]:h-auto"
          />

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <Button
              variant="tip"
              type="submit"
              disabled={loading}
              className={cn(BTN_KEEP_BOX, "px-4 sm:px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base")}
            >
              {loading ? 'Ukládání...' : 'Uložit změny'}
            </Button>
            <Button
              variant="plain"
              type="button"
              onClick={goBack}
              className={cn(BTN_KEEP_BOX, "px-4 sm:px-6 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 text-sm sm:text-base")}
            >
              Zpět
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModuleEditView;
