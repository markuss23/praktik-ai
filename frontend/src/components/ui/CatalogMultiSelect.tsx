"use client";

import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui-kit/select";
import { Button } from "../ui-kit/button";
import type { CatalogOption } from "./CatalogSelect";
import { BTN_KEEP_BOX, cn } from "@/lib/utils";

export interface CatalogOptionGroup {
  label: string;
  options: CatalogOption[];
}

interface CatalogMultiSelectProps {
  values: number[];
  onValueChange: (next: number[]) => void;
  /** Buď plochý seznam, nebo skupiny (např. oblasti KRAUU) — ne obojí. */
  options?: CatalogOption[];
  groups?: CatalogOptionGroup[];
  placeholder: string;
  /** Třídy pro trigger — viz poznámka u `CatalogSelect`. */
  className?: string;
  id?: string;
  "aria-label"?: string;
  disabled?: boolean;
  invalid?: boolean;
}

/**
 * Výběr více položek číselníku podle číselného id (KRAUU, Bloom, průřezové
 * obory, neurovědní principy). Vybrané položky se vypisují pod triggerem jako
 * odebíratelné štítky — popisky jsou dlouhé a do triggeru se nevejdou.
 */
export function CatalogMultiSelect({
  values,
  onValueChange,
  options,
  groups,
  placeholder,
  className,
  id,
  disabled,
  invalid,
  "aria-label": ariaLabel,
}: CatalogMultiSelectProps) {
  const flat = groups ? groups.flatMap((group) => group.options) : options ?? [];
  const selected = values
    .map((value) => flat.find((option) => option.value === value))
    .filter((option): option is CatalogOption => option !== undefined);

  const renderItem = (option: CatalogOption) => (
    <SelectItem key={option.value} value={option.value}>
      <span className="whitespace-normal">{option.label}</span>
    </SelectItem>
  );

  return (
    <div className="space-y-2">
      <Select
        multiple
        items={flat}
        value={values}
        onValueChange={(next) => onValueChange((next as number[] | null) ?? [])}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel ?? placeholder}
          aria-invalid={invalid || undefined}
          className={className}
        >
          <SelectValue>
            {() => (values.length === 0 ? placeholder : `Vybráno: ${values.length}`)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups
            ? groups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map(renderItem)}
                </SelectGroup>
              ))
            : flat.map(renderItem)}
        </SelectContent>
      </Select>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <li
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/50 py-0.5 pl-2 pr-1 text-xs text-foreground"
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {!disabled && (
                <Button
                  variant="plain"
                  type="button"
                  onClick={() => onValueChange(values.filter((value) => value !== option.value))}
                  aria-label={`Odebrat: ${option.label}`}
                  className={cn(BTN_KEEP_BOX, "shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground")}
                >
                  <X className="size-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
