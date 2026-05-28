import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export type DatabaseTab = "public" | "mine";

const TAB_DEFINITIONS: { id: DatabaseTab; label: string; href: string }[] = [
  { id: "public", label: "Veřejná databáze", href: ROUTES.PUBLIC_DATABASE },
  { id: "mine", label: "Moje sbírka", href: `${ROUTES.PUBLIC_DATABASE}?tab=mine` },
];

export function TabSwitcher({ active }: { active: DatabaseTab }) {
  return (
    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-1 shadow-sm">
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
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
