"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Info, X } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui-kit/tooltip";
import type { CatalogOption } from "./CatalogSelect";
import { BTN_KEEP_BOX, cn, czechPlural } from "@/lib/utils";

const COLLAPSED_CHIP_COUNT = 4;

// Nápověda u ikony "i"
const MULTI_SELECT_HINT =
  "Jak zvolit více položek najednou: táhněte myší přes seznam se stisknutým tlačítkem Shift, nebo klikněte na první a se Shiftem na poslední položku rozsahu.";

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

  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const collapsible = selected.length > COLLAPSED_CHIP_COUNT;
  const visible = collapsible && !expanded ? selected.slice(0, COLLAPSED_CHIP_COUNT) : selected;
  const hiddenCount = selected.length - visible.length;

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const lastToggledRef = useRef<number | null>(null);
  const shiftRef = useRef(false);
  const dragRef = useRef<{
    anchor: number;
    intent: boolean;
    working: number[];
    applied: Set<number>;
  } | null>(null);

  const applyDragTo = (value: number) => {
    const drag = dragRef.current;
    if (!drag || drag.applied.has(value)) return;
    drag.applied.add(value);
    const has = drag.working.includes(value);
    if (drag.intent === has) return; // už je v cílovém stavu
    drag.working = drag.intent ? [...drag.working, value] : drag.working.filter((v) => v !== value);
    lastToggledRef.current = value;
    onValueChange(drag.working);
  };

  useEffect(() => {
    // Uvolnění tlačítka kdekoli tažení ukončí. Až po tiku: click na položce
    // přichází hned po mouseup a ještě potřebuje vědět, že šlo o tažení.
    const end = () => {
      window.setTimeout(() => {
        dragRef.current = null;
      }, 0);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  const handleValueChange = (nextRaw: unknown) => {
    let next = (nextRaw as number[] | null) ?? [];
    const prev = valuesRef.current;
    const added = next.find((v) => !prev.includes(v));
    const removed = prev.find((v) => !next.includes(v));
    const changed = added ?? removed;
    if (changed !== undefined && shiftRef.current && lastToggledRef.current !== null) {
      const order = flat.map((o) => o.value);
      const a = order.indexOf(lastToggledRef.current);
      const b = order.indexOf(changed);
      if (a >= 0 && b >= 0) {
        const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
        next = added !== undefined
          ? [...next, ...range.filter((v) => !next.includes(v))]
          : next.filter((v) => !range.includes(v));
      }
    }
    shiftRef.current = false;
    if (changed !== undefined) lastToggledRef.current = changed;
    onValueChange(next);
  };

  const renderItem = (option: CatalogOption) => (
    <SelectItem
      key={option.value}
      value={option.value}
      onPointerDown={(e) => {
        shiftRef.current = e.shiftKey;
        if (disabled || e.pointerType !== "mouse" || e.button !== 0) return;
        dragRef.current = {
          anchor: option.value,
          intent: !valuesRef.current.includes(option.value),
          working: [...valuesRef.current],
          applied: new Set(),
        };
      }}
      onPointerEnter={(e) => {
        const drag = dragRef.current;
        if (!drag || e.pointerType !== "mouse" || e.buttons !== 1 || option.value === drag.anchor) return;
        // Teprve první přejetí jiné položky dělá z kliku tažení — i kotva se přepne tady
        if (!drag.applied.has(drag.anchor)) applyDragTo(drag.anchor);
        applyDragTo(option.value);
      }}
      onMouseUp={(e) => {
        if (dragRef.current?.applied.size) e.preventBaseUIHandler();
      }}
      onClick={(e) => {
        if (dragRef.current?.applied.size) e.preventBaseUIHandler();
      }}
      onKeyDown={(e) => {
        shiftRef.current = e.shiftKey;
      }}
    >
      <span className="whitespace-normal">{option.label}</span>
    </SelectItem>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
      <Select
        multiple
        items={flat}
        value={values}
        onValueChange={handleValueChange}
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
        <SelectContent
          onPointerMove={(e) => {
            // Při tažení u okraje seznam posouvej, ať jde vybrat i mimo viditelnou část
            if (!dragRef.current || e.buttons !== 1) return;
            const popup = e.currentTarget;
            const rect = popup.getBoundingClientRect();
            const EDGE = 28;
            if (e.clientY > rect.bottom - EDGE) popup.scrollTop += 8;
            else if (e.clientY < rect.top + EDGE) popup.scrollTop -= 8;
          }}
        >
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
      <Tooltip>
        <TooltipTrigger
          delay={150}
          render={
            <Button
              variant="plain"
              type="button"
              aria-label="Nápověda k výběru více položek"
              className={cn(BTN_KEEP_BOX, "shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground")}
            />
          }
        >
          <Info className="size-4" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 text-left">{MULTI_SELECT_HINT}</TooltipContent>
      </Tooltip>
      </div>

      {selected.length > 0 && (
        <div className="space-y-1.5">
        <ul id={listId} className="flex flex-wrap gap-1.5">
          {visible.map((option) => (
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
        {collapsible && (
          <Button
            variant="plain"
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls={listId}
            className={cn(BTN_KEEP_BOX, "inline-flex items-center gap-1 text-xs font-medium text-tip hover:underline underline-offset-2")}
          >
            <ChevronDown className={cn("size-3 transition-transform", expanded && "rotate-180")} />
            {expanded
              ? "Skrýt seznam"
              : `+ ${hiddenCount} ${czechPlural(hiddenCount, "další", "další", "dalších")}`}
          </Button>
        )}
        </div>
      )}
    </div>
  );
}
