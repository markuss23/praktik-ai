import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { buttonVariants } from '@/components/ui-kit/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { LynxMascot } from './LynxMascot';

const container = 'mx-auto w-[min(1240px,94vw)]';

/** Musí zůstat 1:1 s `heroTitle` v ProjectAboutSection — landing má jeden
 *  rukopis nadpisů (viz home-design-system.md, kap. 3.2). */
const heroTitle =
  'text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl';

/**
 * Hero úvodní stránky: tmavá karta (#0D2F31, stejná plocha jako „Cíle
 * projektu") s maskotem rysa, kterému uši koukají nad horní hranu.
 *
 * Nájezd jede přes CSS (`.hero-enter`, `.hero-pop` v globals.css), ne přes
 * motion — hero je nad ohybem a nesmí být neviditelný, dokud se nenačte JS.
 */
export function Hero() {
  return (
    <section className="relative bg-[#F0F0F0] pt-8 pb-8 sm:pt-12 lg:pt-14 lg:pb-12 xl:pt-[100px]">
      <div className={`relative ${container}`}>
        {/* Tmavá plocha je samostatná vrstva: ořízne blobs, ale maskota ne. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] bg-[#0D2F31]"
        >
          <div className="blob-float-slow absolute -top-[140px] -left-[160px] hidden size-[420px] rounded-[62%_38%_43%_57%/51%_47%_53%_49%] bg-[#5AAC78]/15 lg:block" />
          <div className="absolute -bottom-[170px] left-[30%] hidden size-[300px] rounded-full border-[1.5px] border-[#D1E7D9]/25 lg:block" />
        </div>

        <div className="relative grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="hero-enter px-6 pt-12 pb-6 sm:px-10 sm:pt-14 lg:py-[88px] lg:pr-0 lg:pl-[72px]">
            <p className="flex items-center gap-3 text-xs font-bold tracking-[0.14em] text-[#D1E7D9] uppercase">
              <span aria-hidden className="h-1 w-8 rounded-sm bg-[#5AAC78]" />
              Výuka s umělou inteligencí
            </p>

            <h1 className={`mt-6 max-w-[15ch] text-pretty text-white ${heroTitle}`}>
              Připravujeme budoucí učitele pro{' '}
              <span className="relative whitespace-nowrap">
                digitální éru
                <svg
                  aria-hidden
                  viewBox="0 0 300 18"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-[0.22em] w-full lg:-bottom-2"
                >
                  <path
                    d="M3 13 C70 4 170 2 297 9"
                    stroke="#F87B1B"
                    strokeWidth="5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-7 max-w-[500px] text-[17px] leading-[1.68] text-pretty text-white/65">
              Praktik-AI propojuje pedagogickou praxi s generativní umělou
              inteligencí. Kurzy, AI tutor i veřejná databáze materiálů na jednom
              místě — pro studenty učitelství i jejich vyučující.
            </p>

            <div className="mt-9 flex flex-col items-start gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
              <Link
                href={ROUTES.COURSES}
                className={cn(
                  buttonVariants({ size: 'xl' }),
                  'h-12 px-5 hover:scale-105 active:scale-95',
                )}
              >
                Prozkoumat kurzy
                <ArrowRight aria-hidden className="size-5" />
              </Link>

              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#857AD2_0%,#B1475C_100%)] text-white"
                >
                  <Mail className="size-[18px]" strokeWidth={1.8} />
                </span>
                <div className="leading-tight">
                  <p className="text-[13px] whitespace-nowrap text-white/60">Máte připomínky? Napište nám</p>
                  <a
                    href="mailto:praktikai@ujep.cz"
                    className="font-bold text-white underline decoration-white/30 underline-offset-4 transition-colors hover:text-[#C9C2F0] hover:decoration-[#857AD2]"
                  >
                    praktikai@ujep.cz
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Maskot: na mobilu stojí pod textem, od lg vpravo, ukotvený
              k dolní hraně karty — uši mu vylezou nad horní. */}
          <div className="relative flex justify-center px-6 pb-8 lg:block lg:p-0">
            <div className="hero-enter relative w-[220px] [animation-delay:150ms] sm:w-[260px] lg:absolute lg:right-[5%] lg:bottom-6 lg:w-[min(440px,86%)]">
              <div
                aria-hidden
                className="blob-float-slow absolute top-[18%] -right-[10%] bottom-[2%] -left-[10%] rounded-[58%_42%_47%_53%/43%_55%_45%_57%] bg-[#D1E7D9]"
              />
              <div
                aria-hidden
                className="absolute top-[30%] -right-[20%] hidden size-[150px] rounded-full border-[1.5px] border-[#D1E7D9]/30 lg:block"
              />
              <LynxMascot className="relative h-auto w-full" />
            </div>

            {/* Bublina = motiv citace z „O projektu", jen s rohem k maskotovi.
                Kotví se ke sloupci, ne k maskotovi, aby nikdy nevjela do nadpisu. */}
            <p
              aria-hidden
              className="hero-pop absolute top-10 left-2 hidden origin-bottom-right -rotate-3 rounded-[26px] rounded-br-md bg-[#EDEAFA] px-5 py-3.5 text-base leading-[1.35] font-bold tracking-[-0.015em] text-[#23203A] shadow-[0_24px_60px_rgba(20,19,28,0.22)] xl:block"
            >
              Ahoj! Učit s AI
              <br />
              se dá naučit.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
