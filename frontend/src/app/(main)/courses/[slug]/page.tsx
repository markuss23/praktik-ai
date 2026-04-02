'use client';

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
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
  const slug = params.slug as string;
  const courseId = Number(slug);
  const { isAuthenticated } = useAuth();
  const { currentUser } = useCurrentUser();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
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
        setLoading(true);
        setError(null);

        if (isNaN(courseId)) {
          setError('Kurz nebyl nalezen.');
          return;
        }

        // Fetch course and modules in parallel
        const [courseData, modulesData] = await Promise.all([
          getCourse(courseId),
          getModules({ courseId }),
        ]);
        setCourse(courseData);
        setModules(
          (courseData.modules?.length ? courseData.modules : modulesData)
            .filter(m => m.isActive)
        );
      } catch (err) {
        console.error('Failed to fetch course data:', err);
        setError('Nepodařilo se načíst data kurzu.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // These are already parallel (fire-and-forget promises)
    getMyEnrollments()
      .then(enrollments => {
        const found = enrollments.find(e => e.courseId === courseId);
        setEnrollment(found ?? null);
      })
      .catch(() => setEnrollment(null));
    getCourseProgress(courseId)
      .then(setModuleProgress)
      .catch(() => setModuleProgress([]));
  }, [isAuthenticated, courseId]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F0F0' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Kurz nebyl nalezen.'}</p>
          <Link href="/" className="text-purple-600 hover:underline">← Zpět na přehled</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F0F0F0' }} className="min-h-screen">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-[100px] py-4" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <p className="text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          {' / '}
          <span>kurzy</span>
          {' / '}
          <span className="text-gray-700">{course.title}</span>
        </p>
      </div>

      {/* Course Header */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-black">{course.title}</h1>
          {isAuthenticated && (
            <div>
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
                      className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-green-700 bg-green-50 border border-green-200"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Zapsáno!
                    </motion.div>
                  ) : null
                ) : (
                  <motion.button
                    key="enroll-btn"
                    onClick={handleEnroll}
                    disabled={enrollLoading}
                    className="flex items-center gap-2 px-5 py-2.5 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#00C896' }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    {enrollLoading ? (
                      <motion.div
                        className="w-4 h-4 rounded-full"
                        style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    {enrollLoading ? 'Zpracování...' : 'Zapsat se do kurzu'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        {course.description && (
          <p className="text-gray-600 mt-3 max-w-3xl">{course.description}</p>
        )}
      </div>

      {/* Module Filter */}
      {modules.length > 3 && (
        <div className="px-4 sm:px-6 lg:px-[100px] pb-6" style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Hledat modul…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style={{ backgroundColor: '#F0F0F0' }}
            />
          </div>
        </div>
      )}

      {/* Modules Grid */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-16" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {filteredModules.length === 0 && moduleSearch ? (
            <motion.p
              key="no-results"
              className="text-center text-gray-500 py-12"
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
                      className={`bg-white rounded-lg flex flex-col transition-all duration-300 ${
                        isAccessible ? 'hover:shadow-lg' : ''
                      } ${isLocked ? 'opacity-60' : ''}`}
                      style={{
                        border: isPassed ? '2px solid #00C896' : '1px solid #e5e7eb',
                        padding: '24px',
                        minHeight: '260px',
                      }}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm text-gray-500">Modul {index + 1}</span>
                        {isPassed && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Dokončeno
                          </span>
                        )}
                        {isCurrent && !isPassed && (
                          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#8B5BA8' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Aktuálně studujete
                          </span>
                        )}
                        {isLocked && !isPassed && !isCurrent && (
                          <span className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Lock className="w-4 h-4" />
                            {!isEnrolled ? 'Zapište se' : `Splňte modul ${index}`}
                          </span>
                        )}
                      </div>

                      {/* Title with gradient */}
                      <h3
                        className="text-xl font-bold mb-3"
                        style={{
                          background: isLocked && !isPassed
                            ? '#9CA3AF'
                            : 'linear-gradient(90deg, #B1475C, #857AD2)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {module.title}
                      </h3>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className={`flex items-center gap-2 text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                          <BookOpen className="w-5 h-5" />
                          <span>{learnBlockCount} {learnBlockCount === 1 ? 'lekce' : 'lekcí'}</span>
                        </div>
                        {isAccessible && !isPassed && (
                          <span
                            className="text-white font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2"
                            style={{ backgroundColor: isCurrent ? '#00C896' : '#8B5BA8' }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            {isCurrent ? 'Pokračovat' : 'Začít modul'}
                          </span>
                        )}
                        {isPassed && (
                          <span
                            className="font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2 text-green-700 bg-green-50"
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

      {/* Bottom Navigation */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-8" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Zpět na přehled kurzů
        </Link>
      </div>
    </div>
  );
}
