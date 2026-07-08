"use client";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  options: FilterOption[];
  disabled?: boolean;
  /** Zobrazit prázdnou položku (placeholder) jako volbu „bez filtru". U řazení vypnout. */
  includeEmpty?: boolean;
}

/** Jednoduchý select pro filtry veřejné databáze i Mojí sbírky. */
export function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
  includeEmpty = true,
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
    >
      {includeEmpty && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
