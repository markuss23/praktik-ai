'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { LynxMascotUnplugged } from '@/components/layout/LynxMascotUnplugged';
import { buttonVariants } from '@/components/ui-kit/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const container = 'mx-auto w-[min(1240px,94vw)]';

/** Stejná škála jako <h1> v Hero a nadpisy v „O projektu" (home-design-system.md, kap. 3.2). */
const heroTitle =
  'text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl';

/**
 * Chyba serveru / pád stránky — rys drží vytažený kabel.
 *
 * Záměrně bez Headeru a Footeru: Header mluví s backendem (přihlášení, role)
 * a když je chyba právě tam, spadl by i on. Navigaci tu drží logo a tlačítka.
 * `reset()` zkusí segment vykreslit znovu bez reloadu stránky.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F0F0F0] text-[#111111]">
      <div className={`flex items-center py-5 ${container}`}>
        <Link href={ROUTES.HOME} className="flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={40} height={41} />
          <span className="text-lg font-bold">PRAKTIK-AI</span>
        </Link>
      </div>

      <main className="flex flex-1 items-center overflow-x-clip">
        <section
          className={`grid items-center gap-12 pt-6 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-16 ${container}`}
        >
          <div className="hero-enter relative z-1">
            <h1 className={`max-w-[15ch] text-pretty ${heroTitle}`}>
              Ups, rysovi vypadl kabel
            </h1>

            <p className="mt-7 max-w-[520px] text-[19px] leading-[1.62] text-pretty text-[#555555]">
              Na naší straně se něco pokazilo a stránku se nepodařilo načíst.
              Zkuste to prosím znovu. Pokud problém trvá, napište nám na{' '}
              <a
                href="mailto:praktikai@ujep.cz"
                className="font-semibold text-[#111111] underline decoration-[#857AD2]/50 underline-offset-4 hover:decoration-[#857AD2]"
              >
                praktikai@ujep.cz
              </a>
              .
            </p>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={reset}
                className={cn(
                  buttonVariants({ size: 'xl' }),
                  'h-12 px-5 hover:scale-105 active:scale-95',
                )}
              >
                <RotateCw aria-hidden className="size-5" />
                Zkusit znovu
              </button>
              <Link
                href={ROUTES.HOME}
                className={cn(
                  buttonVariants({ size: 'xl', variant: 'outline' }),
                  'h-12 bg-white px-5 hover:scale-105 active:scale-95',
                )}
              >
                <ArrowLeft aria-hidden className="size-5" />
                Zpět na úvod
              </Link>
            </div>

            {error.digest && (
              <p className="mt-8 text-xs tracking-[0.14em] text-[#777777] uppercase">
                Kód chyby: <span className="font-mono normal-case">{error.digest}</span>
              </p>
            )}
          </div>

          {/* Rys s vytaženým kabelem na mátovém blobu. */}
          <div className="hero-enter relative mx-auto w-[240px] [animation-delay:150ms] sm:w-[290px] lg:w-[380px]">
            <div
              aria-hidden
              className="blob-float-slow absolute top-[22%] -right-[8%] bottom-[2%] -left-[8%] rounded-[58%_42%_47%_53%/43%_55%_45%_57%] bg-[#D1E7D9]"
            />
            <div
              aria-hidden
              className="absolute top-[34%] -right-[18%] hidden size-[150px] rounded-full border-[1.5px] border-[#298E86] opacity-[0.32] lg:block"
            />

            <LynxMascotUnplugged className="relative h-auto w-full" />

            {/* Bublina = motiv citace z „O projektu", roh míří k rysovi. */}
            <p
              aria-hidden
              className="hero-pop absolute top-[16%] -left-[24%] hidden origin-bottom-right -rotate-3 rounded-[26px] rounded-br-md bg-[#EDEAFA] px-5 py-3.5 text-base leading-[1.35] font-bold tracking-[-0.015em] text-[#23203A] shadow-[0_24px_60px_rgba(20,19,28,0.16)] lg:block"
            >
              Ups… to jsem
              <br />
              nechtěl.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
