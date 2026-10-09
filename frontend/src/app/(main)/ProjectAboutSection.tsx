'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { Database, Sparkles, Users } from 'lucide-react';

const HIGHLIGHTS = [
  { value: '4', label: 'hlavní cíle', color: 'text-[#5AAC78]', offset: '' },
  {
    value: '3',
    label: 'klíčové výstupy',
    color: 'text-[#857AD2]',
    offset: 'lg:translate-y-[30px]',
  },
  {
    value: '2',
    label: 'univerzity',
    color: 'text-[#5AAC78]',
    offset: 'lg:-translate-y-3',
  },
  {
    value: '∞',
    label: 'možností pro výuku',
    color: 'text-[#F87B1B]',
    offset: 'lg:translate-y-[22px]',
  },
];

const GOALS = [
  {
    n: '01',
    title: 'Personalizace výukových materiálů',
    desc: 'AI se přizpůsobí úrovni a tempu každého studenta — žádné šablonovité kurzy.',
    indent: '',
  },
  {
    n: '02',
    title: 'Zvýšení efektivity studia pomocí AI',
    desc: 'Automatizace rutinních úloh šetří čas a zvyšuje hloubku porozumění látce.',
    indent: 'lg:ml-10',
  },
  {
    n: '03',
    title: 'Integrace s moderními LMS systémy',
    desc: 'Napojení na Moodle a další LMS, takže nemusíte nic měnit ve své výuce.',
    indent: '',
  },
  {
    n: '04',
    title: 'Analýza studijních dat pro pedagogy',
    desc: 'Přehledné reporty o pokroku třídy i jednotlivců pro lepší rozhodování.',
    indent: 'lg:ml-10',
  },
];

const OUTCOMES = [
  {
    icon: Sparkles,
    title: 'Platforma PRAKTIK-AI',
    desc: 'Robustní softwarové řešení integrující generativní modely pro automatickou tvorbu a úpravu vzdělávacích textů a testů.',
    blob: 'bg-[#D1E7D9] text-[#0D2F31] rounded-[62%_38%_51%_49%/44%_58%_42%_56%]',
    offset: '',
  },
  {
    icon: Database,
    title: 'Databáze obsahu',
    desc: 'Rozsáhlá knihovna kurátorsky zpracovaných digitálních materiálů validovaných odborníky z praxe i akademické sféry.',
    blob: 'bg-[#5AAC78] text-white rounded-[45%_55%_38%_62%/57%_43%_57%_43%]',
    offset: 'lg:mt-[76px]',
  },
  {
    icon: Users,
    title: 'Interaktivní workshopy',
    desc: 'Série metodických setkání pro pedagogy zaměřená na efektivní implementaci AI nástrojů do přímé výuky.',
    blob: 'bg-[#857AD2] text-white rounded-[55%_45%_62%_38%/42%_56%_44%_58%]',
    offset: 'lg:mt-[152px]',
  },
];


const RUNAWAY_TO = 99;

function HighlightValue({ value, delay }: { value: string; delay: number }) {
  const target = Number(value);
  const hasTarget = Number.isFinite(target);

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduceMotion = useReducedMotion();

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [overflowed, setOverflowed] = useState(false);

  useEffect(() => {
    if (!inView || reduceMotion) return;

    const controls = animate(count, hasTarget ? target : RUNAWAY_TO, {
      duration: hasTarget ? 1.1 : 1.5,
      delay,
      // Konečná čísla dojedou a zabrzdí, nekonečno naopak zrychluje až do konce.
      ease: hasTarget ? [0.16, 1, 0.3, 1] : 'easeIn',
      onComplete: hasTarget ? undefined : () => setOverflowed(true),
    });

    return () => controls.stop();
  }, [inView, reduceMotion, count, target, hasTarget, delay]);

  const settled = reduceMotion || overflowed;

  return (
    <span ref={ref}>
      {/* Běžící číslice by čtečku jen zahltily — ta dostane rovnou výsledek. */}
      <span aria-hidden>
        {settled ? (
          <motion.span
            key="settled"
            className="inline-block"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          >
            {value}
          </motion.span>
        ) : (
          <motion.span>{rounded}</motion.span>
        )}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

/** Jediná JS animace sekce: jemný nájezd bloku při scrollu, jednou. */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: 'easeOut' as const },
};

/** Typografie nadpisů 1:1 podle <h1> v Hero, ať má landing page jeden rukopis.
 *  Drží se i váha (bold, ne extrabold) a leading-tight — bez vlastního
 *  trackingu, Hero žádný nemá. */
const heroTitle =
  'text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl';

const container = 'mx-auto w-[min(1240px,94vw)]';

/** Levý okraj shodný s `container` — pro full-bleed sekce, jejichž text má
 *  navazovat na zbytek stránky, zatímco pozadí a obrázek jdou na doraz. */
const containerGutterLeft = 'pl-[calc((100vw_-_min(1240px,94vw))_/_2)]';

export function ProjectAboutSection() {
  // <main> v layoutu drží obsah na 1440px. Sekce je ale full-bleed, proto se
  // zápornými okraji vylomí zpět na plnou šířku viewportu. Na užších
  // obrazovkách (< 1440px) vyjde calc na ~0 a nic se nemění.
  return (
    <div className="relative mx-[calc(50%-50vw)] overflow-x-clip bg-[#f0f0f0] text-[#111111]">
      {/* O projektu */}
      <section className="relative overflow-hidden py-20 lg:pt-[130px] lg:pb-[60px]">
        {/* Dekorace: organické tvary, čistě pozadí. */}
        <div
          aria-hidden
          className="blob-float pointer-events-none absolute top-10 -right-[180px] hidden size-[560px] rounded-[58%_42%_47%_53%/43%_55%_45%_57%] bg-[#D1E7D9] lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-[380px] -right-[70px] hidden size-[190px] rounded-full border-[1.5px] border-[#298E86] opacity-[0.32] lg:block"
        />

        <motion.div {...fadeUp} className={`relative ${container}`}>
          <h2 className={`max-w-[15ch] text-pretty ${heroTitle}`}>
            Vzdělávání, které se učí společně s vámi
          </h2>
          <p className="mt-8 max-w-[520px] text-[19px] leading-[1.62] text-[#555555] text-pretty">
            Praktik-AI spojuje pedagogické zkušenosti s generativní umělou
            inteligencí a vytváří prostředí, které se přizpůsobuje každému
            studentovi. Žádné šablony — jen výuka, která dává smysl.
          </p>

          <dl className="mt-14 flex flex-wrap items-end gap-x-16 gap-y-10 lg:mt-[92px]">
            {HIGHLIGHTS.map((h, i) => (
              <div key={h.label} className={h.offset}>
                <dt
                  className={`text-[56px] leading-[0.8] font-extrabold tabular-nums tracking-[-0.04em] lg:text-[76px] ${h.color}`}
                >
                  <HighlightValue value={h.value} delay={i * 0.12} />
                </dt>
                <dd className="mt-3.5 text-xs tracking-[0.14em] text-[#777777] uppercase">
                  {h.label}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </section>

      {/* Cíle projektu — tmavý pás se zkosenými hranami */}
      <section className="relative -mt-5 overflow-hidden py-24 text-white lg:pt-[210px] lg:pb-[220px]">
        <div
          aria-hidden
          className="absolute inset-0 bg-[#0D2F31] [clip-path:polygon(0_5.5vw,100%_0,100%_100%,0_calc(100%-4.5vw))]"
        />
        <div
          aria-hidden
          className="blob-float-slow pointer-events-none absolute top-16 -left-[180px] hidden size-[480px] rounded-[62%_38%_43%_57%/51%_47%_53%_49%] bg-[#5AAC78]/15 lg:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-120px] bottom-32 hidden size-[360px] rounded-full border-[1.5px] border-[#D1E7D9]/25 lg:block"
        />

        <motion.div
          {...fadeUp}
          className="relative grid w-full items-start gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[90px]"
        >
          {/* Text navazuje na `container` ostatních sekcí, tmavý pás pod ním
              jde dál na doraz obou okrajů. */}
          <div className={containerGutterLeft}>
            <h2 className={heroTitle}>
              Cíle
              <br />
              projektu
            </h2>
            <div className="my-7 h-1 w-16 rounded-sm bg-[#5AAC78]" />
            <p className="text-[17px] leading-[1.68] text-white/65 text-pretty">
              Hlavním cílem projektu je vývoj a pilotní ověření inovativního
              systému pro personalizované vzdělávání s využitím pokročilé
              analytiky a generativní umělé inteligence. Projekt se zaměřuje na
              vytvoření adaptivního prostředí, které reaguje na individuální
              potřeby studentů v reálném čase.
            </p>
          </div>

          <ol className="flex flex-col">
            {GOALS.map((g, i) => (
              <li
                key={g.n}
                className={`relative pl-20 lg:pl-[150px] ${g.indent} ${
                  i === 0 ? 'pb-10 lg:pb-[46px]' : 'py-10 lg:py-[46px]'
                } ${i > 0 ? 'border-t border-[#D1E7D9]/20' : ''} ${
                  i === GOALS.length - 1 ? 'pb-0 lg:pb-0' : ''
                }`}
              >
                {/* Číslo je dekorace — obsah nese <ol>. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-2 left-0 text-[72px] leading-none font-extrabold tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_rgba(154,214,178,0.42)] lg:text-[112px]"
                >
                  {g.n}
                </span>
                <h3 className="relative mb-3 text-[22px] leading-[1.15] font-bold tracking-[-0.02em] lg:text-[26px]">
                  {g.title}
                </h3>
                <p className="relative max-w-[430px] text-base leading-[1.62] text-white/60">
                  {g.desc}
                </p>
              </li>
            ))}
          </ol>
        </motion.div>
      </section>

      {/* Výstup projektu */}
      <section className="relative overflow-hidden py-24 lg:pt-[150px] lg:pb-[60px]">
        <motion.div {...fadeUp} className={container}>
          <h2 className={heroTitle}>
            Výstup projektu
          </h2>

          <div className="mt-12 grid items-start gap-12 md:grid-cols-3 lg:mt-20 lg:gap-14">
            {OUTCOMES.map(({ icon: Icon, title, desc, blob, offset }) => (
              <div key={title} className={`text-center md:text-left ${offset}`}>
                {/* Ikona je dekorace — význam nese nadpis pod ní.
                    Na mobilu karta stojí na střed, od md zpět doleva. */}
                <div
                  className={`mx-auto flex size-[92px] items-center justify-center md:mx-0 ${blob}`}
                >
                  <Icon aria-hidden className="size-9" strokeWidth={1.6} />
                </div>
                <h3 className="mt-7 text-[25px] font-bold tracking-[-0.02em]">
                  {title}
                </h3>
                <div className="my-[18px] h-px w-full bg-[#D6D6D6]" />
                <p className="text-base leading-[1.62] text-[#666666] text-pretty">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Přínos a výzkum */}
      <section className="relative overflow-hidden py-24 lg:pt-[150px] lg:pb-[160px]">
        <div
          aria-hidden
          className="blob-float-slow pointer-events-none absolute top-20 -left-[220px] hidden size-[460px] rounded-[48%_52%_62%_38%/55%_42%_58%_45%] bg-[#E4E0F6] opacity-70 lg:block"
        />

        <motion.div
          {...fadeUp}
          className="relative grid w-full items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-0"
        >
          <div className={`relative z-2 ${containerGutterLeft} lg:pr-12`}>
            <h2 className={heroTitle}>
              Přínos
              <br />
              a výzkum
            </h2>
            <p className="mt-7 text-[17px] leading-[1.7] text-[#555555] text-pretty">
              Projekt přináší unikátní spojení pedagogických věd a moderních
              technologií zpracování přirozeného jazyka (NLP). Výzkumná část se
              soustředí na měření dopadu personalizované zpětné vazby generované
              AI na motivaci a úspěšnost studentů.
            </p>

            {/* Citace přesahuje přes obrázek — jen na širokých displejích. */}
            <blockquote className="relative z-3 mt-11 rounded-[34px] rounded-bl-lg bg-[#EDEAFA] px-8 py-9 shadow-[0_24px_60px_rgba(20,19,28,0.16)] lg:mr-[-120px] lg:rotate-[-1.4deg] lg:px-11 lg:py-10">
              <p className="text-xl leading-[1.42] font-bold tracking-[-0.015em] text-[#23203A] lg:text-[23px]">
                Naším cílem není nahradit učitele, ale poskytnout mu nástroj,
                který mu uvolní ruce od rutinních činností a umožní mu věnovat
                se individuálnímu rozvoji každého žáka.
              </p>
              <footer className="mt-5 text-[13px] font-bold tracking-[0.1em] text-[#6B60BE] uppercase">
                — tým Praktik-AI
              </footer>
            </blockquote>
          </div>

          {/* Obrázek doráží na pravý okraj — zaoblení zůstává jen na vnitřní hraně. */}
          <div className="relative h-[380px] overflow-hidden bg-[#14131C] lg:h-[620px] lg:rounded-l-[28px]">
            <Image
              src="/ucenisai.png"
              alt="Jednoduché učení s AI"
              fill
              sizes="(max-width: 1024px) 94vw, 60vw"
              className="object-cover"
            />
          </div>
        </motion.div>
      </section>
    </div>
  );
}

export default ProjectAboutSection;
