import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CourseExplorer, CourseExplorerFallback } from "@/components/courses";

export const metadata: Metadata = {
  title: "Kurzy",
  description: "Všechny kurzy platformy — filtrování podle kategorie, tématu, cílové skupiny, obtížnosti a délky.",
};

export default function KurzyPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-[100px]">
        <nav aria-label="Drobečková navigace" className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span aria-hidden className="mx-1.5">
            /
          </span>
          <span aria-current="page" className="text-foreground">
            Kurzy
          </span>
        </nav>

        {/* Filtry čte z URL (`useSearchParams`) — bez Suspense by Next stránku
            nevyrenderoval staticky. */}
        <Suspense fallback={<CourseExplorerFallback />}>
          <CourseExplorer />
        </Suspense>
      </div>
    </div>
  );
}
