"use client";

import { Badge, type BadgeVariant } from "@/components/ui-kit/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui-kit/select";

/**
 * Status picker built from Select + Badge, matching the Figma "State picker"
 * (2092:4936): 10px bold label, one badge per row, check mark on the selection.
 */

const STATUSES: { value: BadgeVariant; label: string }[] = [
  { value: "new", label: "Nové" },
  { value: "open", label: "Otevřené" },
  { value: "waiting", label: "Čeká na uživatele" },
  { value: "resolved", label: "Vyřešené" },
  { value: "closed", label: "Zavřené" },
];

function StatusSelect({
  value,
  onValueChange,
  label = "Změnit stav",
}: {
  value: BadgeVariant;
  onValueChange: (value: BadgeVariant) => void;
  label?: string;
}) {
  const selected = STATUSES.find((status) => status.value === value);

  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as BadgeVariant)}
    >
      {/* The design only shows the open panel, so the closed trigger simply
          echoes the current badge. */}
      <SelectTrigger className="border-foreground/20 py-1.5">
        {selected && <Badge variant={selected.value}>{selected.label}</Badge>}
      </SelectTrigger>

      {/* px-3 py-2 + 16px row gap come straight from the Figma frame. */}
      <SelectContent className="w-auto min-w-(--anchor-width)" align="start">
        <SelectGroup className="flex flex-col gap-4 p-0 px-3 py-2">
          <SelectLabel className="p-0 text-[10px] font-bold text-foreground">
            {label}
          </SelectLabel>
          {STATUSES.map((status) => (
            <SelectItem
              key={status.value}
              value={status.value}
              className="gap-3 p-0 pr-8 focus:bg-transparent"
            >
              <Badge variant={status.value}>{status.label}</Badge>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export { StatusSelect, STATUSES };
