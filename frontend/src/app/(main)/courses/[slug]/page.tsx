'use client';

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCourse, getModules, getMyEnrollments, createEnrollment, leaveEnrollment, getCourseProgress } from "@/lib/api-client";
import type { Course, Module, MyEnrollment, ModuleCompletionStatus } from "@/api";
import { ArrowRight, BookOpen, CheckCircle, LogIn, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Input, getCourseStatus, modulesWord, useToast } from "@/components/ui";
import { CourseDetailSkeleton, CourseHero, ModuleCard, type ModuleCardStatus } from "@/components/courses";
import { getMockCourseDetail } from "@/components/courses/courseMocks";
import { motion, AnimatePresence } from "motion/react";
import { cn } from '@/lib/utils';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const courseId = Number(slug);
  const { isAuthenticated, loading: authLoading, login } = useAuth();
  const { currentUser } = useCurrentUser();
  const toast = useToast();

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

  // Ukázkové kurzy 9001–9009 (courseMocks.ts) — jen ve vývoji, ať jde detail
  // otevřít i bez backendu. Ostatní ID jdou normálně na API.
  const mockDetail = useMemo(
    () => (process.env.NODE_ENV !== 'production' ? getMockCourseDetail(courseId) : null),
    [courseId],
  );

  useEffect(() => {
    async function load() {
      try {
        setCourseLoading(true);
        setError(null);

        if (isNaN(courseId)) {
          setError('Kurz nebyl nalezen.');
          return;
        }

        if (mockDetail) {
          setCourse(mockDetail.course);
          setModules(mockDetail.modules);
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
  }, [courseId, mockDetail]);

  useEffect(() => {
    // Počkej, než useAuth vyřeší stav přihlášení.
    if (authLoading) return;

    // Ukázkový kurz: zápis a průběh z mocků bez ohledu na přihlášení, ať jsou
    // vidět i stavy „rozpracováno" / „dokončeno". Dokončený kurz se tu
    // (na rozdíl od API větve) nepřesměrovává, ať jde zobrazit.
    if (mockDetail) {
      setEnrollment(mockDetail.enrollment);
      setModuleProgress(mockDetail.progress);
      setEnrollmentLoading(false);
      return;
    }

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
  }, [authLoading, isAuthenticated, courseId, router, mockDetail]);

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
      toast.error(err, 'Nepodařilo se zapsat do kurzu.');
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
      toast.error(err, 'Nepodařilo se opustit kurz.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const isEnrolled = !!enrollment;

  const filteredModules = useMemo(() => {
    if (!moduleSearch.trim()) return modules;
    const q = moduleSearch.toLocaleLowerCase('cs');
    return modules.filter(m => m.title.toLocaleLowerCase('cs').includes(q));
  }, [modules, moduleSearch]);

  const passedIds = useMemo(
    () => new Set(moduleProgress.filter(p => p.passed).map(p => p.moduleId)),
    [moduleProgress],
  );

  if (loading) {
    return <CourseDetailSkeleton />;
  }

  if (error || !course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="text-center">
          <p className="mb-4 text-destructive">{error || 'Kurz nebyl nalezen.'}</p>
          <Link href="/kurzy" className="font-medium text-foreground underline-offset-4 hover:underline">
            ← Zpět na kurzy
          </Link>
        </div>
      </div>
    );
  }

  // První nesplněný modul = kde uživatel je (jen u zapsaného kurzu).
  const currentIndex = isEnrolled ? modules.findIndex(m => !passedIds.has(m.moduleId)) : -1;
  const currentModule = currentIndex >= 0 ? modules[currentIndex] : undefined;
  const passedCount = modules.filter(m => passedIds.has(m.moduleId)).length;
  const courseDone =
    isEnrolled && (!!enrollment?.completedAt || (modules.length > 0 && passedCount === modules.length));
  const courseStatus = getCourseStatus(isEnrolled, courseDone);

  const moduleStatus = (index: number): ModuleCardStatus => {
    const moduleId = modules[index].moduleId;
    if (passedIds.has(moduleId)) return 'done';
    if (index === currentIndex) return 'current';
    const prevPassed = index === 0 || passedIds.has(modules[index - 1].moduleId);
    return isEnrolled && prevPassed ? 'open' : 'locked';
  };

  const heroAction = courseDone ? (
    <span className="inline-flex h-11 items-center gap-2 rounded-lg bg-success/10 px-5 text-[15px] font-semibold text-success">
      <CheckCircle className="size-4.5" aria-hidden />
      Kurz dokončen
    </span>
  ) : isEnrolled ? (
    <>
      {currentModule && (
        <Link href={`/modules/${currentModule.moduleId}`} className={cn(HERO_CTA, HERO_CTA_PRIMARY)}>
          Pokračovat: Modul {currentIndex + 1}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
      <AnimatePresence>
        {justEnrolled && (
          <motion.span
            key="enrolled-confirm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success"
          >
            <CheckCircle className="size-4" aria-hidden />
            Zapsáno!
          </motion.span>
        )}
      </AnimatePresence>
    </>
  ) : isAuthenticated ? (
    <button
      type="button"
      onClick={handleEnroll}
      disabled={enrollLoading}
      className={cn(HERO_CTA, HERO_CTA_PRIMARY, 'disabled:pointer-events-none disabled:opacity-60')}
    >
      {enrollLoading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" aria-hidden />
      ) : (
        <LogIn className="size-4" aria-hidden />
      )}
      {enrollLoading ? 'Zpracování…' : 'Zapsat se do kurzu'}
    </button>
  ) : (
    <button type="button" onClick={login} className={cn(HERO_CTA, HERO_CTA_NEUTRAL)}>
      <LogIn className="size-4" aria-hidden />
      Přihlásit se a zapsat
    </button>
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-[100px]">
        <nav aria-label="Drobečková navigace" className="mb-4 flex min-w-0 text-sm text-muted-foreground">
          <Link href="/" className="shrink-0 hover:text-foreground">Home</Link>
          <span aria-hidden className="mx-1.5">/</span>
          <Link href="/kurzy" className="shrink-0 hover:text-foreground">Kurzy</Link>
          <span aria-hidden className="mx-1.5">/</span>
          <span aria-current="page" className="truncate text-foreground">{course.title}</span>
        </nav>

        <CourseHero
          course={course}
          status={courseStatus}
          completedModules={passedCount}
          totalModules={modules.length}
          action={heroAction}
        />

        <section aria-labelledby="modules-title" className="mt-10 sm:mt-12">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="modules-title" className="text-xl font-bold text-foreground sm:text-2xl">
                Moduly kurzu
              </h2>
              {modules.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {modules.length} {modulesWord(modules.length)} ·{' '}
                  {isEnrolled
                    ? 'další se odemkne po splnění předchozího'
                    : 'po zápisu se odemykají postupně'}
                </p>
              )}
            </div>
            {modules.length > 3 && (
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  type="search"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Hledat modul…"
                  aria-label="Hledat modul"
                  className="h-10 bg-card pl-9"
                />
              </div>
            )}
          </div>

          {modules.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center sm:p-10">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                <BookOpen className="size-6 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">V tomto kurzu zatím nejsou moduly</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Obsah ještě nebyl vygenerován nebo publikován. Zkuste se vrátit později — nebo se
                podívejte na další kurzy.
              </p>
            </div>
          ) : filteredModules.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Žádné moduly neodpovídají hledání „{moduleSearch}“
            </p>
          ) : (
            <motion.ul
              className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {filteredModules.map((module) => {
                const index = modules.findIndex(m => m.moduleId === module.moduleId);
                return (
                  <motion.li
                    key={module.moduleId}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <ModuleCard
                      module={module}
                      number={index + 1}
                      status={moduleStatus(index)}
                      score={moduleProgress.find(p => p.moduleId === module.moduleId)?.score}
                      lockHint={!isEnrolled ? 'Zapište se do kurzu' : `Nejdřív splňte modul ${index}`}
                    />
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Hlavní akce v hlavičce — stejné tóny jako CTA na kartě kurzu (`CourseCta`). */
const HERO_CTA =
  'group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold whitespace-nowrap shadow-sm outline-none transition-[background-color,color,box-shadow] duration-200 focus-visible:ring-3 focus-visible:ring-ring/50';
const HERO_CTA_PRIMARY =
  'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),black_12%)]';
const HERO_CTA_NEUTRAL = 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground';
