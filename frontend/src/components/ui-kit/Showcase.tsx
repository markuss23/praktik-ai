"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui-kit/button";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the UI kit page. Keep new component demos wrapped in
 * <Section> / <Row> so everything stays visually consistent as the kit grows.
 */

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border border-t py-10 first:border-t-0 first:pt-0">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      )}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
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
