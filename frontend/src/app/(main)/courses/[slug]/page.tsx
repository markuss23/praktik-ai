'use client';

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCourse, getModules, getMyEnrollments, createEnrollment, leaveEnrollment, getCourseProgress } from "@/lib/api-client";
import type { Course, Module, MyEnrollment, ModuleCompletionStatus } from "@/api";
import { BookOpen, Lock, LogIn, CheckCircle, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CourseDetailSkeleton } from "@/components/ui";
import { motion, AnimatePresence } from "motion/react";

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const courseId = Number(slug);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentUser } = useCurrentUser();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  // Tři nezávislé loadery: kurz (s moduly), autentizace, uživatelská data
  // (zápis + progress modulů). UI se zobrazí, až jsou všechny vyřízené —
  // jinak by uživatel viděl problesknout „Zapsat se" stav, než se načte
  // skutečný zápis.
  const [courseLoading, setCourseLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<MyEnrollment | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [moduleProgress, setModuleProgress] = useState<ModuleCompletionStatus[]>([]);
  const [moduleSearch, setModuleSearch] = useState('');
  // Track that enrollment just happened so we can animate the transition
  const [justEnrolled, setJustEnrolled] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setCourseLoading(true);
        setError(null);

        if (isNaN(courseId)) {
          setError('Kurz nebyl nalezen.');
          return;
        }

        // Fetch course first — its response already includes modules
        const courseData = await getCourse(courseId);
        setCourse(courseData);

        let modulesList = courseData.modules ?? [];
        // Fallback: fetch modules separately only if course didn't include them
        if (modulesList.length === 0) {
          try {
            modulesList = await getModules({ courseId });
          } catch {
            // getModules may require auth — ignore for unauthenticated users
            modulesList = [];
          }
        }
        setModules(modulesList.filter(m => m.isActive));
      } catch (err) {
        console.error('Failed to fetch course data:', err);
        setError('Nepodařilo se načíst data kurzu.');
      } finally {
        setCourseLoading(false);
      }
    }
    load();
  }, [courseId]);

  useEffect(() => {
    // Počkej, než useAuth vyřeší stav přihlášení.
    if (authLoading) return;

    if (!isAuthenticated) {
      // Nepřihlášený uživatel — nečekáme na žádné další API volání,
      // ale nastavíme prázdný stav, aby render nezůstal v loadingu.
      setEnrollment(null);
      setModuleProgress([]);
      setEnrollmentLoading(false);
      return;
    }

    let cancelled = false;
    setEnrollmentLoading(true);
    Promise.all([
      getMyEnrollments()
        .then(enrollments => {
          if (cancelled) return;
          const found = enrollments.find(e => e.courseId === courseId);
          if (found?.completedAt) {
            // Course already completed — redirect to homepage
            router.replace('/');
            return;
          }
          setEnrollment(found ?? null);
        })
        .catch(() => {
          if (!cancelled) setEnrollment(null);
        }),
      getCourseProgress(courseId)
        .then(p => { if (!cancelled) setModuleProgress(p); })
        .catch(() => { if (!cancelled) setModuleProgress([]); }),
    ]).finally(() => {
      if (!cancelled) setEnrollmentLoading(false);
    });

    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, courseId, router]);

  // Hlavní loading flag — dokud jeden ze zdrojů nebyl vyřešen, UI se nerenderuje.
  // Tím se eliminuje flicker mezi „Zapsat se" stavem a skutečným zápisem.
  const loading = authLoading || courseLoading || enrollmentLoading;

  const handleEnroll = async () => {
    if (!currentUser) return;
    setEnrollLoading(true);
    try {
      await createEnrollment(currentUser.userId, courseId);
      const [enrollments] = await Promise.all([
        getMyEnrollments(),
        getCourseProgress(courseId).then(setModuleProgress).catch(() => {}),
      ]);
      setEnrollment(enrollments.find(e => e.courseId === courseId) ?? null);
      setJustEnrolled(true);
      setTimeout(() => setJustEnrolled(false), 1500);
    } catch (err) {
      console.error('Failed to enroll:', err);
      alert('Nepodařilo se zapsat do kurzu.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!enrollment) return;
    setEnrollLoading(true);
    try {
      await leaveEnrollment(enrollment.enrollmentId);
      setEnrollment(null);
    } catch (err) {
      console.error('Failed to leave:', err);
      alert('Nepodařilo se opustit kurz.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const isEnrolled = !!enrollment;

  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return [...modules];
    const q = moduleSearch.toLowerCase();
    return modules.filter(m => m.title.toLowerCase().includes(q));
  }, [modules, moduleSearch]);

  if (loading) {
    return <CourseDetailSkeleton />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--muted)' }}>
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Kurz nebyl nalezen.'}</p>
          <Link href="/" className="text-gradient-r hover:underline">← Zpět na přehled</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--muted)' }} className="min-h-screen">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-[100px] py-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          {' / '}
          <span>kurzy</span>
          {' / '}
          <span className="text-foreground">{course.title}</span>
        </p>
      </div>

      {/* Course Header */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground break-words min-w-0">{course.title}</h1>
          {isAuthenticated && (
            <div className="shrink-0">
              <AnimatePresence mode="wait">
                {enrollment ? (
                  // TODO: "Opustit kurz" button temporarily disabled
                  justEnrolled ? (
                    <motion.div
                      key="enrolled-confirm"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-success bg-success/10 border border-success/30 whitespace-nowrap"
                    >
                      <CheckCircle className="size-4" />
                      Zapsáno!
                    </motion.div>
                  ) : null
                ) : (
                  <motion.button
                    key="enroll-btn"
                    onClick={handleEnroll}
                    disabled={enrollLoading}
                    className="flex items-center gap-2 px-5 py-2.5 text-primary-foreground rounded-md text-sm font-medium whitespace-nowrap disabled:opacity-50"
                    style={{ backgroundColor: 'var(--primary)' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    {enrollLoading ? (
                      <motion.div
                        className="size-4 rounded-full"
                        style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <LogIn className="size-4" />
                    )}
                    {enrollLoading ? 'Zpracování...' : 'Zapsat se do kurzu'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        {course.description && (
          <p className="text-muted-foreground mt-3 max-w-3xl break-words">{course.description}</p>
        )}
      </div>

      {/* Module Filter */}
      {modules.length > 3 && (
        <div className="px-4 sm:px-6 lg:px-[100px] pb-6" style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Hledat modul…"
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-transparent"
              style={{ backgroundColor: 'var(--muted)' }}
            />
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-16" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {modules.length === 0 ? (
            <motion.div
              key="modules-empty"
              className="bg-card rounded-lg border border-border p-8 sm:p-10 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="size-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                V tomto kurzu zatím nejsou moduly
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Obsah ještě nebyl vygenerován nebo publikován. Zkuste se vrátit později — nebo se
                podívejte na další kurzy.
              </p>
              {/* 
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-5 text-sm font-medium text-gradient-r hover:text-gradient-r"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Zpět na přehled kurzů
              </Link>
              */}
            </motion.div>
          ) : filteredModules.length === 0 && moduleSearch ? (
            <motion.p
              key="no-results"
              className="text-center text-muted-foreground py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Žádné moduly neodpovídají hledání „{moduleSearch}"
            </motion.p>
          ) : (
            <motion.div
              key={`modules-${moduleSearch}-${isEnrolled}`}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.07 },
                },
              }}
            >
              {(() => {
                // Find first incomplete accessible module index (use full modules list for logic)
                let currentModuleIndex = -1;
                if (isEnrolled) {
                  for (let i = 0; i < modules.length; i++) {
                    const p = moduleProgress.find(mp => mp.moduleId === modules[i].moduleId);
                    if (!(p?.passed)) { currentModuleIndex = i; break; }
                  }
                }
                return filteredModules.map((module) => {
                  // Find the original index in full sorted modules
                  const index = modules.findIndex(m => m.moduleId === module.moduleId);
                  const progress = moduleProgress.find(p => p.moduleId === module.moduleId);
                  const isPassed = progress?.passed ?? false;
                  const isCurrent = index === currentModuleIndex;

                  const prevModulePassed = index === 0 || (moduleProgress.find(
                    p => p.moduleId === modules[index - 1]?.moduleId
                  )?.passed ?? false);

                  const isAccessible = isEnrolled && prevModulePassed;
                  const isLocked = !isAccessible;
                  const learnBlockCount = module.learnBlocks?.length ?? 1;

                  const cardContent = (
                    <div
                      className={`bg-card rounded-lg flex flex-col transition-all duration-300 overflow-hidden ${
                        isAccessible ? 'hover:shadow-lg' : ''
                      } ${isLocked ? 'opacity-60' : ''}`}
                      style={{
                        border: isPassed ? '2px solid var(--primary)' : '1px solid var(--border)',
                        padding: '24px',
                        minHeight: '260px',
                      }}
                    >
                      {/* Header row */}
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
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Aktuálně studujete
                          </span>
                        )}
                        {isLocked && !isPassed && !isCurrent && (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Lock className="size-4" />
                            {!isEnrolled ? 'Zapište se' : `Splňte modul ${index}`}
                          </span>
                        )}
                      </div>

                      {/* Title with gradient */}
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
                        {module.title}
                      </h3>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        {/* 
                        <div className={`flex items-center gap-2 text-sm ${isLocked ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                          <BookOpen className="size-5" />
                          <span>{learnBlockCount} {learnBlockCount === 1 ? 'lekce' : 'lekcí'}</span>
                        </div>
                        */}
                        {isAccessible && !isPassed && (
                          <span
                            className="text-primary-foreground font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2"
                            style={{ backgroundColor: isCurrent ? 'var(--primary)' : 'var(--gradient-r)' }}
                          >
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            {isCurrent ? 'Pokračovat' : 'Začít modul'}
                          </span>
                        )}
                        {isPassed && (
                          <span
                            className="font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2 text-success bg-success/10"
                          >
                            Opakovat
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  if (isLocked && !isPassed) {
                    return (
                      <motion.div
                        key={module.moduleId}
                        className="cursor-not-allowed"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        {cardContent}
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={module.moduleId}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <Link
                        href={`/modules/${module.moduleId}`}
                        className="block group"
                      >
                        {cardContent}
                      </Link>
                    </motion.div>
                  );
                });
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation 
      <div className="px-4 sm:px-6 lg:px-[100px] pb-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Zpět na přehled kurzů
        </Link>
      </div>
      */}
    </div>
  );
}
