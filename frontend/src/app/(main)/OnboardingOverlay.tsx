'use client';

import { useEffect, useState } from 'react';
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
import { LynxMascot } from '@/components/layout/LynxMascot';
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
 * Úvodní krok onboardingu: rys mává a ukáže, kde co v aplikaci najít.
 *
 * Zobrazí se jen při první návštěvě (příznak v localStorage); `?onboarding`
 * v URL ho vynutí znovu — pro náhled a testování. Skládá se z primitiv
 * ui-kit dialogu, aby šel nad sticky Header (z-1000): backdrop na
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
        <DialogOverlay className="z-[var(--z-overlay)] bg-[#0D2F31]/55" />
        <DialogPrimitive.Popup
          className="fixed top-1/2 left-1/2 z-[var(--z-modal)] w-[calc(100%-2rem)] max-w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white text-[#111111] shadow-[0_24px_60px_rgba(20,19,28,0.22)] outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <div className="grid md:grid-cols-[0.82fr_1.18fr]">
            {/* Rys stojí na mátovém panelu a hlavou kouká nad horní hranu okna. */}
            <div aria-hidden className="relative hidden overflow-hidden rounded-l-[28px] bg-[#D1E7D9] md:block">
              <div className="absolute top-[30%] -left-[18%] size-[220px] rounded-full border-[1.5px] border-[#298E86] opacity-[0.25]" />
              <LynxMascot className="absolute bottom-4 left-1/2 h-auto w-full -translate-x-[54%]" />
            </div>

            <div className="relative px-6 pt-6 pb-7 sm:px-9 sm:pt-9 sm:pb-9">
              {/* Na mobilu jen hlava, která vykoukne nad okno. */}
              <LynxMascot
                viewBox="55 0 250 265"
                overflow="hidden"
                className="-mt-20 mb-2 h-auto w-24 md:hidden"
              />

              <DialogTitle className="max-w-[16ch] text-[28px] leading-tight font-bold tracking-[-0.02em] text-pretty sm:text-[32px]">
                Ahoj! Provedu vás po Praktik-AI.
              </DialogTitle>
              <DialogDescription className="mt-3 text-base leading-[1.62] text-pretty text-[#555555]">
                Tady se budoucí učitelé učí pracovat s umělou inteligencí. Než
                začnete, ukážu vám, kde co najdete.
              </DialogDescription>

              <ul className="mt-6 space-y-1">
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
                        <span className="mt-0.5 block text-sm leading-[1.55] text-[#666666]">
                          {text}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <DialogClose
                className={cn(
                  buttonVariants({ size: 'xl' }),
                  'mt-7 h-12 px-5 hover:scale-105 active:scale-95',
                )}
              >
                Jdeme na to
                <ArrowRight aria-hidden className="size-5" />
              </DialogClose>
            </div>
          </div>

          <DialogClose
            aria-label="Zavřít"
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-[#555555] transition-colors hover:bg-[#F0F0F0] hover:text-[#111111]"
          >
            <XIcon aria-hidden className="size-5" />
          </DialogClose>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

export default OnboardingOverlay;
