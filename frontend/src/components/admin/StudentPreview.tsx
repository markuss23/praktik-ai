'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenText,
  Bot,
  CheckCircle,
  ClipboardCheck,
  Dumbbell,
  Eye,
  Lock,
  LogIn,
  Search,
} from 'lucide-react';
import type { Course, Module } from '@/api';
import { Button, CourseCategories, Input, ModuleCategories } from '@/components/ui';
import PaperSheets from '@/components/module/PaperSheets';
import PracticeTab from '@/components/module/PracticeTab';
import { ModuleCompletedCard } from '@/components/module/ModuleCompletedCard';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

// Co náhled z kurzu a modulů potřebuje 
export type PreviewCourse = Pick<Course, 'title' | 'description' | 'krauuCompetences' | 'bloomLevels' | 'crossSubjects'>;
export type PreviewModule = Pick<
  Module,
  'moduleId' | 'title' | 'perex' | 'maxTaskAttempts' | 'learnBlocks' | 'practiceQuestions' | 'neuroPrinciples' | 'krauuCompetences' | 'bloomLevels'
>;

type ModuleTab = 'prirucka' | 'procvicovani' | 'test';

/** Kde náhled začne */
export type PreviewStart =
  | { screen: 'course' }
  | { screen: 'module'; moduleIndex: number; tab: 'prirucka' | 'procvicovani' };

interface ModuleSession {
  tab: ModuleTab;
  blockIndex: number;
  handbookDone: boolean;
  practiceDone: boolean;
  /** Simulované splnění testu */
  testDone: boolean;
}

const freshSession = (tab: ModuleTab = 'prirucka'): ModuleSession => ({
  tab,
  blockIndex: 0,
  handbookDone: tab !== 'prirucka',
  practiceDone: tab === 'test',
  testDone: false,
});

const PAGE_CLASS = 'mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10';

interface StudentPreviewProps {
  course: PreviewCourse;
  modules: PreviewModule[];
  start: PreviewStart;
  onExit: () => void;
}

/**
 * Náhled pro studenta
 */
export function StudentPreview({ course, modules, start, onExit }: StudentPreviewProps) {
  const startIndex = start.screen === 'module' ? Math.min(start.moduleIndex, Math.max(0, modules.length - 1)) : 0;
  const startsInModule = start.screen === 'module' && modules.length > 0;

  const [screen, setScreen] = useState<'course' | 'module'>(startsInModule ? 'module' : 'course');
  const [moduleIndex, setModuleIndex] = useState(startIndex);
  const [session, setSession] = useState<ModuleSession>(() =>
    freshSession(start.screen === 'module' ? start.tab : 'prirucka'),
  );
  // Začátek uprostřed kurzu (z editoru modulu) bere studenta jako zapsaného
  // a předchozí moduly jako splněné — přehled kurzu pak odpovídá situaci.
  const [enrolled, setEnrolled] = useState(startsInModule);
  const [passed, setPassed] = useState<Set<number>>(
    () => new Set(startsInModule ? modules.slice(0, startIndex).map((m) => m.moduleId) : []),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    scrollRef.current?.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  };

  const openModule = (index: number) => {
    setModuleIndex(index);
    setSession(freshSession());
    setScreen('module');
    scrollToTop('auto');
  };

  const openCourse = () => {
    setScreen('course');
    scrollToTop('auto');
  };

  const activeModule = modules[moduleIndex];

  return (
    <div className="flex-1 min-h-0 flex flex-col view-fade-in">
      <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gradient-r/20 bg-gradient-r/10 px-4 sm:px-6 py-2">
        <Eye className="size-4 shrink-0 text-gradient-r" />
        <p className="min-w-0 flex-1 text-xs sm:text-sm text-muted-foreground">
          <span className="font-semibold text-gradient-r">Náhled pro studenta.</span>{' '}
          Takto kurz uvidí student — proklikejte si ho. Úpravy nejsou v náhledu možné a nic se neukládá.
        </p>
        <Button variant="brand-solid" size="sm" onClick={onExit}>
          Zpět k úpravám
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 lg:overflow-y-auto bg-muted">
        {screen === 'module' && activeModule ? (
          <ModuleScreen
            key={activeModule.moduleId}
            courseTitle={course.title}
            module={activeModule}
            moduleIndex={moduleIndex}
            moduleCount={modules.length}
            session={session}
            onSessionChange={setSession}
            onOpenCourse={openCourse}
            onScrollTop={scrollToTop}
            onModulePassed={() => {
              setPassed((prev) => new Set(prev).add(activeModule.moduleId));
              setSession((prev) => ({ ...prev, testDone: true }));
            }}
            onContinue={() => (moduleIndex < modules.length - 1 ? openModule(moduleIndex + 1) : openCourse())}
          />
        ) : (
          <CourseScreen
            course={course}
            modules={modules}
            enrolled={enrolled}
            passed={passed}
            onEnroll={() => setEnrolled(true)}
            onOpenModule={openModule}
          />
        )}
      </div>
    </div>
  );
}

// ── Přehled kurzu (jako /courses/[slug]) ─────────────────────────────────────

interface CourseScreenProps {
  course: PreviewCourse;
  modules: PreviewModule[];
  enrolled: boolean;
  passed: Set<number>;
  onEnroll: () => void;
  onOpenModule: (index: number) => void;
}

function CourseScreen({ course, modules, enrolled, passed, onEnroll, onOpenModule }: CourseScreenProps) {
  const [justEnrolled, setJustEnrolled] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');

  const filteredModules = useMemo(() => {
    const query = moduleSearch.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter(
      (m) => m.title.toLowerCase().includes(query) || (m.perex ?? '').toLowerCase().includes(query),
    );
  }, [modules, moduleSearch]);

  // První nesplněný modul = „Aktuálně studujete".
  const currentModuleIndex = enrolled ? modules.findIndex((m) => !passed.has(m.moduleId)) : -1;

  return (
    <div className="pb-16">
      <div className={cn(PAGE_CLASS, 'py-4')}>
        <p className="text-sm text-muted-foreground">
          Home / kurzy / <span className="text-foreground">{course.title || 'Bez názvu'}</span>
        </p>
      </div>

      <div className={cn(PAGE_CLASS, 'pb-8')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground break-words min-w-0">
            {course.title || 'Bez názvu'}
          </h1>
          <div className="shrink-0">
            {!enrolled ? (
              <Button
                variant="plain"
                onClick={() => {
                  onEnroll();
                  setJustEnrolled(true);
                }}
                className={cn(BTN_KEEP_BOX, 'flex items-center gap-2 px-5 py-2.5 text-primary-foreground rounded-md text-sm font-medium whitespace-nowrap hover:opacity-90')}
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <LogIn className="size-4" />
                Zapsat se do kurzu
              </Button>
            ) : justEnrolled ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-success bg-success/10 border border-success/30 whitespace-nowrap"
              >
                <CheckCircle className="size-4" />
                Zapsáno!
              </motion.div>
            ) : null}
          </div>
        </div>
        {course.description && (
          <p className="text-muted-foreground mt-3 max-w-3xl break-words">{course.description}</p>
        )}
        <CourseCategories course={course} className="mt-5 max-w-3xl" />
      </div>

      {modules.length > 3 && (
        <div className={cn(PAGE_CLASS, 'pb-6')}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Hledat modul…"
              className={cn('h-auto', 'w-full pl-10 pr-4 py-2.5 border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-transparent')}
              style={{ backgroundColor: 'var(--muted)' }}
            />
          </div>
        </div>
      )}

      <div className={PAGE_CLASS}>
        {modules.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 sm:p-10 text-center">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">V tomto kurzu zatím nejsou moduly</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Obsah ještě nebyl vygenerován nebo publikován. Zkuste se vrátit později — nebo se podívejte na další kurzy.
            </p>
          </div>
        ) : filteredModules.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Žádné moduly neodpovídají hledání „{moduleSearch}&quot;
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredModules.map((module) => {
              const index = modules.findIndex((m) => m.moduleId === module.moduleId);
              const isPassed = passed.has(module.moduleId);
              const isCurrent = index === currentModuleIndex;
              const prevPassed = index === 0 || passed.has(modules[index - 1].moduleId);
              const isAccessible = enrolled && prevPassed;
              const isLocked = !isAccessible;

              const card = (
                <div
                  className={cn(
                    'bg-card rounded-lg flex flex-col h-full text-left transition-all duration-300 overflow-hidden',
                    isAccessible && 'hover:shadow-lg',
                    isLocked && 'opacity-60',
                  )}
                  style={{
                    border: isPassed ? '2px solid var(--primary)' : '1px solid var(--border)',
                    padding: '24px',
                    minHeight: '260px',
                  }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Modul {index + 1}</span>
                    {isPassed && (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                        <CheckCircle className="size-4" />
                        Dokončeno
                      </span>
                    )}
                    {isCurrent && !isPassed && (
                      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--gradient-r)' }}>
                        <Eye className="size-4" />
                        Aktuálně studujete
                      </span>
                    )}
                    {isLocked && !isPassed && !isCurrent && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Lock className="size-4" />
                        {!enrolled ? 'Zapište se' : `Splňte modul ${index}`}
                      </span>
                    )}
                  </div>

                  <h3
                    className="text-xl font-bold mb-3 break-words"
                    style={{
                      background: isLocked && !isPassed
                        ? 'var(--muted-foreground)'
                        : 'linear-gradient(90deg, var(--gradient-l), var(--gradient-r))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {module.title || 'Bez názvu'}
                  </h3>
                  {module.perex && (
                    <p className="text-sm text-muted-foreground mb-3 break-words">{module.perex}</p>
                  )}
                  <ModuleCategories module={module} className="mb-3" />

                  <div className="flex items-center justify-between mt-auto pt-2">
                    {isAccessible && !isPassed && (
                      <span
                        className="text-primary-foreground font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2"
                        style={{ backgroundColor: isCurrent ? 'var(--primary)' : 'var(--gradient-r)' }}
                      >
                        <ArrowRight className="size-4" />
                        {isCurrent ? 'Pokračovat' : 'Začít modul'}
                      </span>
                    )}
                    {isPassed && (
                      <span className="font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2 text-success bg-success/10">
                        Opakovat
                      </span>
                    )}
                  </div>
                </div>
              );

              if (isLocked && !isPassed) {
                return (
                  <div key={module.moduleId} className="cursor-not-allowed">
                    {card}
                  </div>
                );
              }
              return (
                <button
                  key={module.moduleId}
                  type="button"
                  onClick={() => onOpenModule(index)}
                  className="block w-full rounded-lg focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {card}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modul (jako /modules/[id]) ───────────────────────────────────────────────

interface ModuleScreenProps {
  courseTitle: string;
  module: PreviewModule;
  moduleIndex: number;
  moduleCount: number;
  session: ModuleSession;
  onSessionChange: React.Dispatch<React.SetStateAction<ModuleSession>>;
  onOpenCourse: () => void;
  onScrollTop: () => void;
  onModulePassed: () => void;
  onContinue: () => void;
}

function ModuleScreen({
  courseTitle,
  module,
  moduleIndex,
  moduleCount,
  session,
  onSessionChange,
  onOpenCourse,
  onScrollTop,
  onModulePassed,
  onContinue,
}: ModuleScreenProps) {
  const learnBlocks = module.learnBlocks ?? [];
  const totalBlocks = learnBlocks.length;
  const currentBlock = learnBlocks[session.blockIndex];
  const isLastModule = moduleIndex >= moduleCount - 1;

  const switchTab = (tab: ModuleTab) => {
    onSessionChange((prev) => ({ ...prev, tab }));
    onScrollTop();
  };

  const handleContinue = () => {
    if (session.blockIndex < totalBlocks - 1) {
      onSessionChange((prev) => ({ ...prev, blockIndex: prev.blockIndex + 1 }));
      onScrollTop();
    } else {
      onSessionChange((prev) => ({ ...prev, handbookDone: true, tab: 'procvicovani' }));
      onScrollTop();
    }
  };

  const tabs: { key: ModuleTab; label: string; sublabel: string; locked?: boolean; completed?: boolean; icon: React.ReactNode }[] = [
    {
      key: 'prirucka',
      label: 'Příručka',
      sublabel: 'učebnice a metodická příručka',
      completed: session.handbookDone,
      icon: <BookOpenText className="size-5" />,
    },
    {
      key: 'procvicovani',
      label: 'Procvičování',
      sublabel: 'Zkus si svoje znalosti v praxi',
      completed: session.practiceDone,
      locked: !session.handbookDone,
      icon: <Dumbbell className="size-5" />,
    },
    {
      key: 'test',
      label: 'Test',
      sublabel: 'Ověření znalostí testem',
      completed: session.testDone,
      locked: !session.practiceDone,
      icon: <ClipboardCheck className="size-5" />,
    },
  ];

  return (
    <div className="pb-6">
      <div className={cn(PAGE_CLASS, 'py-4')}>
        <p className="text-sm text-muted-foreground truncate">
          Home /{' '}
          <Button
            variant="plain"
            type="button"
            onClick={onOpenCourse}
            className={cn(BTN_KEEP_BOX, 'inline p-0 align-baseline text-sm font-normal text-muted-foreground hover:text-foreground hover:underline')}
          >
            {courseTitle || 'Kurz'}
          </Button>{' '}
          / <span className="text-foreground">{module.title || 'Bez názvu'}</span>
        </p>
      </div>

      <div className={PAGE_CLASS}>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-72 shrink-0">
            <div className="space-y-4 lg:sticky lg:top-4">
              <div className="bg-card rounded-lg p-5" style={{ border: '1px solid var(--border)' }}>
                <div className="mb-4">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modul {moduleIndex + 1}</span>
                  <h2 className="text-lg font-bold text-foreground mt-1">{module.title || 'Bez názvu'}</h2>
                  {module.perex && <p className="text-sm text-muted-foreground mt-2 break-words">{module.perex}</p>}
                </div>

                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <Button
                      variant="plain"
                      key={tab.key}
                      onClick={() => {
                        if (!tab.locked) switchTab(tab.key);
                      }}
                      className={cn(BTN_KEEP_BOX, `w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3 ${
                        session.tab === tab.key
                          ? 'border'
                          : tab.locked
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-muted/50'
                      }`)}
                      style={session.tab === tab.key ? { backgroundColor: 'rgba(138, 56, 245, 0.2)', borderColor: 'rgba(138, 56, 245, 0.3)' } : undefined}
                      disabled={tab.locked}
                    >
                      <span className="mt-0.5 text-foreground">
                        {tab.completed ? (
                          <CheckCircle className="size-5 text-success" />
                        ) : tab.locked ? (
                          <Lock className="size-5 text-muted-foreground" />
                        ) : (
                          tab.icon
                        )}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{tab.label}</div>
                        <div className="text-xs text-foreground" style={{ opacity: 0.5 }}>{tab.sublabel}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                <ModuleCategories module={module} className="mt-4 pt-4 border-t border-border" />
              </div>

              {/* AI tutor — ve skutečném modulu se tu student ptá AI na obsah;
                  náhled ho nevolá, aby nic nezapisoval. */}
              {session.tab !== 'test' && (
                <div className="bg-card rounded-lg border border-dashed border-border p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-gradient-r" />
                    <span className="font-semibold text-foreground text-sm">AI Tutor</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tady se student může doptat AI na obsah příručky. V náhledu je tutor vypnutý.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grow min-w-0 pb-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={session.tab}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={session.tab === 'prirucka' ? 'rounded-lg' : 'bg-card rounded-lg p-6 sm:p-10'}
                style={session.tab === 'prirucka' ? undefined : { border: '1px solid var(--border)' }}
              >
                {session.tab === 'prirucka' && (
                  currentBlock ? (
                    <>
                      {totalBlocks > 1 && (
                        <div className="mb-4">
                          <span className="text-sm text-muted-foreground">
                            Část {session.blockIndex + 1} z {totalBlocks}
                          </span>
                        </div>
                      )}
                      <PaperSheets html={currentBlock.content} />
                      <div className="flex items-center justify-between mt-6 sm:mt-8 pt-6">
                        <Button
                          variant="plain"
                          onClick={() => {
                            if (session.blockIndex === 0) return;
                            onSessionChange((prev) => ({ ...prev, blockIndex: prev.blockIndex - 1 }));
                            onScrollTop();
                          }}
                          disabled={session.blockIndex === 0}
                          className={cn(BTN_KEEP_BOX, `inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                            session.blockIndex === 0
                              ? 'text-muted-foreground cursor-not-allowed'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`)}
                        >
                          <ArrowLeft className="size-4" />
                          Předchozí
                        </Button>
                        <Button
                          variant="plain"
                          onClick={handleContinue}
                          className={cn(BTN_KEEP_BOX, 'inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md')}
                          style={{ backgroundColor: 'var(--primary)' }}
                        >
                          {session.blockIndex < totalBlocks - 1 ? 'Pokračovat' : 'Dokončit příručku'}
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <BookOpenText className="size-16 mx-auto mb-4 text-muted-foreground" strokeWidth={1.25} />
                      <p className="text-lg font-medium">Obsah příručky zatím není k dispozici</p>
                      <p className="text-sm mt-1">Obsah bude brzy doplněn.</p>
                    </div>
                  )
                )}

                {session.tab === 'procvicovani' && (
                  <PracticeTab
                    preview
                    moduleId={module.moduleId}
                    practiceQuestions={module.practiceQuestions ?? []}
                    onComplete={() => {
                      onSessionChange((prev) => ({ ...prev, practiceDone: true, tab: 'test' }));
                      onScrollTop();
                    }}
                  />
                )}

                {session.tab === 'test' && (
                  session.testDone ? (
                    <ModuleCompletedCard
                      moduleNumber={moduleIndex + 1}
                      moduleTitle={module.title}
                      ctaLabel={isLastModule ? 'Zpět na kurz' : 'Pokračovat na další modul'}
                      onContinue={onContinue}
                    />
                  ) : (
                    <div className="text-center py-6">
                      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-r/10">
                        <ClipboardCheck className="size-8 text-gradient-r" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">Test</h3>
                      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                        Ve skutečném kurzu tady student dostane test, který AI sestaví z obsahu modulu,
                        a jeho odpovědi AI vyhodnotí (nejvýše {module.maxTaskAttempts ?? 3} pokusy, k úspěchu je potřeba 75 %).
                        V náhledu se test negeneruje.
                      </p>
                      <Button
                        variant="plain"
                        onClick={onModulePassed}
                        className={cn(BTN_KEEP_BOX, 'mt-6 inline-flex items-center gap-2 text-primary-foreground font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90')}
                        style={{ backgroundColor: 'var(--gradient-r)' }}
                      >
                        <CheckCircle className="size-4" />
                        Simulovat splnění testu
                      </Button>
                    </div>
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentPreview;
