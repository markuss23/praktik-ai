'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCourse, getModules, getMyEnrollments, createEnrollment, leaveEnrollment, getCourseProgress } from "@/lib/api-client";
import type { Course, Module, MyEnrollment, ModuleCompletionStatus } from "@/api";
import { BookOpen, Lock, LogIn, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (isNaN(courseId)) {
          setError('Kurz nebyl nalezen.');
          return;
        }

        const courseData = await getCourse(courseId);
        setCourse(courseData);

        if (courseData.modules && courseData.modules.length > 0) {
          setModules(courseData.modules.filter(m => m.isActive));
        } else {
          const modulesData = await getModules({ courseId: courseData.courseId });
          setModules(modulesData.filter(m => m.isActive));
        }
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
      const enrollments = await getMyEnrollments();
      setEnrollment(enrollments.find(e => e.courseId === courseId) ?? null);
      getCourseProgress(courseId).then(setModuleProgress).catch(() => {});
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F0F0F0' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Načítání kurzu...</p>
        </div>
      </div>
    );
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

  const sortedModules = [...modules].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const isEnrolled = !!enrollment;

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
              {enrollment ? (
                // TODO: "Opustit kurz" button temporarily disabled
                // <button
                //   onClick={handleLeave}
                //   disabled={enrollLoading}
                //   className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50"
                // >
                //   <LogOut className="w-4 h-4" />
                //   {enrollLoading ? 'Zpracování...' : 'Opustit kurz'}
                // </button>
                null
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrollLoading}
                  className="flex items-center gap-2 px-5 py-2.5 text-white rounded-md hover:opacity-90 transition-colors text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#00C896' }}
                >
                  <LogIn className="w-4 h-4" />
                  {enrollLoading ? 'Zpracování...' : 'Zapsat se do kurzu'}
                </button>
              )}
            </div>
          )}
        </div>
        {course.description && (
          <p className="text-gray-600 mt-3 max-w-3xl">{course.description}</p>
        )}
      </div>

      {/* Modules Grid */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-16" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(() => {
            // Find first incomplete accessible module index
            let currentModuleIndex = -1;
            if (isEnrolled) {
              for (let i = 0; i < sortedModules.length; i++) {
                const p = moduleProgress.find(mp => mp.moduleId === sortedModules[i].moduleId);
                if (!(p?.passed)) { currentModuleIndex = i; break; }
              }
              // All passed → no current
            }
            return sortedModules.map((module, index) => {
            const progress = moduleProgress.find(p => p.moduleId === module.moduleId);
            const isPassed = progress?.passed ?? false;
            const isCurrent = index === currentModuleIndex;

            // Previous module must be passed (or this is the first module)
            const prevModulePassed = index === 0 || (moduleProgress.find(
              p => p.moduleId === sortedModules[index - 1]?.moduleId
            )?.passed ?? false);

            // Accessible: enrolled AND (first module OR previous passed)
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
                <div key={module.moduleId} className="cursor-not-allowed">
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={module.moduleId}
                href={`/modules/${module.moduleId}`}
                className="block group"
              >
                {cardContent}
              </Link>
            );
          });
          })()}
        </div>
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
