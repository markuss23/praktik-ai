"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui-kit/select";

export interface CatalogOption {
  value: number;
  label: string;
}

interface CatalogSelectProps {
  value: number;
  onValueChange: (value: number) => void;
  options: CatalogOption[];
  /** Volitelná první položka (typicky „vše“ / „vyberte…“) s hodnotou 0. */
  emptyLabel?: string;
  /** Třídy pro trigger — kitový trigger si výšku drží přes `data-[size=...]`,
   *  takže jiná než výchozí výška se musí zapsat i jako `data-[size=default]:h-N`. */
  className?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

/**
 * Výběr položky číselníku (blok / cílová skupina / předmět) podle číselného id.
 *
 * Stejný select se dřív opisoval ve čtyřech admin pohledech; tohle je jedna
 * obálka nad kitovým `Select`.
 */
export function CatalogSelect({
  value,
  onValueChange,
  options,
  emptyLabel,
  className,
  id,
  disabled,
  "aria-label": ariaLabel,
}: CatalogSelectProps) {
  // Base UI Select potřebuje `items`, aby trigger uměl zobrazit popisek hodnoty.
  const items = emptyLabel
    ? [{ label: emptyLabel, value: 0 }, ...options]
    : options;

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(Number(next))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
