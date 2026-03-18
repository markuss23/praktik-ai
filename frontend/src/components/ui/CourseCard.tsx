'use client';

import Link from "next/link";
import Image from "next/image";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  completedModules?: number;
  totalModules?: number;
  imageUrl?: string;
  isEnrolled?: boolean;
}

export function CourseCard({
  id,
  title,
  description,
  duration,
  difficulty,
  completedModules = 0,
  totalModules = 0,
  imageUrl = "/courseai2.png",
  isEnrolled = false,
}: CourseCardProps) {
  const hasProgress = totalModules > 0;
  const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <Link href={`/courses/${id}`} className="block group">
      <div
        className="bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
        style={{
          width: '100%',
          maxWidth: '590px',
          height: '510px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Course Image */}
        <div
          className="relative overflow-hidden flex-shrink-0"
          style={{ width: '100%', height: '226px' }}
        >
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Card Content */}
        <div className="flex flex-col p-6 flex-grow">
          <h3 className="text-xl font-semibold mb-3" style={{ color: '#8B5BA8' }}>
            {title}
          </h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
            {description}
          </p>

          {/* Duration + Difficulty */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{duration} minut</span>
            </div>
            <div className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
              {difficulty}
            </div>
          </div>

          {/* Module Count & Progress */}
          {hasProgress && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-700">{completedModules}/{totalModules} modulů</span>
                </div>
                {isEnrolled && <span className="text-sm font-medium" style={{ color: '#00C896' }}>{progressPercent}%</span>}
              </div>
              {isEnrolled && (
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressPercent}%`, backgroundColor: '#00C896' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* CTA Button */}
          <div className="mt-auto">
            <button
              className="w-full text-white font-semibold py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2 hover:opacity-90"
              style={{ backgroundColor: isEnrolled ? '#8B5BA8' : '#00C896' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span>{isEnrolled ? 'Pokračovat' : 'Zobrazit kurz'}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
