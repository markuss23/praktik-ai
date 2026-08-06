"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

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

/** Select pro filtry veřejné databáze i Mojí sbírky — nad kitovým `Select`. */
export function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
  includeEmpty = true,
}: FilterSelectProps) {
  // Base UI Select potřebuje `items`; placeholder = položka s `value: null`.
  const items = [
    ...(includeEmpty ? [{ label: placeholder, value: null as string | null }] : []),
    ...options.map((option) => ({ label: option.label, value: option.value })),
  ];

  return (
    <Select
      items={items}
      value={value === "" ? null : value}
      onValueChange={(next) => onChange(next == null ? "" : String(next))}
      disabled={disabled}
    >
      <SelectTrigger aria-label={placeholder}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? "none"} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
