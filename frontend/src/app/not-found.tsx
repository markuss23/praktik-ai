import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Footer, Header } from '@/components/layout';
import { LynxMascotSearching } from '@/components/layout/LynxMascotSearching';
import { buttonVariants } from '@/components/ui-kit/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const container = 'mx-auto w-[min(1240px,94vw)]';

/** Stejná škála jako <h1> v Hero a nadpisy v „O projektu" (home-design-system.md, kap. 3.2). */
const heroTitle =
  'text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl';

/**
 * 404 — rys s lupou prohledal všechno a nic nenašel.
 *
 * Root not-found leží nad layoutem (main), takže si Header a Footer skládá
 * sám, aby se z chybové stránky dalo normálně navigovat dál. Nájezd jede
 * přes CSS (`.hero-enter`, `.hero-pop`), dekorace jsou `aria-hidden`.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0F0F0] text-[#111111]">
      <Header />

      <main className="flex-1 overflow-x-clip">
        <section
          className={`grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-24 ${container}`}
        >
          <div className="hero-enter relative z-1">
            <h1 className={`max-w-[15ch] text-pretty ${heroTitle}`}>
              Rys hledal všude, ale tuhle stránku nenašel
            </h1>

            <p className="mt-7 max-w-[520px] text-[19px] leading-[1.62] text-pretty text-[#555555]">
              Adresa neexistuje, nebo se stránka mezitím přestěhovala.
              Zkontrolujte odkaz, nebo pokračujte jednou z cest níže.
            </p>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href={ROUTES.HOME}
                className={cn(
                  buttonVariants({ size: 'xl' }),
                  'h-12 px-5 hover:scale-105 active:scale-95',
                )}
              >
                <ArrowLeft aria-hidden className="size-5" />
                Zpět na úvod
              </Link>
              <Link
                href={ROUTES.COURSES}
                className={cn(
                  buttonVariants({ size: 'xl', variant: 'outline' }),
                  'h-12 bg-white px-5 hover:scale-105 active:scale-95',
                )}
              >
                <BookOpen aria-hidden className="size-5" />
                Prohlédnout kurzy
              </Link>
            </div>
          </div>

          {/* Rys s lupou na mátovém blobu, za ním duchová „404". */}
          <div className="hero-enter relative mx-auto w-[240px] [animation-delay:150ms] sm:w-[290px] lg:w-[380px]">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-[4%] left-1/2 -translate-x-1/2 text-[132px] leading-none font-extrabold tracking-[-0.05em] text-transparent select-none [-webkit-text-stroke:2px_rgba(41,142,134,0.28)] sm:text-[170px] lg:-top-[8%] lg:text-[230px]"
            >
              404
            </span>
            <div
              aria-hidden
              className="blob-float-slow absolute top-[22%] -right-[8%] bottom-[2%] -left-[8%] rounded-[58%_42%_47%_53%/43%_55%_45%_57%] bg-[#D1E7D9]"
            />
            <div
              aria-hidden
              className="absolute top-[34%] -right-[18%] hidden size-[150px] rounded-full border-[1.5px] border-[#298E86] opacity-[0.32] lg:block"
            />

            <LynxMascotSearching className="relative h-auto w-full" />

            {/* Otazníky kolem hlavy — jen dekorace. */}
            <span
              aria-hidden
              className="blob-float absolute top-[4%] left-[6%] hidden -rotate-12 text-5xl font-extrabold text-[#F87B1B] sm:block"
            >
              ?
            </span>
            <span
              aria-hidden
              className="blob-float-slow absolute top-[12%] -right-[2%] hidden rotate-12 text-3xl font-extrabold text-[#857AD2] sm:block"
            >
              ?
            </span>

            {/* Bublina = motiv citace z „O projektu", roh míří k rysovi. */}
            <p
              aria-hidden
              className="hero-pop absolute top-[16%] -left-[24%] hidden origin-bottom-right -rotate-3 rounded-[26px] rounded-br-md bg-[#EDEAFA] px-5 py-3.5 text-base leading-[1.35] font-bold tracking-[-0.015em] text-[#23203A] shadow-[0_24px_60px_rgba(20,19,28,0.16)] lg:block"
            >
              Hmm… tady
              <br />
              nic není.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
