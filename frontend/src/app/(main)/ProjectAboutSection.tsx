'use client';

import Image from 'next/image';
import { motion } from 'motion/react';

const HIGHLIGHTS = [
  { value: '4', label: 'Hlavní cíle' },
  { value: '3', label: 'klíčové výstupy' },
  { value: '2', label: 'univerzity' },
  { value: '∞', label: 'možnosti pro výuku' },
];

const GOALS = [
  {
    n: '01',
    title: 'Personalizace výukových materiálů',
    desc: 'AI se přizpůsobí úrovni a tempu každého studenta — žádné šablonovité kurzy.',
  },
  {
    n: '02',
    title: 'Zvýšení efektivity studia pomocí AI',
    desc: 'Automatizace rutinních úloh šetří čas a zvyšuje hloubku porozumění látce.',
  },
  {
    n: '03',
    title: 'Integrace s moderními LMS systémy',
    desc: 'Napojení na Moodle a další LMS, takže nemusíte nic měnit ve své výuce.',
  },
  {
    n: '04',
    title: 'Analýza studijních dat pro pedagogy',
    desc: 'Přehledné reporty o pokroku třídy i jednotlivců pro lepší rozhodování.',
  },
];

const OUTCOMES = [
  {
    title: 'Platforma PRAKTIK-AI',
    desc: 'Robustní softwarové řešení integrující generativní modely pro automatickou tvorbu a úpravu vzdělávacích textů a testů.',
  },
  {
    title: 'Databáze obsahu',
    desc: 'Rozsáhlá knihovna kurátorsky zpracovaných digitálních materiálů validovaných odborníky z praxe i akademické sféry.',
  },
  {
    title: 'Interaktivní Workshopy',
    desc: 'Série metodických setkání pro pedagogy zaměřená na efektivní implementaci AI nástrojů do přímé výuky.',
  },
];

//vstup s nepatrným zpožděním na položku, jemný "lift" na hover.
const cardHover = {
  scale: 1.02,
  y: -4,
  transition: { type: 'spring' as const, stiffness: 300, damping: 22 },
};

export function ProjectAboutSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
        {/* O projektu */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          whileHover={cardHover}
          className="bg-white border border-gray-200 rounded-2xl p-8 sm:p-10 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-2xl font-semibold tracking-[0.2em] text-emerald-700 mb-4">O PROJEKTU</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
            Vzdělávání, které se učí společně s vámi
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-3xl mb-8">
            Praktik-AI spojuje pedagogické zkušenosti s generativní umělou inteligencí a vytváří
            prostředí, které se přizpůsobuje každému studentovi. Žádné šablony — jen výuka, která
            dává smysl.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: 'easeOut' }}
                className="flex flex-col"
              >
                <span className="text-3xl sm:text-4xl font-bold text-emerald-600">{h.value}</span>
                <span className="text-xs sm:text-sm text-gray-500 mt-1">{h.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.article>

        {/* Cíle projektu */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mt-8 rounded-2xl p-8 sm:p-10"
          style={{ backgroundColor: '#E5F4EA' }}
        >
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Cíle projektu</h3>
          <p className="text-sm sm:text-base text-gray-700 max-w-3xl mb-8">
            Hlavním cílem projektu je vývoj a pilotní ověření inovativního systému pro
            personalizované vzdělávání s využitím pokročilé analytiky a generativní umělé
            inteligence. Projekt se zaměřuje na vytvoření adaptivního prostředí, které reaguje na
            individuální potřeby studentů v reálném čase.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOALS.map((g, i) => (
              <motion.div
                key={g.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: 'easeOut' }}
                whileHover={cardHover}
                className="bg-white rounded-xl p-5 border border-emerald-100/60 hover:shadow-md transition-shadow flex gap-4"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  {g.n}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{g.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{g.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.article>

        {/* Výstup projektu */}
        <div className="mt-12">
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-xl sm:text-2xl font-bold text-gray-900 mb-4"
          >
            Výstup projektu
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {OUTCOMES.map((o, i) => (
              <motion.div
                key={o.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.05 * i, ease: 'easeOut' }}
                whileHover={cardHover}
                className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">{o.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{o.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Přínos a výzkum */}
        <div className="mt-12">
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-xl sm:text-2xl font-bold text-gray-900 mb-4"
          >
            Přínos a výzkum
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex flex-col gap-4"
            >
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                Projekt přináší unikátní spojení pedagogických věd a moderních technologií
                zpracování přirozeného jazyka (NLP). Výzkumná část se soustředí na měření dopadu
                personalizované zpětné vazby generované AI na motivaci a úspěšnost studentů.
              </p>

              <motion.blockquote
                whileHover={{
                  backgroundColor: '#E5F4EA',
                  transition: { duration: 0.2 },
                }}
                className="rounded-xl p-5 border border-emerald-100"
                style={{ backgroundColor: '#F0F8F2' }}
              >
                <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed">
                  „Naším cílem není nahradit učitele, ale poskytnout mu nástroj, který mu uvolní
                  ruce od rutinních činností a umožní mu věnovat se individuálnímu rozvoji každého
                  žáka."
                </p>
                <footer className="mt-3 text-xs text-gray-500">— tým Praktik-AI</footer>
              </motion.blockquote>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              whileHover={{
                scale: 1.02,
                rotate: -0.4,
                transition: { type: 'spring' as const, stiffness: 240, damping: 20 },
              }}
              className="relative overflow-hidden rounded-2xl shadow-lg group"
              style={{ minHeight: 280 }}
            >
              <Image
                src="/ucenisai.png"
                alt="Jednoduché učení s AI"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                priority={false}
              />
              {/* Tmavý overlay pro čitelnost gradientu — pod obrázkem nemá vliv,
                  pokud má obrázek vlastní pozadí, ale chrání titulek na výřezu. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProjectAboutSection;
