"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui-kit/accordion";
import { Button } from "@/components/ui-kit/button";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the UI kit page. Keep new component demos wrapped in
 * <Section> / <Row> so everything stays visually consistent as the kit grows.
 *
 * <Section> je položka accordionu — musí být uvnitř <Accordion> a její `value`
 * patří i do seznamu sekcí, ze kterého se skládá obsah v levém sloupci.
 */

export function Section({
  value,
  title,
  description,
  children,
}: {
  value: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt drží nadpis pod přilepenou lištou, když se sem skočí z obsahu.
    <AccordionItem value={value} id={value} className="scroll-mt-32">
      <AccordionTrigger className="items-center gap-4 py-5 hover:no-underline">
        <span className="flex flex-col gap-1">
          <span className="text-foreground text-lg font-semibold">{title}</span>
          {description && (
            <span className="text-muted-foreground text-sm font-normal">
              {description}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col gap-6 pt-1 pb-8">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function Row({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:items-center">
      <span className="text-muted-foreground font-mono text-xs">{label}</span>
      <div className={cn("flex flex-wrap items-center gap-3", className)}>
        {children}
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {dark ? <Sun /> : <Moon />}
      {dark ? "Světlý režim" : "Tmavý režim"}
    </Button>
  );
}
