'use client';

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getModule, getCourse, getModules } from "@/lib/api-client";
import type { Module, Course } from "@/api";
import { CheckCircle, BookOpenText, Dumbbell, ClipboardCheck, Lock } from "lucide-react";
import { AiTutorChat } from "@/components/admin/AiTutorChat";
import { Alert, PageSpinner } from "@/components/ui";
import { motion, AnimatePresence } from "motion/react";
import PracticeTab from "@/components/module/PracticeTab";
import AssessmentTab from "@/components/module/AssessmentTab";

type TabType = 'prirucka' | 'procvicovani' | 'test';

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const initialModuleId = Number(slug);

  // Active module ID — driven by client-side state, NOT the URL slug,
  // so the AI mentor stays mounted when switching modules.
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);

  // Data state
  const [module, setModule] = useState<Module | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transition animation
  const [transitioning, setTransitioning] = useState(false);

  // Restore tab progress from sessionStorage
  const storageKey = `module-progress-${initialModuleId}`;
  const savedProgress = (() => {
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  // Tab & handbook navigation
  const [activeTab, setActiveTab] = useState<TabType>(savedProgress?.activeTab ?? 'prirucka');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(savedProgress?.currentBlockIndex ?? 0);
  const [handbookCompleted, setHandbookCompleted] = useState(savedProgress?.handbookCompleted ?? false);
  const [practiceCompleted, setPracticeCompleted] = useState(savedProgress?.practiceCompleted ?? false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Persist tab progress to sessionStorage
  useEffect(() => {
    try {
      const key = `module-progress-${activeModuleId}`;
      sessionStorage.setItem(key, JSON.stringify({
        activeTab,
        currentBlockIndex,
        handbookCompleted,
        practiceCompleted,
      }));
    } catch { /* ignore */ }
  }, [activeModuleId, activeTab, currentBlockIndex, handbookCompleted, practiceCompleted]);

  // Track tab transition direction for animation
  const tabOrder: TabType[] = ['prirucka', 'procvicovani', 'test'];
  const [tabDirection, setTabDirection] = useState(1);

  // Sync URL slug -> activeModuleId only on initial load
  useEffect(() => {
    const id = Number(slug);
    if (!isNaN(id) && id !== activeModuleId) {
      setActiveModuleId(id);
    }
    // Only react to slug changes from URL
  }, [slug]);

  useEffect(() => {
    document.body.classList.add('module-fullscreen');
    return () => document.body.classList.remove('module-fullscreen');
  }, []);

  // Load module data
  const loadModuleData = useCallback(async (modId: number) => {
    try {
      setLoading(true);
      setError(null);
      if (isNaN(modId)) { setError('Modul nebyl nalezen.'); return; }

      const moduleData = await getModule(modId);
      setModule(moduleData);

      const [courseData, modulesData] = await Promise.all([
        getCourse(moduleData.courseId),
        getModules({ courseId: moduleData.courseId }),
      ]);
      setCourse(courseData);
      setAllModules(
        (courseData.modules?.length ? courseData.modules : modulesData)
          .filter(m => m.isActive)
      );
    } catch (err) {
      console.error('Failed to fetch module data:', err);
      setError('Nepodařilo se načíst data modulu.');
    } finally {
      setLoading(false);
      setTransitioning(false);
    }
  }, []);

  useEffect(() => {
    loadModuleData(activeModuleId);
  }, [activeModuleId, loadModuleData]);

  // Hide key concepts sections after content renders
  useEffect(() => {
    if (!contentRef.current) return;
    const elements = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b, p');
    elements.forEach(el => {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (
        text.startsWith('klíčové koncepty') ||
        text.startsWith('klíčové pojmy') ||
        text === 'klíčové koncepty' ||
        text === 'klíčové pojmy' ||
        text === 'key concepts'
      ) {
        (el as HTMLElement).style.display = 'none';
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
          let next = el.nextElementSibling;
          while (next && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(next.tagName)) {
            (next as HTMLElement).style.display = 'none';
            next = next.nextElementSibling;
          }
        }
      }
    });
  }, [currentBlockIndex, activeTab, module]);

  // Navigate to next module without remounting the whole page
  const navigateToModule = useCallback((moduleId: number) => {
    setTransitioning(true);
    setActiveTab('prirucka');
    setCurrentBlockIndex(0);
    setHandbookCompleted(false);
    setPracticeCompleted(false);
    setAssessmentCompleted(false);
    window.history.pushState(null, '', `/modules/${moduleId}`);
    setActiveModuleId(moduleId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Switch tab with direction tracking
  const switchTab = useCallback((newTab: TabType) => {
    const oldIdx = tabOrder.indexOf(activeTab);
    const newIdx = tabOrder.indexOf(newTab);
    setTabDirection(newIdx >= oldIdx ? 1 : -1);
    setActiveTab(newTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Loading state
  if (loading && !transitioning) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F0F0F0' }}>
        <PageSpinner message="Načítání modulu…" />
      </div>
    );
  }

  // Error state
  if (error || !module) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F0F0' }}>
        <div className="w-full max-w-lg px-4">
          <Alert variant="error" title="Nepodařilo se načíst data modulu.">
            {error === 'Nepodařilo se načíst data modulu.'
              ? 'Zkontrolujte, zda jste přihlášeni, a zkuste to znovu.'
              : (error || 'Modul nebyl nalezen.')}
          </Alert>
          <div className="text-center mt-4">
            <Link href="/" className="text-purple-600 hover:underline text-sm">← Zpět na přehled</Link>
          </div>
        </div>
      </div>
    );
  }

  // Computed data
  const learnBlocks = module.learnBlocks ?? [];
  const totalBlocks = learnBlocks.length;
  const currentBlock = learnBlocks[currentBlockIndex];

  const currentIndex = allModules.findIndex(m => m.moduleId === module.moduleId);
  const nextModule = currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null;

  // Handlers
  const handleContinue = () => {
    if (activeTab === 'prirucka') {
      if (currentBlockIndex < totalBlocks - 1) {
        setCurrentBlockIndex((prev: number) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setHandbookCompleted(true);
        switchTab('procvicovani');
      }
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev: number) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Called when user clicks "Dokončit" in PracticeTab
  const handlePracticeComplete = () => {
    setPracticeCompleted(true);
    switchTab('test');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Called when user completes the assessment or needs to move on
  const handleModuleComplete = () => {
    setAssessmentCompleted(true);
    if (nextModule) {
      navigateToModule(nextModule.moduleId);
    } else {
      // Course finished — go to homepage
      router.push('/');
    }
  };

  // Called when assessment fails and module needs restart
  const handleRestartModule = () => {
    setActiveTab('prirucka');
    setCurrentBlockIndex(0);
    setHandbookCompleted(false);
    setPracticeCompleted(false);
    setAssessmentCompleted(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tab configuration
  const tabs: { key: TabType; label: string; sublabel: string; locked?: boolean; completed?: boolean; icon: React.ReactNode }[] = [
    {
      key: 'prirucka',
      label: 'Příručka',
      sublabel: 'učebnice a metodická příručka',
      completed: handbookCompleted,
      icon: <BookOpenText className="w-5 h-5" />,
    },
    {
      key: 'procvicovani',
      label: 'Procvičování',
      sublabel: 'Zkus si svoje znalosti v praxi',
      completed: practiceCompleted,
      locked: !handbookCompleted,
      icon: <Dumbbell className="w-5 h-5" />,
    },
    {
      key: 'test',
      label: 'Test',
      sublabel: 'Ověření znalostí testem',
      completed: assessmentCompleted,
      locked: !practiceCompleted,
      icon: <ClipboardCheck className="w-5 h-5" />,
    },
  ];

  return (
    /* Celé okno modulu je fixed na viewport (mínus globální Header). Žádné
       vnější scrollování — to obstará jen vnitřní content area. */
    <div
      className="flex flex-col"
      style={{ backgroundColor: '#F0F0F0', height: 'calc(100dvh - 70px)' }}
    >
      {/* Breadcrumb — pevná hlavička, nescrolluje. */}
      <div className="px-4 sm:px-6 lg:px-[100px] py-4 flex-shrink-0" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        <p className="text-sm text-gray-500 truncate">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          {' / '}
          <Link href={`/courses/${course?.courseId}`} className="hover:text-gray-700">{course?.title}</Link>
          {' / '}
          <span className="text-gray-700">{module.title}</span>
        </p>
      </div>

      {/* Main Layout — flex-1 + min-h-0 dovolí dětem rozhodnout o vlastním
          scrollu (jinak by min-content sloupců způsobil overflow ven). */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-[100px] pb-4 sm:pb-6" style={{ maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        <div className="flex flex-col lg:flex-row gap-8 h-full min-h-0">

          {/* Left Sidebar — uvnitř fixní kolony se může vlastním overflow-auto
              scrollovat, aby AI tutor a karty modulu nepřetékaly mimo viewport. */}
          <div className="lg:w-72 flex-shrink-0 lg:overflow-y-auto no-scrollbar">
            <div className="space-y-4">
              {/* Module tabs card */}
              <div className="bg-white rounded-lg p-5" style={{ border: '1px solid #e5e7eb' }}>
                <div className="mb-4">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Modul {currentIndex + 1}</span>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">{module.title}</h2>
                </div>

                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        if (!tab.locked) switchTab(tab.key);
                      }}
                      className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3 ${
                        activeTab === tab.key
                          ? 'border'
                          : tab.locked
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50'
                      }`}
                      style={activeTab === tab.key ? { backgroundColor: 'rgba(138, 56, 245, 0.2)', borderColor: 'rgba(138, 56, 245, 0.3)' } : undefined}
                      disabled={tab.locked}
                    >
                      <span className="mt-0.5 text-black">
                        {tab.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : tab.locked ? (
                          <Lock className="w-5 h-5 text-gray-400" />
                        ) : (
                          tab.icon
                        )}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-black">
                          {tab.label}
                        </div>
                        <div className="text-xs text-black" style={{ opacity: 0.5 }}>
                          {tab.sublabel}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI tutor skrytý v assessment tabu*/}
              {activeTab !== 'test' && (
                <AiTutorChat learnBlockId={currentBlock?.learnId} />
              )}
            </div>
          </div>

          {/* Main Content — vlastní scroll na úrovni karty obsahu, aby
              breadcrumb a sidebar zůstaly fixní a posouvalo se jen pole lekce. */}
          <div className="flex-grow min-w-0 lg:h-full lg:overflow-y-auto no-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModuleId}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-white rounded-lg p-6 sm:p-10"
                style={{ border: '1px solid #e5e7eb' }}
              >
                {/* Transition loading overlay */}
                {transitioning && (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Načítání dalšího modulu...</p>
                    </div>
                  </div>
                )}

                {!transitioning && (
                <AnimatePresence mode="wait" custom={tabDirection}>
                  <motion.div
                    key={activeTab}
                    custom={tabDirection}
                    initial={{ opacity: 0, x: tabDirection * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: tabDirection * -40 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >

                {/* Příručka tab */}
                {activeTab === 'prirucka' && (
                  <>
                    {currentBlock ? (
                      <>
                        <div className="mb-6 pb-4 border-b border-gray-100">
                          <span className="text-sm text-gray-500">
                            Stránka {currentBlockIndex + 1} z {totalBlocks}
                          </span>
                        </div>

                        <div
                          ref={contentRef}
                          className="module-content"
                          dangerouslySetInnerHTML={{ __html: currentBlock.content }}
                        />

                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                          <button
                            onClick={handlePrevBlock}
                            disabled={currentBlockIndex === 0}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                              currentBlockIndex === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                            </svg>
                            Předchozí
                          </button>

                          <button
                            onClick={handleContinue}
                            className="inline-flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-md transition-all hover:opacity-90 hover:shadow-md"
                            style={{ backgroundColor: '#00C896' }}
                          >
                            {currentBlockIndex < totalBlocks - 1 ? 'Pokračovat' : 'Dokončit příručku'}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-16 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium">Obsah příručky zatím není k dispozici</p>
                        <p className="text-sm mt-1">Obsah bude brzy doplněn.</p>
                      </div>
                    )}
                  </>
                )}

                {/* Procvičování tab */}
                {activeTab === 'procvicovani' && (
                  <PracticeTab
                    moduleId={activeModuleId}
                    practiceQuestions={module.practiceQuestions ?? []}
                    onComplete={handlePracticeComplete}
                  />
                )}

                {/* Test tab */}
                {activeTab === 'test' && (
                  <AssessmentTab
                    moduleId={activeModuleId}
                    courseId={module.courseId}
                    maxAttempts={module.maxTaskAttempts ?? 3}
                    moduleNumber={currentIndex + 1}
                    moduleTitle={module.title}
                    nextModule={nextModule ? { moduleId: nextModule.moduleId, title: nextModule.title } : null}
                    onModuleComplete={handleModuleComplete}
                    onRestartModule={handleRestartModule}
                  />
                )}

                  </motion.div>
                </AnimatePresence>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
