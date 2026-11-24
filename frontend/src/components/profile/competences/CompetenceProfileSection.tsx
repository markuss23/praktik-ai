'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Compass, GraduationCap, ListChecks, TrendingDown, TrendingUp } from 'lucide-react';
import type { Course, KrauuCompetence, MyCompetenceItem, MyEnrollment } from '@/api';
import { getCourses, getKrauuCompetences, getMyCompetenceProfile } from '@/lib/api-client';
import { groupKrauuCompetences } from '@/lib/course-categories';
import {
  competenceHighlights, competenceLevel, computeAreaProfile, recommendCourses,
} from '@/lib/krauu-stats';
import { ROUTES } from '@/lib/constants';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button,
} from '@/components/ui';
import { fmtScore } from '@/components/competences/ScoreDumbbell';
import { CompetenceAreaRadar } from './CompetenceAreaRadar';
import { CompetenceList } from './CompetenceList';
import { CompetenceRecommendations } from './CompetenceRecommendations';

const ITEM = 'competences';
// Rozbalení si pamatuje prohlížeč; výchozí stav je zavřeno
const OPEN_STORAGE_KEY = 'praktikai:profile:competences-open';

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(OPEN_STORAGE_KEY, open ? '1' : '0');
  } catch {
    // Úložiště nemusí být dostupné (privátní okno), stav pak jen nepřežije reload
  }
}

function SubHeader({ icon: Icon, title, subtitle }: { icon: typeof GraduationCap; title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Icon size={15} className="text-gradient-r" aria-hidden />
        {title}
      </h4>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function HighlightList({ items, empty }: { items: MyCompetenceItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((i) => (
        <li key={i.krauuId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs">
          <span className="truncate" title={`${i.code} ${i.name}`}>
            <span className="text-muted-foreground tabular-nums mr-1.5">{i.code}</span>
            <span className="text-foreground">{i.name}</span>
          </span>
          <span className="font-semibold text-foreground tabular-nums">{fmtScore(competenceLevel(i))}</span>
        </li>
      ))}
    </ul>
  );
}

// Kompetenční profil studenta na /profil v accordionu: oblasti, silné a slabé stránky, seznam kompetencí, co dál
export function CompetenceProfileSection({
  enrollments, enrollmentsLoading,
}: {
  enrollments: MyEnrollment[];
  // Než se zápisy načtou, doporučení by mohla ukázat už dokončené kurzy
  enrollmentsLoading: boolean;
}) {
  const [items, setItems] = useState<MyCompetenceItem[] | null>(null);
  const [catalog, setCatalog] = useState<KrauuCompetence[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState(false);
  const [showUntested, setShowUntested] = useState(false);
  // Sekce se renderuje až po přihlášení na klientu, localStorage jde číst v initializer
  const [open, setOpen] = useState<boolean>(readOpen);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyCompetenceProfile(), getKrauuCompetences()])
      .then(([profile, krauu]) => {
        if (cancelled) return;
        setItems(profile);
        setCatalog(krauu);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    // Katalog pro doporučení; když selže, sekce "Co dál" jen zůstane prázdná
    getCourses({ isPublished: true })
      .then((list) => { if (!cancelled) setCourses(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const areas = useMemo(() => groupKrauuCompetences(catalog), [catalog]);
  // Backend vrací i kompetence jen s procvičováním (bez vstupu i výstupu); za ověřené se nepočítají
  const scored = useMemo(() => (items ?? []).filter((i) => competenceLevel(i) != null), [items]);
  const areaProfile = useMemo(() => computeAreaProfile(areas, scored), [areas, scored]);
  const { strengths, weaknesses } = useMemo(() => competenceHighlights(scored), [scored]);
  const recommendations = useMemo(
    () => (enrollmentsLoading ? [] : recommendCourses(weaknesses, courses, enrollments)),
    [weaknesses, courses, enrollments, enrollmentsLoading],
  );
  const untested = useMemo(() => {
    const tested = new Set(scored.map((i) => i.krauuId));
    return areas.flatMap((a) => a.competences).filter((c) => !tested.has(c.krauuId));
  }, [areas, scored]);
  const total = areas.reduce((n, a) => n + a.competences.length, 0);

  const handleOpenChange = (value: unknown[]) => {
    const next = value.includes(ITEM);
    setOpen(next);
    writeOpen(next);
  };

  const summary = error
    ? 'Profil se nepodařilo načíst'
    : items === null
      ? 'Načítání…'
      : scored.length === 0
        ? 'Zatím žádný dokončený test'
        : `Ověřeno ${scored.length} z ${total} kompetencí KRAUU`;

  let content: ReactNode;
  if (error) {
    content = <p className="text-sm text-muted-foreground">Kompetenční profil se nepodařilo načíst. Zkuste stránku obnovit.</p>;
  } else if (items === null) {
    content = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy="true">
        <div className="h-56 bg-muted rounded-lg animate-pulse" />
        <div className="h-56 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  } else if (scored.length === 0) {
    content = (
      <>
        <p className="text-sm text-muted-foreground mb-3">
          Zatím nemáte dokončený žádný test. Profil se začne skládat po prvním pretestu v kurzu
          a ukáže vám, ve kterých kompetencích jste silní a co rozvíjet dál.
        </p>
        <Button render={<Link href={ROUTES.COURSES} />} nativeButton={false} size="sm">
          Vybrat kurz
        </Button>
      </>
    );
  } else {
    content = (
      <div className="flex flex-col gap-5">
        <div>
          <CompetenceAreaRadar profile={areaProfile} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <TrendingUp className="size-3.5 text-success" aria-hidden /> Silné stránky
              </p>
              <HighlightList items={strengths} empty="Ukážou se, až budete mít výsledky aspoň ze dvou kompetencí." />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <TrendingDown className="size-3.5 text-warning" aria-hidden /> Na čem zapracovat
              </p>
              <HighlightList items={weaknesses} empty="Ukážou se, až budete mít výsledky aspoň ze dvou kompetencí." />
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-border">
          <SubHeader
            icon={ListChecks}
            title="Moje kompetence"
            subtitle="Po rozbalení uvidíte, kde jste kompetenci rozvíjeli a jak se výsledky vyvíjely."
          />
          <CompetenceList areas={areas} items={scored} />
          {untested.length > 0 && (
            <div className="mt-4 text-xs text-muted-foreground">
              <Button
                variant="plain"
                onClick={() => setShowUntested((v) => !v)}
                aria-expanded={showUntested}
                className={cn(BTN_KEEP_BOX, 'text-xs font-normal text-muted-foreground hover:text-foreground underline-offset-2 hover:underline')}
              >
                Zatím neověřeno: {untested.length} z {total} kompetencí {showUntested ? '(skrýt)' : '(zobrazit)'}
              </Button>
              {showUntested && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 mt-2">
                  {untested.map((c) => (
                    <li key={c.krauuId} className="truncate" title={`${c.code} ${c.name}`}>
                      <span className="tabular-nums mr-1.5">{c.code}</span>{c.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {weaknesses.length > 0 && !enrollmentsLoading && (
          <div className="pt-5 border-t border-border">
            <SubHeader icon={Compass} title="Co dál" subtitle="Kurzy, které rozvíjejí vaše nejslabší kompetence" />
            <CompetenceRecommendations items={recommendations} />
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Accordion value={open ? [ITEM] : []} onValueChange={handleOpenChange}>
        <AccordionItem value={ITEM} className="bg-card rounded-xl shadow-sm border border-border">
          <AccordionTrigger className="items-center gap-3 px-5 py-4 hover:no-underline">
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-bold text-foreground flex items-center gap-2">
                <GraduationCap size={16} className="text-gradient-r shrink-0" aria-hidden />
                Kompetenční profil
              </span>
              <span className="text-xs font-normal text-muted-foreground mt-0.5">{summary}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <p className="text-xs text-muted-foreground mb-4">
              Podle Kompetenčního rámce absolventa učitelství (KRAUU, MŠMT 2023). Vstup je první pretest,
              výstup poslední test modulu nebo kurzu.
            </p>
            {content}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}
