"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui-kit/toggle-group"

/**
 * Sjednocený přepínač postavený na shadcn ToggleGroup (Base UI). Zvládne dvě
 * i více možností, vždy je právě jedna vybraná.
 *
 * - `solid` — plná fialová výplň, pro filtry (7 dní / 30 dní / 90 dní / Vše)
 * - `soft`  — tint výplně, pro přepínání sekcí (Kurzy / Materiály)
 *
 * Oproti ToggleGroup pracuje se skalární hodnotou místo pole a nikdy se
 * nevyprázdní — klik na už vybranou položku nic nemění.
 */
type SegmentedControlProps<T extends string> = Omit<
  React.ComponentProps<typeof ToggleGroup>,
  "value" | "defaultValue" | "onValueChange" | "variant" | "multiple"
> & {
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
  variant?: "solid" | "soft"
}

function SegmentedControl<T extends string>({
  className,
  variant = "solid",
  value,
  defaultValue,
  onValueChange,
  ...props
}: SegmentedControlProps<T>) {
  // Řídíme hodnotu vždy sami (i v nekontrolovaném režimu) — jen tak se dá
  // odchytit odznačení aktivní položky, které by přepínač nechalo prázdný.
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const current = value === undefined ? uncontrolled : value

  return (
    <ToggleGroup
      data-slot="segmented-control"
      variant={variant === "soft" ? "segmented-soft" : "segmented"}
      spacing={1}
      value={current === undefined ? [] : [current]}
      onValueChange={(next) => {
        // Base UI umí vybranou položku odznačit; segmentovaný přepínač ale
        // musí mít pořád jednu aktivní, takže prázdný výběr ignorujeme.
        const [first] = next as T[]
        if (first === undefined) {
          return
        }
        if (value === undefined) {
          setUncontrolled(first)
        }
        onValueChange?.(first)
      }}
      className={cn(
        "rounded-lg border border-border bg-card p-1 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupItem>) {
  return (
    <ToggleGroupItem
      data-slot="segmented-control-item"
      className={className}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
