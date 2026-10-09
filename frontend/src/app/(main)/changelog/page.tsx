import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { fetchChangelog } from "@/lib/changelog";
import { ChangelogMarkdown } from "@/components/changelog/ChangelogMarkdown";

export const metadata: Metadata = {
  title: "Novinky | PRAKTIK-AI",
  description: "Přehled novinek, úprav a oprav na platformě PRAKTIK-AI.",
};

export default async function ChangelogPage() {
  const markdown = await fetchChangelog();

  return (
    <div className="bg-card">
      {/* Hero hlavička stránky */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, var(--foreground) 100%)",
        }}
      >
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            background: "linear-gradient(135deg, var(--gradient-l) 0%, var(--gradient-r) 100%)",
            width: "300px",
            height: "300px",
            top: "-120px",
            right: "-60px",
            opacity: 0.5,
          }}
        />
        <div className="relative z-10 mx-auto px-4 sm:px-6 lg:px-[100px] py-12 sm:py-16" style={{ maxWidth: "1440px" }}>
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-foreground transition-colors mb-5"
          >
            <ArrowLeft className="size-4" />
            Zpět na úvod
          </Link>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-3 leading-tight">
            Novinky
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
            Přehled novinek, úprav a oprav na platformě PRAKTIK-AI.
          </p>
        </div>
      </section>

      {/* Obsah changelogu */}
      <div className="py-10 sm:py-14" style={{ backgroundColor: "var(--muted)" }}>
        <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: "1440px" }}>
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-10 max-w-3xl mx-auto">
            {markdown ? (
              <ChangelogMarkdown markdown={markdown} />
            ) : (
              <div className="flex flex-col items-center text-center py-10">
                <AlertTriangle className="size-12 text-warning mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Novinky se nepodařilo načíst
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Obsah changelogu momentálně není dostupný. Zkuste to prosím později.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
