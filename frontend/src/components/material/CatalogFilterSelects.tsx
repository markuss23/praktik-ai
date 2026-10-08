"use client";

import { FilterSelect } from "@/components/ui";
import type { MaterialsFilter, ResourceCatalogFilters } from "./api";

/** Hodnoty selectů (ID z číselníku jako string, "" = nevybráno). */
export interface CatalogFilterValues {
  eqfLevelId: string;
  courseTypeId: string;
  blockId: string;
  levelId: string;
}

export const EMPTY_CATALOG_FILTER_VALUES: CatalogFilterValues = {
  eqfLevelId: "",
  courseTypeId: "",
  blockId: "",
  levelId: "",
};

const FIELDS: {
  key: keyof CatalogFilterValues;
  placeholder: string;
  options: keyof ResourceCatalogFilters;
}[] = [
  { key: "eqfLevelId", placeholder: "EQF úroveň", options: "eqfLevels" },
  { key: "courseTypeId", placeholder: "Typ", options: "courseTypes" },
  { key: "blockId", placeholder: "Tematický blok", options: "blocks" },
  { key: "levelId", placeholder: "Zkušenost s AI", options: "levels" },
];

/** Převede hodnoty selectů na část serverového filtru `MaterialsFilter`. */
export function catalogFilterParams(values: CatalogFilterValues): MaterialsFilter {
  const toId = (value: string) => (value ? Number(value) : undefined);
  return {
    eqfLevelId: toId(values.eqfLevelId),
    courseTypeId: toId(values.courseTypeId),
    blockId: toId(values.blockId),
    levelId: toId(values.levelId),
  };
}

interface CatalogFilterSelectsProps {
  catalogs: ResourceCatalogFilters;
  values: CatalogFilterValues;
  onChange: (next: CatalogFilterValues) => void;
}

/** Filtry materiálu podle číselníků (EQF úroveň, typ, tematický blok, zkušenost s AI) — filtruje backend. */
export function CatalogFilterSelects({ catalogs, values, onChange }: CatalogFilterSelectsProps) {
  return (
    <>
      {FIELDS.map((field) => (
        <FilterSelect
          key={field.key}
          value={values[field.key]}
          onChange={(value) => onChange({ ...values, [field.key]: value })}
          placeholder={field.placeholder}
          options={catalogs[field.options]}
        />
      ))}
    </>
  );
}
