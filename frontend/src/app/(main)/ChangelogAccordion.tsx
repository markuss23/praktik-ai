"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, ChevronDown, AlertTriangle } from "lucide-react";
import { ChangelogMarkdown } from "@/components/changelog/ChangelogMarkdown";

// Rozbalovací sekce s novinkami na úvodní stránce. Markdown se stahuje
// serverově a předává jako prop, accordion řeší jen rozbalení/sbalení.
export default function ChangelogAccordion({ markdown }: { markdown: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--muted)" }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: "1440px", width: "100%" }}>
        <div className="changelog-glow shadow-sm">
        <div className="bg-card overflow-hidden">
          {/* Hlavička / přepínač */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/50"
          >
            <span
              className="shrink-0 inline-flex items-center justify-center size-11 rounded-full text-primary-foreground shadow"
              style={{ background: "linear-gradient(135deg, var(--gradient-r) 0%, var(--gradient-l) 100%)" }}
            >
              <Megaphone className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 mb-1">
                <span className="changelog-title text-base sm:text-lg font-extrabold tracking-tight">
                  Novinky na platformě
                </span>
              </span>
              <p className="text-sm text-muted-foreground truncate">
                Podívejte se, co je nového, co jsme upravili a opravili.
              </p>
            </div>
            <ChevronDown
              className={`shrink-0 size-5 text-muted-foreground transition-transform duration-300 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Rozbalovací obsah */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t border-border px-5 sm:px-8 py-6">
                  {markdown ? (
                    <ChangelogMarkdown markdown={markdown} />
                  ) : (
                    <div className="flex flex-col items-center text-center py-6">
                      <AlertTriangle className="size-10 text-warning mb-3" />
                      <p className="font-semibold text-foreground mb-1">
                        Novinky se nepodařilo načíst
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Obsah momentálně není dostupný. Zkuste to prosím později.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>
    </div>
  );
}
