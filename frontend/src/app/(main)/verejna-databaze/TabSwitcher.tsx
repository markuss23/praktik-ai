import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export type DatabaseTab = "public" | "collections" | "mine";

const TAB_DEFINITIONS: { id: DatabaseTab; label: string; href: string }[] = [
  { id: "public", label: "Veřejná databáze", href: ROUTES.PUBLIC_DATABASE },
  { id: "collections", label: "Veřejné sbírky", href: `${ROUTES.PUBLIC_DATABASE}?tab=collections` },
  { id: "mine", label: "Moje sbírka", href: `${ROUTES.PUBLIC_DATABASE}?tab=mine` },
];

export function TabSwitcher({ active }: { active: DatabaseTab }) {
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card p-1 shadow-sm">
      {TAB_DEFINITIONS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? "bg-gradient-r/20 text-gradient-r"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
