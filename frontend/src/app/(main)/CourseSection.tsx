'use client';

import { CourseCard } from "@/components/ui";
import { getCourses, getMyEnrollments, getCourseBlocks, getCourseSubjects } from "@/lib/api-client";
import { MyEnrollment, CourseBlock, CourseSubject } from "@/api";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "motion/react";

type ErrorKind = 'backend-down' | 'unauthorized' | 'server-error';

function classifyError(err: unknown): ErrorKind {
  if (err && typeof err === 'object' && 'response' in err) {
    const status = (err as { response: Response }).response?.status;
    if (status === 401 || status === 403) return 'unauthorized';
    return 'server-error';
  }
  return 'backend-down';
}

function CourseCardSkeleton() {
  return (
    <div
      className="bg-white overflow-hidden flex flex-col animate-pulse"
      style={{ width: '100%', maxWidth: '590px', height: '510px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
    >
      <div style={{ width: '100%', height: '226px' }} className="bg-gray-200" />
      <div className="flex flex-col p-6 flex-grow">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="flex items-center gap-4 mb-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-6 bg-gray-200 rounded-full w-20" />
        </div>
        <div className="mt-auto">
          <div className="h-12 bg-gray-200 rounded-md w-full" />
        </div>
      </div>
    </div>
  );
}

export default function CourseSection() {
  const { isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<number | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);

  const loadCourses = useCallback(async (params?: {
    textSearch?: string;
    courseBlockId?: number;
    courseSubjectId?: number;
  }) => {
    try {
      setErrorKind(null);
      setLoading(true);
      const data = await getCourses({
        isPublished: true,
        textSearch: params?.textSearch || undefined,
        courseBlockId: params?.courseBlockId,
        courseSubjectId: params?.courseSubjectId,
      });
      setCourses(data);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      setErrorKind(classifyError(err));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load filter catalogs
    getCourseBlocks().then(setBlocks).catch(() => setBlocks([]));
    getCourseSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getMyEnrollments()
      .then(setEnrollments)
      .catch(() => setEnrollments([]));
  }, [isAuthenticated]);

  // Debounced search + filter apply
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCourses({
        textSearch: search || undefined,
        courseBlockId: selectedBlockId,
        courseSubjectId: selectedSubjectId,
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, selectedBlockId, selectedSubjectId, loadCourses]);

  const handleReset = () => {
    setSearch('');
    setSelectedBlockId(undefined);
    setSelectedSubjectId(undefined);
  };

  return (
    <div className="py-8 sm:py-12 lg:py-16" style={{ backgroundColor: '#F0F0F0' }}>
      <div className="mx-auto px-4 sm:px-6 lg:px-[100px]" style={{ maxWidth: '1440px', width: '100%' }}>
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500">Home</p>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Najdi kurz!"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style={{ backgroundColor: '#F0F0F0' }}
            />
          </div>

          {/* Kategorie (Block) */}
          <select
            value={selectedBlockId ?? ''}
            onChange={(e) => setSelectedBlockId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[160px]"
            style={{ backgroundColor: '#F0F0F0' }}
          >
            <option value="">Kategorie</option>
            {blocks.map((b) => (
              <option key={b.blockId} value={b.blockId}>{b.name}</option>
            ))}
          </select>

          {/* Tema (Subject) */}
          <select
            value={selectedSubjectId ?? ''}
            onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[160px]"
            style={{ backgroundColor: '#F0F0F0' }}
          >
            <option value="">Téma</option>
            {subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>{s.name}</option>
            ))}
          </select>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
            style={{ backgroundColor: '#F0F0F0' }}
          >
            Resetovat
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeletons"
                className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {[1, 2, 3].map((i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </motion.div>
            ) : errorKind ? (
              <motion.div
                key="error"
                className="col-span-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {errorKind === 'backend-down' && (
                    <>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">Backend není dostupný</h3>
                      <p className="text-red-600 mb-4">
                        Nepodařilo se připojit k API serveru. Ujistěte se, že backend běží a je dostupný.
                      </p>
                    </>
                  )}
                  {errorKind === 'unauthorized' && (
                    <>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">Přístup odepřen</h3>
                      <p className="text-red-600 mb-4">
                        Tento obsah není veřejně dostupný. Pro zobrazení kurzů se prosím přihlaste.
                      </p>
                    </>
                  )}
                  {errorKind === 'server-error' && (
                    <>
                      <h3 className="text-lg font-semibold text-red-800 mb-2">Chyba serveru</h3>
                      <p className="text-red-600 mb-4">
                        Server vrátil neočekávanou chybu. Zkuste to prosím znovu.
                      </p>
                    </>
                  )}
                  <button
                    onClick={() => loadCourses()}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Zkusit Znovu
                  </button>
                </div>
              </motion.div>
            ) : courses.length === 0 ? (
              <motion.div
                key="empty"
                className="col-span-full text-center text-gray-500 py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                Žádné kurzy neodpovídají vašemu hledání.
              </motion.div>
            ) : (
              <motion.div
                key={`courses-${courses.map(c => c.courseId || c.id).join('-')}`}
                className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-6"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08 },
                  },
                }}
              >
                {courses.map((course: any) => {
                  const enrollment = enrollments.find(e => e.courseId === (course.courseId || course.id));
                  return (
                    <motion.div
                      key={course.courseId || course.id}
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.97 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <CourseCard
                        id={String(course.courseId || course.id)}
                        title={course.title || course.name}
                        description={course.description || ''}
                        duration={course.durationMinutes ?? (course.modulesCount ? course.modulesCount * 20 : 60)}
                        difficulty="Začátečník"
                        completedModules={enrollment?.completedModules ?? 0}
                        totalModules={course.modulesCount || 0}
                        isEnrolled={!!enrollment}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
