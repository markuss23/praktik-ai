"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TicketTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  counts: Record<T, number>;
  onChange: (tab: T) => void;
}

// Podtržené taby s počty podle mockupu, kitový `Tabs` ve variantě `line`.
export function TicketTabs<T extends string>({ tabs, active, counts, onChange }: TicketTabsProps<T>) {
  return (
    <Tabs value={active} onValueChange={(value) => onChange(value as T)}>
      <TabsList variant="line" className="border-b border-border">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="font-semibold">
            {tab.label}
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                tab.id === active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[tab.id]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
