'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCourse, getModules } from "@/lib/api-client";
import type { Course, Module } from "@/api";
import { BookOpen, Lock } from "lucide-react";

// Static: first module is "currently studying", rest are locked
const CURRENT_MODULE_INDEX = 0;

export default function CoursePage() {
  const params = useParams();
  const slug = params.slug as string;
  const courseId = Number(slug);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Static descriptions/goals per module (fallback)
  const moduleMeta = [
    { description: 'Úvod do komunikace s AI', goal: 'Pochopit základy AI komunikace', lessons: 3 },
    { description: 'Naučte se klíčové principy', goal: 'Ovládnout základní techniky', lessons: 3 },
    { description: 'Aplikujte techniky v praxi', goal: 'Vytvořit funkční prompt', lessons: 3 },
    { description: 'Zhodnoťte své dovednosti', goal: 'Reflektovat a plánovat', lessons: 2 },
  ];

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
        <h1 className="text-3xl sm:text-4xl font-bold text-black">{course.title}</h1>
      </div>

      {/* Modules Grid */}
      <div className="px-4 sm:px-6 lg:px-[100px] pb-16" style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedModules.map((module, index) => {
            const isActive = index === CURRENT_MODULE_INDEX;
            const isLocked = index > CURRENT_MODULE_INDEX;
            const meta = moduleMeta[index] || { description: '', goal: '', lessons: 3 };
            const lessons = meta.lessons;
            const progress = 0; // Static: 0%

            const cardContent = (
              <div
                className={`bg-white rounded-lg flex flex-col transition-all duration-300 ${
                  isActive ? 'hover:shadow-lg' : ''
                } ${isLocked ? 'opacity-60' : ''}`}
                style={{
                  border: '1px solid #e5e7eb',
                  padding: '24px',
                  minHeight: '320px',
                }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm text-gray-500">Modul {index + 1}</span>
                  {isActive && (
                    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#8B5BA8' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Aktuálně studujete
                    </span>
                  )}
                  {isLocked && (
                    <span className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Lock className="w-4 h-4" />
                      Splňte modul {index}
                    </span>
                  )}
                </div>

                {/* Title with gradient */}
                <h3
                  className="text-xl font-bold mb-1"
                  style={{
                    background: isLocked
                      ? '#9CA3AF'
                      : 'linear-gradient(90deg, #B1475C, #857AD2)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {module.title}
                </h3>

                {/* Description */}
                <p className={`text-sm mb-4 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                  {meta.description}
                </p>

                {/* Short-term goals */}
                <div className="flex items-start gap-2 mb-4">
                  <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLocked ? 'text-gray-300' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className={`text-sm font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
                      Krátkodobé cíle:{' '}
                    </span>
                    <span className={`text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                      {meta.goal}
                    </span>
                  </div>
                </div>

                {/* Progress section - only for active module */}
                {isActive && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700 tracking-wider">PROGRES</span>
                      <span className="text-sm font-medium" style={{ color: progress > 0 ? '#00C896' : '#9CA3AF' }}>
                        {progress}%
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[...Array(lessons)].map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-2.5 rounded-full"
                          style={{
                            backgroundColor: i < Math.floor((progress / 100) * lessons) ? '#00C896' : '#D1D5DB',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className={`flex items-center gap-2 text-sm ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                    <BookOpen className="w-5 h-5" />
                    <span>{isActive ? `0/${lessons} lekcí` : `0/${lessons} lekcí`}</span>
                  </div>
                  {isActive && (
                    <span
                      className="text-white font-semibold py-2.5 px-5 rounded-md text-sm flex items-center gap-2"
                      style={{ backgroundColor: '#00C896' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Začít modul
                    </span>
                  )}
                </div>
              </div>
            );

            if (isLocked) {
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
          })}
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
