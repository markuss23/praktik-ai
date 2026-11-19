import {
  Difficulty,
  QuestionType,
  Status,
  type Course,
  type CourseBlock,
  type CourseSubject,
  type CourseTarget,
  type LearnBlock,
  type Module,
  type ModuleCompletionStatus,
  type PracticeQuestion,
} from "@/api";
import type { MyEnrollmentExtended } from "@/lib/api-client";

/**
 * Ukázkové kurzy jen pro vývoj. Když lokálně neběží backend, katalog kurzů
 * (`CourseCatalog`, scope „all") se jimi vyplní, aby šlo ladit karty i řádky.
 * V produkčním buildu se nepoužijí — katalog na ně sahá jen mimo `production`.
 */

const base = { ownerId: 1, isActive: true, isPublished: true, status: Status.Approved };

// Číselníky podle seedu (backend/api/seed.py, migrace 0005) — ať jdou na /kurzy
// zkoušet filtry Kategorie / Téma / Cílová skupina. Obor mají jen kurzy bloku C.
const BLOCKS = {
  kontext: { blockId: 1, code: "blok.a", name: "Kontext", description: "Porozumění principům AI" },
  transformace: { blockId: 2, code: "blok.b", name: "Transformace", description: "Redesign výuky a hodnocení" },
  aplikace: { blockId: 3, code: "blok.c", name: "Aplikace", description: "Oborové kurzy" },
} satisfies Record<string, CourseBlock>;

const TARGETS = {
  akademik: { targetId: 1, code: "target.a", name: "Akademik", description: "Vysokoškolský" },
  student: { targetId: 2, code: "target.s", name: "Student", description: "Student učitelství" },
  mentor: { targetId: 3, code: "target.m", name: "Mentor", description: "Fakultní učitel" },
} satisfies Record<string, CourseTarget>;

const SUBJECTS = {
  anglictina: { subjectId: 3, code: "obor.03", name: "Angličtina" },
  primarni: { subjectId: 5, code: "obor.05", name: "Primární vzdělávání" },
  dejepis: { subjectId: 10, code: "obor.10", name: "Dějepis" },
  spolecenskeVedy: { subjectId: 11, code: "obor.11", name: "Společenské vědy" },
} satisfies Record<string, CourseSubject>;

function categories(block: CourseBlock, target: CourseTarget, subject?: CourseSubject) {
  return {
    courseBlockId: block.blockId,
    courseBlock: block,
    courseTargetId: target.targetId,
    courseTarget: target,
    courseSubjectId: subject?.subjectId ?? null,
    courseSubject: subject ?? null,
  };
}

export const MOCK_COURSES: Course[] = [
  {
    ...base,
    ...categories(BLOCKS.kontext, TARGETS.student),
    courseId: 9001,
    enrollmentsCount: 48,
    title: "Úvod do generativní AI ve výuce",
    description: "Co generativní AI umí, kde selhává a jak ji bezpečně zapojit do běžné vyučovací hodiny.",
    durationMinutes: 90,
    difficulty: Difficulty.Beginner,
    modulesCount: 6,
  },
  {
    ...base,
    ...categories(BLOCKS.transformace, TARGETS.akademik),
    courseId: 9002,
    enrollmentsCount: 63,
    title: "Prompt engineering pro učitele",
    description: "Jak psát zadání, aby AI vracela použitelné podklady — od přípravy hodiny po zpětnou vazbu žákům.",
    durationMinutes: 75,
    difficulty: Difficulty.SlightlyAdvanced,
    modulesCount: 5,
  },
  {
    ...base,
    ...categories(BLOCKS.transformace, TARGETS.mentor),
    courseId: 9003,
    enrollmentsCount: 31,
    title: "AI a hodnocení žáků",
    description: "Formativní hodnocení s pomocí AI: rubriky, komentáře k úlohám a hlídání férovosti.",
    durationMinutes: 60,
    difficulty: Difficulty.Intermediate,
    modulesCount: 4,
  },
  {
    ...base,
    ...categories(BLOCKS.aplikace, TARGETS.student, SUBJECTS.primarni),
    courseId: 9004,
    enrollmentsCount: 22,
    title: "Tvorba výukových materiálů s AI",
    description: "Pracovní listy, kvízy a diferencované úlohy během pár minut — a jak je po AI zkontrolovat.",
    durationMinutes: 120,
    difficulty: Difficulty.Beginner,
    modulesCount: 7,
  },
  {
    ...base,
    ...categories(BLOCKS.kontext, TARGETS.akademik),
    courseId: 9005,
    enrollmentsCount: 57,
    title: "Etika a bezpečnost AI ve škole",
    description: "Ochrana osobních údajů, autorství a akademická integrita v době jazykových modelů.",
    durationMinutes: 45,
    difficulty: Difficulty.CompleteBeginner,
    modulesCount: 3,
  },
  {
    ...base,
    ...categories(BLOCKS.aplikace, TARGETS.mentor, SUBJECTS.anglictina),
    courseId: 9006,
    enrollmentsCount: 14,
    title: "Personalizace výuky pomocí AI",
    description: "Přizpůsobte tempo a náročnost úloh každému žákovi, aniž byste psali šest verzí testu.",
    durationMinutes: 100,
    difficulty: Difficulty.Intermediate,
    modulesCount: 6,
  },
  {
    ...base,
    ...categories(BLOCKS.aplikace, TARGETS.akademik, SUBJECTS.spolecenskeVedy),
    courseId: 9007,
    enrollmentsCount: 9,
    title: "Data a analytika v pedagogické praxi",
    description: "Čtení studijních dat, reporty o pokroku třídy a rozhodování podložené čísly.",
    durationMinutes: 80,
    difficulty: Difficulty.Advanced,
    modulesCount: 5,
  },
  {
    ...base,
    ...categories(BLOCKS.transformace, TARGETS.student),
    courseId: 9008,
    enrollmentsCount: 26,
    title: "AI tutor: jak ho zapojit do hodiny",
    description: "Scénáře hodin s AI tutorem, role učitele a jak poznat, že tutor žákovi opravdu pomáhá.",
    durationMinutes: 50,
    difficulty: Difficulty.Beginner,
    modulesCount: 4,
  },
  {
    ...base,
    ...categories(BLOCKS.aplikace, TARGETS.mentor, SUBJECTS.dejepis),
    courseId: 9009,
    enrollmentsCount: 18,
    title: "Kritické myšlení v době AI",
    description: "Ověřování zdrojů, halucinace modelů a úlohy, které učí žáky AI nevěřit naslepo.",
    durationMinutes: 70,
    difficulty: Difficulty.SlightlyAdvanced,
    modulesCount: 5,
  },
];

/** Průběh u vybraných ukázek, ať jsou vidět všechny stavy karty i řádku. */
export const MOCK_PROGRESS: Record<number, { completedModules: number; completed?: boolean }> = {
  9001: { completedModules: 2 },
  9003: { completedModules: 4, completed: true },
  9006: { completedModules: 1 },
};

/** Fulltext nad ukázkami — ať v nich funguje i vyhledávání ve filtru. */
export function filterMockCourses(textSearch?: string): Course[] {
  const q = textSearch?.trim().toLocaleLowerCase("cs");
  if (!q) return MOCK_COURSES;
  return MOCK_COURSES.filter((c) =>
    `${c.title} ${c.description ?? ""}`.toLocaleLowerCase("cs").includes(q),
  );
}

// ---------------------------------------------------------------------------
// Detail kurzu (/courses/[id]) — moduly, zápis a průběh pro ukázkové kurzy,
// aby šel detail otevřít i bez backendu (proklik z karty na /kurzy).
// ---------------------------------------------------------------------------

// Číselníky podle seedu (backend/api/seed.py) — jen pár položek pro štítky.
const NP = {
  elaborace: { principleId: 8, code: "NP-08", name: "Elaborativní kódování", description: "Propojení nové informace s existujícími znalostmi tvoří síť asociací" },
  generovani: { principleId: 9, code: "NP-09", name: "Efekt generování", description: "Sám vytvořená informace se pamatuje lépe než pasivně přijatá" },
  predikce: { principleId: 11, code: "NP-11", name: "Predikční chyba", description: "Dopaminový systém reaguje na rozdíl mezi očekáváním a realitou" },
  zatez: { principleId: 7, code: "NP-07", name: "Kognitivní zátěž", description: "Pracovní paměť má kapacitu cca 4 ± 1 prvků; přetížení blokuje učení" },
  zpetnaVazba: { principleId: 18, code: "NP-18", name: "Okamžitá zpětná vazba", description: "Rychlá konkrétní zpětná vazba umožní opravit chybu dřív než se zafixuje" },
  metakognice: { principleId: 15, code: "NP-15", name: "Metakognice", description: "Schopnost přemýšlet o vlastním myšlení a sledovat porozumění" },
  obtize: { principleId: 4, code: "NP-04", name: "Žádoucí obtíže", description: "Mírná obtížnost a kognitivní zápas prohlubují zpracování a transfer" },
};

const KRAUU = {
  obor: { krauuId: 7, parentId: 1, code: "1.1", name: "Rozumí vyučovaným oborům a rozvíjí se v nich", description: "Učitel/ka rozumí oborům, které vyučuje, a systematicky se v nich rozvíjí." },
  didaktika: { krauuId: 8, parentId: 1, code: "1.2", name: "Didakticky zprostředkovává obsah žákům", description: "Zprostředkovává obsah žákům v souladu s jejich vzdělávacími potřebami." },
  cile: { krauuId: 9, parentId: 2, code: "2.1", name: "Nastavuje cíle výuky", description: "Stanovuje srozumitelné cíle a vede k jejich nastavování i žáky." },
  planovani: { krauuId: 10, parentId: 2, code: "2.2", name: "Poznává vzdělávací potřeby a plánuje výuku", description: "Plánuje výuku tak, aby každý žák mohl aktivně dosahovat cílů." },
  reflexe: { krauuId: 13, parentId: 2, code: "2.5", name: "Reflektuje výuku", description: "Reflektuje vlastní výuku a vyhodnocuje dosahování cílů." },
  bezpeci: { krauuId: 14, parentId: 3, code: "3.1", name: "Vytváří bezpečné prostředí pro učení", description: "Vytváří fyzicky i psychicky bezpečné prostředí pro učení." },
  zpetnaVazba: { krauuId: 18, parentId: 4, code: "4.2", name: "Poskytuje a přijímá zpětnou vazbu", description: "Poskytuje žákům konstruktivní zpětnou vazbu a sám přijímá ZV od žáků." },
  reflexeZaku: { krauuId: 19, parentId: 4, code: "4.3", name: "Vede žáky k reflexi jejich učení", description: "Vede žáky k reflexi vlastního učení a samostatné metakognici." },
  informace: { krauuId: 23, parentId: 6, code: "6.2", name: "Odpovědná práce s informacemi a demokratické hodnoty", description: "Odpovědně pracuje s informacemi a digitálními nástroji, vede k etice." },
};

const BLOOM = {
  zapamatovat: { bloomId: 1, code: "1", name: "Zapamatovat", description: "vyjmenuje, popíše, identifikuje, rozpozná, zopakuje" },
  porozumet: { bloomId: 2, code: "2", name: "Porozumět", description: "vysvětlí, shrne, klasifikuje, interpretuje, přeloží" },
  aplikovat: { bloomId: 3, code: "3", name: "Aplikovat", description: "použije, provede, řeší, demonstruje, implementuje" },
  analyzovat: { bloomId: 4, code: "4", name: "Analyzovat", description: "porovná, rozliší, zhodnotí strukturu, rozloží, prozkoumá" },
  hodnotit: { bloomId: 5, code: "5", name: "Hodnotit", description: "posoudí, obhájí, kriticky zhodnotí, doporučí, zdůvodní" },
  tvorit: { bloomId: 6, code: "6", name: "Tvořit", description: "navrhne, sestaví, vytvoří, zkonstruuje, naplánuje" },
};

/** Štítky v hlavičce detailu — u všech ukázkových kurzů stejné. */
const MOCK_COURSE_TAGS = {
  krauuCompetences: [KRAUU.didaktika, KRAUU.planovani, KRAUU.informace],
  bloomLevels: [BLOOM.porozumet, BLOOM.aplikovat, BLOOM.hodnotit],
  crossSubjects: [
    { crossId: 1, code: "O01", name: "AI gramotnost – technický základ", description: "Jak fungují jazykové modely, tokeny, kontextové okno, pravděpodobnostní povaha výstupu." },
    { crossId: 2, code: "O02", name: "AI gramotnost – kritické posuzování výstupů", description: "Rozpoznávání halucinací, ověřování faktů, srovnávání nástrojů a výstupů." },
  ],
};

type MockModuleContent = Required<Pick<Module, "title" | "perex" | "neuroPrinciples" | "krauuCompetences" | "bloomLevels">>;

/**
 * Zásobník modulů — kurz si vezme prvních `modulesCount`. Modul 6 má dlouhý
 * název a modul 7 je bez perexu a štítků, ať jsou vidět i krajní stavy karty.
 */
const MOCK_MODULE_POOL: MockModuleContent[] = [
  {
    title: "Jak AI vlastně funguje",
    perex: "Jazykové modely bez mýtů: tokeny, pravděpodobnost a proč AI někdy sebevědomě chybuje.",
    neuroPrinciples: [NP.elaborace],
    krauuCompetences: [KRAUU.obor],
    bloomLevels: [BLOOM.zapamatovat, BLOOM.porozumet],
  },
  {
    title: "První prompt a co z něj dostanete",
    perex: "Napíšete první zadání, porovnáte výstupy a naučíte se je postupně zpřesňovat.",
    neuroPrinciples: [NP.generovani],
    krauuCompetences: [KRAUU.didaktika],
    bloomLevels: [BLOOM.aplikovat],
  },
  {
    title: "Ověřování výstupů a halucinace",
    perex: "Jak rychle poznat vymyšlený fakt nebo zdroj a co s tím dělat ve třídě.",
    neuroPrinciples: [NP.predikce],
    krauuCompetences: [KRAUU.informace],
    bloomLevels: [BLOOM.analyzovat, BLOOM.hodnotit],
  },
  {
    title: "AI při přípravě hodiny",
    perex: "Od cílů hodiny po aktivity: kde AI ušetří čas a kde je potřeba vlastní úsudek.",
    neuroPrinciples: [NP.zatez],
    krauuCompetences: [KRAUU.cile, KRAUU.planovani],
    bloomLevels: [BLOOM.aplikovat, BLOOM.tvorit],
  },
  {
    title: "Zpětná vazba žákům s pomocí AI",
    perex: "Komentáře k úlohám, které jsou konkrétní, rychlé a pořád vaše.",
    neuroPrinciples: [NP.zpetnaVazba],
    krauuCompetences: [KRAUU.zpetnaVazba],
    bloomLevels: [BLOOM.aplikovat, BLOOM.hodnotit],
  },
  {
    title: "Bezpečnost, ochrana osobních údajů a akademická integrita při práci s jazykovými modely ve třídě",
    perex: "Co do chatu nepatří, jak nastavit pravidla pro žáky a jak mluvit o autorství textů, které vznikly s pomocí AI.",
    neuroPrinciples: [NP.metakognice],
    krauuCompetences: [KRAUU.bezpeci, KRAUU.informace],
    bloomLevels: [BLOOM.hodnotit],
  },
  {
    title: "Reflexe a další kroky",
    perex: "",
    neuroPrinciples: [],
    krauuCompetences: [],
    bloomLevels: [],
  },
  {
    title: "Závěrečný projekt",
    perex: "Navrhnete vlastní hodinu s AI, vyzkoušíte ji a zhodnotíte, co fungovalo.",
    neuroPrinciples: [NP.obtize],
    krauuCompetences: [KRAUU.reflexe, KRAUU.reflexeZaku],
    bloomLevels: [BLOOM.tvorit],
  },
];

const MOCK_DATE = new Date("2026-09-01T08:00:00Z");

export interface MockCourseDetail {
  course: Course;
  modules: Module[];
  /** Zápis podle `MOCK_PROGRESS`; ostatní ukázky jsou „nezapsané". */
  enrollment: MyEnrollmentExtended | null;
  progress: ModuleCompletionStatus[];
}

/**
 * Data detailu pro ukázkový kurz (9001–9009), jinak `null`. Stavy:
 * 9001 a 9006 rozpracované, 9003 dokončený, ostatní nezapsané (moduly zamčené).
 */
export function getMockCourseDetail(courseId: number): MockCourseDetail | null {
  const course = MOCK_COURSES.find((c) => c.courseId === courseId);
  if (!course) return null;

  const modules: Module[] = MOCK_MODULE_POOL.slice(0, course.modulesCount ?? 0).map((content, i) => ({
    ...content,
    neuroPrincipleIds: content.neuroPrinciples.map((p) => p.principleId),
    moduleId: courseId * 100 + i + 1,
    courseId,
    maxTaskAttempts: 3,
    isActive: true,
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
    learnBlocks: mockLearnBlocks(courseId * 100 + i + 1, content),
    practiceQuestions: mockPracticeQuestions(courseId * 100 + i + 1),
  }));

  const state = MOCK_PROGRESS[courseId];
  const passed = state ? modules.slice(0, state.completedModules) : [];
  const next = state && !state.completed ? modules[state.completedModules] : undefined;

  return {
    course: { ...course, ...MOCK_COURSE_TAGS },
    modules,
    enrollment: state
      ? {
          enrollmentId: courseId,
          courseId,
          course: { courseId, title: course.title, description: course.description, modulesCount: modules.length },
          completedModules: passed.length,
          totalModules: modules.length,
          enrolledAt: MOCK_DATE,
          completedAt: state.completed ? MOCK_DATE : null,
          nextModule: next
            ? { moduleId: next.moduleId, title: next.title, index: state.completedModules + 1, total: modules.length }
            : null,
          lastVisitedModuleId: next?.moduleId ?? null,
          lastActivityAt: MOCK_DATE,
        }
      : null,
    progress: passed.map((m, i) => ({
      moduleId: m.moduleId,
      passed: true,
      score: 82 + i * 4,
      courseCompleted: !!state?.completed,
      taskSessionStatus: null,
      attemptsUsed: 1,
      maxAttempts: 3,
      passingScore: 75,
    })),
  };
}

export interface MockModuleDetail {
  module: Module;
  /** Kurz včetně modulů — jako `getCourse` (drobečky a „další modul"). */
  course: Course & { modules: Module[] };
  progress: ModuleCompletionStatus[];
}

/**
 * Data detailu modulu pro ukázkový kurz, jinak `null`. ID modulu je
 * `kurz * 100 + pořadí` — 900101 je první modul kurzu 9001. Splněné moduly
 * (podle `MOCK_PROGRESS`) mají rovnou odemčené všechny záložky.
 */
export function getMockModuleDetail(moduleId: number): MockModuleDetail | null {
  const detail = getMockCourseDetail(Math.floor(moduleId / 100));
  const mod = detail?.modules.find((m) => m.moduleId === moduleId);
  if (!detail || !mod) return null;
  return { module: mod, course: { ...detail.course, modules: detail.modules }, progress: detail.progress };
}

/**
 * Příručka ve dvou blocích; první má `<hr>` = dva listy. Obsah je pro všechny
 * moduly stejný (mění se nadpis a perex) a schválně sahá na všechny styly
 * `.module-content` — nadpisy, seznamy, citaci, tabulku, upozornění a příklady.
 * Pozor: nadpisy „Klíčové pojmy/koncepty" stránka modulu skrývá, proto tu nejsou.
 */
function mockLearnBlocks(moduleId: number, content: Pick<Module, "title" | "perex">): LearnBlock[] {
  const perex =
    content.perex ||
    "Krátké shrnutí toho, co se v modulu naučíte a proč se vám to bude ve třídě hodit.";

  return [
    {
      learnId: moduleId * 10 + 1,
      moduleId,
      title: "Úvod",
      content: `
<h1>${content.title}</h1>
<p>${perex}</p>
<div class="alert-info"><p><strong>Cíl modulu:</strong> po dokončení umíte látku vysvětlit kolegovi a použít ji při přípravě vlastní hodiny.</p></div>
<h2>Proč na tom záleží</h2>
<p>Nástroje s umělou inteligencí už žáci používají — doma i ve škole. Učitel, který rozumí jejich silným a slabým stránkám, je může <strong>vědomě zapojit</strong> do výuky místo toho, aby je jen zakazoval.</p>
<ul>
  <li>ušetříte čas při rutinní přípravě materiálů,</li>
  <li>poznáte, kdy výstupu nevěřit,</li>
  <li>naučíte žáky s AI pracovat kriticky a bezpečně.</li>
</ul>
<blockquote><p>„AI nenahradí učitele. Učitelé, kteří AI používají, ale nahradí ty, kteří ji nepoužívají.“</p></blockquote>
<hr>
<h2>Pojmy, se kterými budeme pracovat</h2>
<table>
  <thead><tr><th>Pojem</th><th>Co znamená</th><th>Příklad ze třídy</th></tr></thead>
  <tbody>
    <tr><td>Prompt</td><td>Zadání, které modelu napíšete</td><td>„Vytvoř 5 otázek k textu o fotosyntéze pro 7. třídu.“</td></tr>
    <tr><td>Halucinace</td><td>Sebevědomě podaný, ale vymyšlený údaj</td><td>Neexistující kniha uvedená jako zdroj</td></tr>
    <tr><td>Kontext</td><td>Informace, které model při odpovědi bere v úvahu</td><td>Ročník, cíl hodiny, úroveň žáků</td></tr>
  </tbody>
</table>
<h3>Jak budeme postupovat</h3>
<ol>
  <li>Projdete si příručku a vyzkoušíte příklady.</li>
  <li>V procvičování si ověříte, co jste pochopili.</li>
  <li>V testu odpovíte na otázku z praxe — hodnotí ji AI tutor.</li>
</ol>`,
    },
    {
      learnId: moduleId * 10 + 2,
      moduleId,
      title: "Do praxe",
      content: `
<h2>Jak to vypadá ve třídě</h2>
<p>Rozdíl mezi užitečnou a bezcennou odpovědí je většinou v zadání. Čím víc kontextu modelu dáte, tím méně budete výstup přepisovat.</p>
<div class="example-bad"><p><strong>Takhle ne:</strong> „Napiš mi hodinu o fotosyntéze.“</p></div>
<div class="example-good"><p><strong>Takhle ano:</strong> „Navrhni 45minutovou hodinu o fotosyntéze pro 7. třídu. Žáci znají stavbu buňky. Chci jednu skupinovou aktivitu a krátké ověření na konci.“</p></div>
<div class="alert-warning"><p><strong>Pozor:</strong> do chatu nikdy nevkládejte jména žáků, známky ani jiné osobní údaje.</p></div>
<h3>Shrnutí</h3>
<ul>
  <li>Dávejte modelu kontext: ročník, cíl, čas a co žáci už umí.</li>
  <li>Výstup vždy zkontrolujte — za obsah hodiny odpovídáte vy.</li>
  <li>Fakta a zdroje ověřujte v nezávislém zdroji.</li>
</ul>`,
    },
  ];
}

/** Statické procvičování (vyhodnocuje se v prohlížeči): dvě uzavřené a jedna otevřená otázka. */
function mockPracticeQuestions(moduleId: number): PracticeQuestion[] {
  const closed = (n: number, question: string, options: string[], correct: number): PracticeQuestion => {
    const questionId = moduleId * 10 + n;
    return {
      questionId,
      moduleId,
      questionType: QuestionType.Closed,
      question,
      correctAnswer: options[correct],
      closedOptions: options.map((text, i) => ({ optionId: questionId * 10 + i + 1, questionId, text })),
    };
  };

  return [
    closed(
      1,
      "Co jazykový model dělá, když generuje odpověď?",
      [
        "Vyhledá odpověď v databázi ověřených faktů",
        "Předpovídá nejpravděpodobnější pokračování textu",
        "Pokaždé prohledá internet a shrne výsledky",
      ],
      1,
    ),
    closed(
      2,
      "Žák odevzdá práci, která zjevně vznikla s pomocí AI. Jaký je nejvhodnější první krok?",
      [
        "Rovnou ji ohodnotit nedostatečně",
        "Promluvit si s ním o postupu a o tom, co se při práci naučil",
        "Zakázat AI celé třídě",
      ],
      1,
    ),
    {
      questionId: moduleId * 10 + 3,
      moduleId,
      questionType: QuestionType.Open,
      question: "Jak byste ověřili fakt, který vám AI uvedla v podkladech na hodinu?",
      exampleAnswer: "Dohledám ho v nezávislém zdroji, například v učebnici nebo na odborném webu, a porovnám údaje.",
      openKeywords: ["zdroj", "ověř", "porovn"].map((keyword, i) => ({
        keywordId: moduleId * 100 + i + 1,
        questionId: moduleId * 10 + 3,
        keyword,
      })),
    },
  ];
}
