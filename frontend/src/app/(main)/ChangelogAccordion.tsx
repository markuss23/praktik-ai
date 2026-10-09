import { Megaphone, AlertTriangle } from "lucide-react";
import { ChangelogMarkdown } from "@/components/changelog/ChangelogMarkdown";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui";
// Rozbalovací sekce s novinkami na úvodní stránce. Markdown se stahuje
// serverově a předává jako prop. Rozbalení/sbalení řeší kitový Accordion
// (Base UI), takže komponenta sama nepotřebuje "use client" a markdown se
// renderuje na serveru — react-markdown se do klientského bundlu nedostane.
export default function ChangelogAccordion({ markdown }: { markdown: string | null }) {
  return (
    <div style={{ backgroundColor: "var(--muted)" }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: "1440px", width: "100%" }}>
        <div className="changelog-glow shadow-sm">
          <Accordion className="bg-card overflow-hidden">
            <AccordionItem>
              {/* Hlavička / přepínač. min-w-0: trigger je flex položka v <h3> a bez
                  toho by ho nezalomitelný podnadpis roztáhl přes okraj karty. */}
              <AccordionTrigger className="min-w-0 items-center gap-4 px-5 py-4 hover:bg-muted/50 hover:no-underline **:data-[slot=accordion-trigger-icon]:size-5">
                <span
                  className="shrink-0 inline-flex items-center justify-center size-11 rounded-full text-primary-foreground shadow"
                  style={{ background: "linear-gradient(135deg, var(--gradient-r) 0%, var(--gradient-l) 100%)" }}
                >
                  <Megaphone className="size-5" strokeWidth={1.75} />
                </span>
                <span className="block min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 mb-1">
                    <span className="changelog-title text-base sm:text-lg font-extrabold tracking-tight">
                      Novinky na platformě
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground truncate">
                    Podívejte se, co je nového, co jsme upravili a opravili.
                  </span>
                </span>
              </AccordionTrigger>

              {/* Rozbalovací obsah. Panel kitu nese text-sm, markdown chce základní velikost. */}
              <AccordionContent className="pb-0">
                <div className="border-t border-border px-5 sm:px-8 py-6 text-base">
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
