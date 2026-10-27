import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ChangelogDialog } from '@/components/changelog/ChangelogDialog';
import { buttonVariants } from '@/components/ui-kit/button';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Hero přes celé okno má širší kontejner než zbytek stránky (1240 px) —
 *  vedle rysa a zelené plochy by jinak zbylo nadpisu málo místa. */
const container = 'mx-auto w-[min(1440px,94vw)]';

/**
 * Nadpis od lg roste s levým sloupcem (container query, `cqi`), takže se
 * zalomí vždy stejně: „Připravujeme / budoucí učitele / pro digitální éru".
 * Nejširší řádek je v Geistu bold 7,09× velikost písma → 13.4cqi ho drží
 * na ~95 % šířky sloupce. Při změně textu nebo písma koeficient přepočítat.
 */
const heroTitle =
  'text-[2.1rem] leading-[1.02] font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[length:min(13.4cqi,8rem)] lg:text-wrap';

/**
 * Obrys zelené plochy v jednotkách jejího boxu (0–1): široká už nahoře,
 * levá hrana se zaobleným rohem stočí dolů a v pásu, kde stojí rys (zhruba
 * 25–75 % výšky), vede skoro svisle kolem x = 0.11 — přes ten bod jde střed
 * rysa (viz `--shape-left`). Dole lehce vybíhá doleva a uzavře se oblým dnem
 * nad spodní hranou hero, takže ji hrana sekce neusekne.
 */
const GREEN_SHAPE =
  'M1 0 L0.32 0 C0.24 0 0.18 0.06 0.15 0.14 C0.12 0.22 0.11 0.3 0.11 0.4 C0.11 0.52 0.12 0.62 0.1 0.72 C0.08 0.82 0.07 0.88 0.14 0.93 C0.3 0.99 0.7 0.985 1 0.92 Z';

/**
 * Pozadí hero jako studiové pozadí za 3D postavou: teplá šeď shora tmavší,
 * dole přesně #F0F0F0 (zbytek stránky), takže přechod pod lištou nemá šev.
 * Navrch měkké světlo za rysem a jemné nádechy barev srsti a značky.
 * Všechny radiální vrstvy doběhnou do průhledna dřív, než dojdou dolů.
 */
const BACKDROP = [
  'radial-gradient(ellipse 55% 60% at 64% 38%, rgba(255,251,245,0.95) 0%, rgba(255,251,245,0) 70%)',
  'radial-gradient(ellipse 50% 55% at 6% 8%, rgba(233,184,96,0.18) 0%, rgba(233,184,96,0) 70%)',
  'radial-gradient(ellipse 40% 45% at 30% 70%, rgba(133,122,210,0.10) 0%, rgba(133,122,210,0) 70%)',
  'linear-gradient(180deg, #E2DED7 0%, #EAE7E2 40%, #F0F0F0 88%)',
].join(', ');

/** Zelená s hloubkou: světlejší nahoře vlevo, sytější dole — jako nasvícený povrch. */
const GREEN_FILL = 'bg-[linear-gradient(160deg,#79C493_0%,#5AAC78_45%,#3F8D5F_100%)]';

/**
 * Hero úvodní stránky.
 *
 * - Hero podjíždí pod přilepenou lištu (`Header`, 64 px), která je na
 *   úvodní stránce úplně nahoře průhledná. Výška je přesně první okno; co se
 *   nevejde, ubere se rysovi.
 * - Od lg dvě půlky: vlevo nadpis, perex, CTA + tlačítko Novinky (otevře
 *   changelog v modálu) a pod nimi kontaktní e-mail; vpravo
 *   rys od středu okna a zelená plocha, která se táhne doleva až k němu.
 * - Za rysem organická zelená plocha od horní hrany s oblým dnem nad spodní
 *   hranou (`GREEN_SHAPE`). Je ukotvená tak, aby její levá hrana vedla
 *   středem rysa — rys stojí napůl na světlém podkladu a napůl na zelené
 *   při jakékoli šířce okna.
 * - Na mobilu rys nahoře v ploše, která si vezme zbylou výšku, za ním
 *   zelený blob, pod ním nadpis a CTA. Perex jen na dost vysokých displejích.
 *
 * Nájezd jede přes CSS (`.hero-enter`, `.hero-pop` v globals.css), ne přes
 * motion — hero je nad ohybem a nesmí být neviditelný, dokud se nenačte JS.
 */
export function Hero({ changelog }: { changelog: string | null }) {
  return (
    <section
      className={cn(
        // Záporný margin = výška lišty, která je nad hero průhledná.
        // z-10: stíny zelené plochy a rysa přečnívají pod hero do další
        // sekce a tam doběhnou do ztracena — bez toho by je její pozadí
        // uřízlo v ostré vodorovné lince. Spodek hero je přesně #F0F0F0.
        'relative z-10 -mt-16 overflow-x-clip bg-[#F0F0F0]',
        // Výška rysa od lg: celý prostor pod lištou (okno − 80px horní
        // a 24px spodní odsazení), strop 900px.
        '[--fig-h:min(calc(100svh_-_104px),900px)]',
        // Pravý sloupec = pravá půlka kontejneru: rys stojí od středu okna
        // a zelená plocha má doleva dost místa.
        '[--right-w:calc(min(1440px,94vw)_*_0.5)]',
        // Střed rysa v souřadnicích sekce: levá hrana pravého sloupce
        // (= střed sekce) + půlka šířky rysa (0.45 / 2 × výška).
        '[--lynx-cx:calc(50%_+_var(--fig-h)_*_0.225)]',
        // Levá hrana boxu zelené plochy L tak, aby svislý úsek hrany (x = 0.11
        // boxu, který sahá k pravé hraně sekce) padl na střed rysa:
        // L + 0.11 × (100% − L) = střed  →  L = (střed − 11%) / 0.89.
        '[--shape-left:calc((var(--lynx-cx)_-_11%)_/_0.89)]',
      )}
      style={{ backgroundImage: BACKDROP }}
    >
      <svg aria-hidden className="absolute size-0">
        <defs>
          <clipPath id="hero-green-shape" clipPathUnits="objectBoundingBox">
            <path d={GREEN_SHAPE} />
          </clipPath>
        </defs>
      </svg>

      {/* Zelená plocha — jen od lg. Stín nese obal (drop-shadow kreslí podle
          ořezu potomka), tvary jsou uvnitř, takže je ořízne stejný obrys. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 left-[var(--shape-left)] hidden [filter:drop-shadow(-14px_22px_40px_rgba(13,47,49,0.22))] lg:block"
      >
        <div className={cn('absolute inset-0 overflow-hidden [clip-path:url(#hero-green-shape)]', GREEN_FILL)}>
          <div className="blob-float-slow absolute -top-[120px] -right-[140px] size-[380px] rounded-[62%_38%_43%_57%/51%_47%_53%_49%] bg-white/15" />
          <div className="absolute top-[22%] right-[4%] size-[150px] rounded-full border-[1.5px] border-white/40" />
        </div>
      </div>

      <div
        className={cn(
          // Celé první okno; horní padding = lišta (64px) + vlastní odstup.
          'relative flex h-svh min-h-[544px] flex-col pt-20 pb-5 sm:pt-22',
          'lg:grid lg:min-h-[664px] lg:grid-cols-[minmax(0,1fr)_var(--right-w)] lg:items-center lg:gap-x-7 lg:pt-20 lg:pb-6',
          container,
        )}
      >
        {/* Rys */}
        <div className="relative order-1 min-h-0 flex-1 lg:order-2 lg:h-[var(--fig-h)] lg:w-full lg:flex-none lg:self-end">
          {/* Box rysa: výška = plocha, šířka z poměru stran obrázku.
              Mobil na střed, od lg k levé hraně sloupce. */}
          <div className="hero-enter absolute top-0 left-1/2 aspect-[422/937] h-full -translate-x-1/2 [animation-delay:150ms] lg:left-0 lg:translate-x-0">
            {/* Na mobilu blob za rysem; od lg ho nahrazuje zelená plocha. */}
            <div
              aria-hidden
              className={cn(
                'absolute -inset-x-[45%] top-[16%] bottom-[1%] rounded-[58%_42%_47%_53%/43%_55%_45%_57%] shadow-[0_24px_48px_rgba(13,47,49,0.2)] lg:hidden',
                GREEN_FILL,
              )}
            />
            {/* Stín pod tlapkami, ať rys stojí, a ne visí. */}
            <div
              aria-hidden
              className="absolute -bottom-[1%] left-1/2 h-[3%] w-[110%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(13,47,49,0.35),transparent)]"
            />
            <Image
              src="/lynx-hero.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 420px, 220px"
              // Měkký stín odlepí rysa od zelené plochy za ním.
              className="object-contain object-bottom [filter:drop-shadow(0_24px_36px_rgba(13,47,49,0.22))]"
            />

            {/* Bublina vpravo u hlavy, rohem k rysovi — motiv citace
                z „O projektu". Sedí na zelené ploše. */}
            <p
              aria-hidden
              className="hero-pop absolute top-[2%] left-full ml-2 hidden origin-bottom-left rotate-3 rounded-[26px] rounded-bl-md bg-[#EDEAFA] px-5 py-3.5 text-base leading-[1.35] font-bold tracking-[-0.015em] whitespace-nowrap text-[#23203A] shadow-[0_24px_60px_rgba(20,19,28,0.16)] lg:block"
            >
              Ahoj! Učit s AI
              <br />
              se dá naučit.
            </p>
          </div>
        </div>

        {/* Nadpis, perex a CTA */}
        <div className="hero-enter @container order-2 mt-5 lg:order-1 lg:mt-0">
          <h1 className={cn('text-[#111111]', heroTitle)}>
            <span className="lg:block">Připravujeme</span>{' '}
            <span className="lg:block">budoucí učitele</span>{' '}
            <span className="lg:block">pro digitální éru</span>
          </h1>

          {/* Na nízkých mobilech se perex nevejde — přednost má lišta. */}
          <p className="mt-3 max-w-[520px] text-base leading-[1.55] text-pretty text-[#555555] lg:mt-6 lg:text-lg max-lg:[@media(max-height:740px)]:hidden">
            Kurzy, AI tutor i veřejná databáze materiálů na jednom místě — pro
            studenty učitelství i jejich vyučující.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4 lg:mt-9">
            {/* Hero CTA z UI kitu — `size="xl"` je z Figmy dělaný právě na
                něj, tady ještě o stupeň zvětšený. */}
            <Link
              href={ROUTES.COURSES}
              className={cn(
                buttonVariants({ size: 'xl' }),
                'h-14 px-7 text-lg hover:scale-105 active:scale-95',
              )}
            >
              Prozkoumat kurzy
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>

            {/* Sekundární akce: novinky v modálu (kitové outline tlačítko
                ve stejné velikosti jako CTA). */}
            <ChangelogDialog markdown={changelog} className="h-14 px-6 text-lg" />
          </div>

          {/* Kontakt je funkční obsah (home-design-system.md, kap. 9), nesmí
              z hero zmizet — pod tlačítky jako prostý odkaz, bez plochy. */}
          <p className="mt-5 text-base text-[#555555]">
            Máte připomínky? Napište na{' '}
            <a
              href="mailto:praktikai@ujep.cz"
              className="font-semibold text-[#111111] underline decoration-[#111111]/25 underline-offset-4 transition-colors hover:decoration-[#111111]"
            >
              praktikai@ujep.cz
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
