'use client';

import type { BloomLevel, CrossSubject, KrauuCompetence } from '@/api';
import { CatalogMultiSelect } from '@/components/ui';
import {
  catalogLabel,
  groupKrauuCompetences,
  type CourseCategoryValues,
  type CrossSubjectsRule,
} from '@/lib/course-categories';

interface CourseCategoryFieldsProps {
  values: CourseCategoryValues;
  onChange: (next: CourseCategoryValues) => void;
  krauuCompetences: KrauuCompetence[];
  bloomLevels: BloomLevel[];
  crossSubjects: CrossSubject[];
  /** Odvozeno z vybraného bloku — řídí, jestli jsou průřezové obory povinné, nebo skryté. */
  crossRule: CrossSubjectsRule;
  /** Zvýraznit prázdná povinná pole (po neúspěšném odeslání / u starších kurzů). */
  showErrors?: boolean;
  disabled?: boolean;
  labelClassName?: string;
  triggerClassName?: string;
}

/** KRAUU kompetence, Bloomova taxonomie a průřezové obory kurzu. */
export function CourseCategoryFields({
  values,
  onChange,
  krauuCompetences,
  bloomLevels,
  crossSubjects,
  crossRule,
  showErrors = false,
  disabled,
  labelClassName = 'block text-sm font-semibold text-foreground mb-2',
  triggerClassName,
}: CourseCategoryFieldsProps) {
  const krauuGroups = groupKrauuCompetences(krauuCompetences).map(({ area, competences }) => ({
    label: area.name,
    options: competences.map((c) => ({ value: c.krauuId, label: catalogLabel(c) })),
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className={labelClassName}>KRAUU kompetence *</label>
        <CatalogMultiSelect
          values={values.krauuCompetenceIds}
          onValueChange={(next) => onChange({ ...values, krauuCompetenceIds: next })}
          groups={krauuGroups}
          placeholder="Vyberte kompetence..."
          aria-label="KRAUU kompetence"
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
          aria-label="Bloomova taxonomie"
          invalid={showErrors && values.bloomLevelIds.length === 0}
          disabled={disabled}
          className={triggerClassName}
        />
      </div>
      <div>
        <label className={labelClassName}>
          Průřezové obory{crossRule === 'required' ? ' *' : ''}
        </label>
        {crossRule === 'forbidden' ? (
          <p className="text-sm text-muted-foreground">Kurzy Bloku C průřezové obory nemají.</p>
        ) : (
          <CatalogMultiSelect
            values={values.crossSubjectIds}
            onValueChange={(next) => onChange({ ...values, crossSubjectIds: next })}
            options={crossSubjects.map((c) => ({ value: c.crossId, label: catalogLabel(c) }))}
            placeholder={crossRule === 'required' ? 'Vyberte obory...' : 'Neurčeno'}
            aria-label="Průřezové obory"
            invalid={showErrors && crossRule === 'required' && values.crossSubjectIds.length === 0}
            disabled={disabled}
            className={triggerClassName}
          />
        )}
      </div>
    </div>
  );
}
