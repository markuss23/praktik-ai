'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { ArrowRight, BookOpen, Database, GraduationCap, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui-kit/dialog';
import { buttonVariants } from '@/components/ui-kit/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'praktikai:onboarding:welcome';

/** Jen hotové části aplikace — Tutor a Odměny jsou zatím placeholdery. */
const STOPS = [
  {
    icon: BookOpen,
    title: 'Kurzy',
    text: 'Vyberte si kurz rovnou tady na úvodní stránce, nebo v přehledu všech kurzů.',
    href: ROUTES.COURSES,
    blob: 'bg-[#D1E7D9] text-[#0D2F31] rounded-[62%_38%_51%_49%/44%_58%_42%_56%]',
  },
  {
    icon: GraduationCap,
    title: 'Moje kurzy',
    text: 'Po přihlášení tu najdete rozpracované kurzy a svůj pokrok.',
    href: '/moje-kurzy',
    blob: 'bg-[#5AAC78] text-white rounded-[45%_55%_38%_62%/57%_43%_57%_43%]',
  },
  {
    icon: Database,
    title: 'Veřejná databáze',
    text: 'Materiály od ostatních a sbírky, do kterých si je můžete ukládat.',
    href: ROUTES.PUBLIC_DATABASE,
    blob: 'bg-[#857AD2] text-white rounded-[55%_45%_62%_38%/42%_56%_44%_58%]',
  },
];

/**
 * Úvodní krok onboardingu: rys podává kartu s popisem aplikace.
 *
 * Kompozice stojí na obrázku `public/lynx-presenting.png` (677 × 961, dole
 * uříznutý v pase), takže rys vždy vyrůstá od spodní hrany okna. Otevřená
 * dlaň je v obrázku na 18 % šířky a 61 % výšky:
 * - od lg stojí rys vpravo od karty a drží její pravý dolní roh — karta sedí
 *   0.39 × výška rysa (`--lynx-d`) nad spodní hranou a rys ji překrývá
 *   o 18 % své šířky (0.127 × výška), takže prsty leží přes roh karty.
 *   Výška rysa se odvíjí od výšky okna, aby se nad něj karta vždy vešla.
 * - pod lg je karta dole přes celou šířku a rys stojí za ní vpravo; horní
 *   hrana karty je v 64 % jeho výšky (`--lynx-m`), těsně pod dlaní.
 *
 * Zobrazí se jen při první návštěvě (příznak v localStorage); `?onboarding`
 * v URL ho vynutí znovu — pro náhled a testování. Skládá se z primitiv
 * ui-kit dialogu, aby šel nad sticky Header (`--z-header`): backdrop na
 * `--z-overlay`, okno na `--z-modal`.
 */
export function OnboardingOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).has('onboarding');
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === 'done';
    } catch {
      // Bez localStorage (privátní okno apod.) ho prostě ukážeme.
    }
    if (seen && !forced) return;
    // Krátká pauza, ať se stránka nejdřív vykreslí a overlay nepřepadne.
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      try {
        localStorage.setItem(STORAGE_KEY, 'done');
      } catch {
        // Nevadí — příště se zobrazí znovu.
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        {/* Tmavší než běžný dialog — za oknem stojí rys z hero a jinak by
            vedle rysa s kartou působil jako dvojník. */}
        <DialogOverlay className="z-[var(--z-overlay)] bg-[#0D2F31]/75" />
        {/* Popup se kliknutí nedotýká (průhledné okolí karty propustí klik
            na backdrop, který okno zavře) — klikatelná je jen karta. */}
        <DialogPrimitive.Popup
          className={cn(
            'pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-modal)] flex justify-center px-4 pb-4 outline-none lg:pb-0',
            '[--lynx-m:min(280px,32svh)] [--lynx-d:clamp(300px,calc((100svh_-_580px)_/_0.39),760px)]',
            'duration-300 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-8 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-8',
          )}
        >
          <div className="relative w-full max-w-[520px] lg:flex lg:w-auto lg:max-w-none lg:items-end">
            <div className="pointer-events-auto relative z-10 max-h-[calc(100svh_-_var(--lynx-m)_*_0.64_-_2rem)] w-full overflow-y-auto rounded-[28px] bg-white px-6 pt-7 pb-7 text-[#111111] shadow-[0_24px_60px_rgba(20,19,28,0.3)] sm:px-8 lg:mb-[calc(var(--lynx-d)_*_0.39)] lg:rounded-br-lg lg:max-h-[calc(100svh_-_var(--lynx-d)_*_0.39_-_1.5rem)] lg:w-[520px]">
              <DialogTitle className="max-w-[16ch] pr-8 text-[26px] leading-tight font-bold tracking-[-0.02em] text-pretty sm:text-[30px]">
                Ahoj! Provedu vás po Praktik-AI.
              </DialogTitle>
              <DialogDescription className="mt-3 text-base leading-[1.6] text-pretty text-[#555555]">
                Tady se budoucí učitelé učí pracovat s umělou inteligencí. Než
                začnete, ukážu vám, kde co najdete.
              </DialogDescription>

              <ul className="mt-5 space-y-0.5">
                {STOPS.map(({ icon: Icon, title, text, href, blob }) => (
                  <li key={title}>
                    <Link
                      href={href}
                      onClick={() => handleOpenChange(false)}
                      className="group -mx-3 flex items-start gap-4 rounded-2xl p-3 transition-colors hover:bg-[#F0F0F0] focus-visible:bg-[#F0F0F0]"
                    >
                      <span
                        aria-hidden
                        className={`flex size-11 shrink-0 items-center justify-center ${blob}`}
                      >
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[17px] font-bold tracking-[-0.01em]">
                          {title}
                          <ArrowRight
                            aria-hidden
                            className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                          />
                        </span>
                        {/* Na nízkých mobilech jen názvy, ať je tlačítko vidět bez scrollu. */}
                        <span className="mt-0.5 block text-sm leading-[1.55] text-[#666666] max-lg:[@media(max-height:740px)]:hidden">
                          {text}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Tlačítko vlevo — pravý dolní roh karty drží rys v dlani. */}
              <DialogClose
                className={cn(
                  buttonVariants({ size: 'xl' }),
                  'mt-6 h-12 px-5 hover:scale-105 active:scale-95',
                )}
              >
                Jdeme na to
                <ArrowRight aria-hidden className="size-5" />
              </DialogClose>

              <DialogClose
                aria-label="Zavřít"
                className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-[#555555] transition-colors hover:bg-[#F0F0F0] hover:text-[#111111]"
              >
                <XIcon aria-hidden className="size-5" />
              </DialogClose>
            </div>

            {/* Rys: na mobilu za kartou (karta má z-10), od lg nad ní, aby
                prsty ležely přes její roh. */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 -top-[calc(var(--lynx-m)_*_0.64)] aspect-[677/961] h-[var(--lynx-m)] lg:relative lg:top-auto lg:right-auto lg:z-20 lg:-ml-[calc(var(--lynx-d)_*_0.127)] lg:h-[var(--lynx-d)] lg:shrink-0"
            >
              <Image
                src="/lynx-presenting.png"
                alt=""
                fill
                sizes="(min-width: 1024px) 540px, 200px"
                className="object-contain object-bottom [filter:drop-shadow(0_20px_40px_rgba(13,47,49,0.35))]"
              />
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

export default OnboardingOverlay;
