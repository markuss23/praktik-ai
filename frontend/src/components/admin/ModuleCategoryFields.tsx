'use client';

import type { BloomLevel, KrauuCompetence, NeuroPrinciple } from '@/api';
import { CatalogMultiSelect } from '@/components/ui';
import {
  catalogLabel,
  groupKrauuCompetences,
  type ModuleCategoryValues,
} from '@/lib/course-categories';

interface ModuleCategoryFieldsProps {
  values: ModuleCategoryValues;
  onChange: (next: ModuleCategoryValues) => void;
  neuroPrinciples: NeuroPrinciple[];
  krauuCompetences: KrauuCompetence[];
  bloomLevels: BloomLevel[];
  showErrors?: boolean;
  disabled?: boolean;
  labelClassName?: string;
  triggerClassName?: string;
  /** Počet sloupců na širších obrazovkách — v úzkých panelech stačí jeden. */
  columns?: 1 | 3;
}

/** Neurovědní principy, KRAUU kompetence a Bloomova taxonomie modulu. */
export function ModuleCategoryFields({
  values,
  onChange,
  neuroPrinciples,
  krauuCompetences,
  bloomLevels,
  showErrors = false,
  disabled,
  labelClassName = 'block text-sm font-medium text-foreground mb-2',
  triggerClassName,
  columns = 3,
}: ModuleCategoryFieldsProps) {
  const krauuGroups = groupKrauuCompetences(krauuCompetences).map(({ area, competences }) => ({
    label: area.name,
    options: competences.map((c) => ({ value: c.krauuId, label: catalogLabel(c) })),
  }));

  return (
    <div className={columns === 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : 'grid grid-cols-1 gap-4'}>
      <div>
        <label className={labelClassName}>Neurovědní principy *</label>
        <CatalogMultiSelect
          values={values.neuroPrincipleIds}
          onValueChange={(next) => onChange({ ...values, neuroPrincipleIds: next })}
          options={neuroPrinciples.map((p) => ({ value: p.principleId, label: catalogLabel(p) }))}
          placeholder="Vyberte principy..."
          aria-label="Neurovědní principy"
          invalid={showErrors && values.neuroPrincipleIds.length === 0}
          disabled={disabled}
          className={triggerClassName}
        />
      </div>
      <div>
        <label className={labelClassName}>KRAUU kompetence *</label>
        <CatalogMultiSelect
          values={values.krauuCompetenceIds}
          onValueChange={(next) => onChange({ ...values, krauuCompetenceIds: next })}
          groups={krauuGroups}
          placeholder="Vyberte kompetence..."
          aria-label="KRAUU kompetence modulu"
          invalid={showErrors && values.krauuCompetenceIds.length === 0}
          disabled={disabled}
          className={triggerClassName}
        />
      </div>
      <div>
        <label className={labelClassName}>Bloomova taxonomie *</label>
        <CatalogMultiSelect
          values={values.bloomLevelIds}
          onValueChange={(next) => onChange({ ...values, bloomLevelIds: next })}
          options={bloomLevels.map((b) => ({ value: b.bloomId, label: catalogLabel(b) }))}
          placeholder="Vyberte úrovně..."
          aria-label="Bloomova taxonomie modulu"
          invalid={showErrors && values.bloomLevelIds.length === 0}
          disabled={disabled}
          className={triggerClassName}
        />
      </div>
    </div>
  );
}
