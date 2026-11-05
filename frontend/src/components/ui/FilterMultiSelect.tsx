"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui-kit/select";
import type { FilterOption } from "./FilterSelect";

interface FilterMultiSelectProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  options: FilterOption[];
  disabled?: boolean;
  /** Třídy pro trigger — viz poznámka u `FilterSelect`. */
  className?: string;
}

/**
 * Filtr s výběrem více hodnot — obálka nad kitovým `Select` v režimu `multiple`.
 * Prázdný výběr = bez filtru, proto tu není položka „vše" jako ve `FilterSelect`.
 */
export function FilterMultiSelect({
  values,
  onChange,
  placeholder,
  options,
  disabled = false,
  className,
}: FilterMultiSelectProps) {
  const items = options.map((option) => ({ label: option.label, value: option.value }));

  // Trigger: placeholder → popisek jediné volby → „placeholder (N)".
  const renderValue = (selected: string[] | null) => {
    if (!selected || selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return options.find((option) => option.value === selected[0])?.label ?? placeholder;
    }
    return `${placeholder} (${selected.length})`;
  };

  return (
    <Select
      multiple
      items={items}
      value={values}
      onValueChange={(next) => onChange(next ?? [])}
      disabled={disabled}
    >
      <SelectTrigger aria-label={placeholder} className={className}>
        <SelectValue>{(selected) => renderValue(selected as string[] | null)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
