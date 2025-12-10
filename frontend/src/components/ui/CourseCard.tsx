'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import Image from "next/image";
import { EllipsisVertical, EyeOff, Eye, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { CoursesApi, Configuration } from "@/api";
import { API_BASE_URL } from "@/lib/constants";
import { slugify } from "@/lib/utils";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  difficulty: string;
  completedModules?: number;
  totalModules?: number;
  imageUrl?: string;
  isPublished?: boolean;
  onUpdate?: () => void;
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
  isPublished = true,
  onUpdate,
}: CourseCardProps) {
  const hasProgress = totalModules > 0;
  const progressPercent = hasProgress ? (completedModules / totalModules) * 100 : 0;
  const [openMenu, setOpenMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(!openMenu);
  };

  const handleHideCourse = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(false);

    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      
      await coursesApi.updateCourse({
        courseId: Number(id),
        courseUpdate: {
          title,
          description,
          isPublished: !isPublished
        }
      });
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update course:', error);
      alert('Failed to update course');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const config = new Configuration({ basePath: API_BASE_URL });
      const coursesApi = new CoursesApi(config);
      await coursesApi.deleteCourse({ courseId: Number(id) });
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Link href={`/courses/${slugify(title)}`} className="block group">
          <div 
            className="bg-white hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative"
            style={{ 
              width: '100%',
              maxWidth: '590px',
              height: '510px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}
          >
            {/* Course Image */}
            <div 
              className="relative overflow-hidden flex-shrink-0"
              style={{ 
                width: '100%',
                height: '226px'
              }}
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
              <h3 className="text-xl font-semibold mb-3 pr-8" style={{ color: '#8B5BA8' }}>
                {title}
              </h3>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {description}
              </p>

              {/* Dod. Information */}
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

              {/* Progress Bar */}
              {hasProgress && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-700">{completedModules}/{totalModules} modulů</span>
                  </div>
                </div>
              )}

              <div className="mt-auto">
                <button 
                  onClick={(e) => e.preventDefault()}
                  className="w-full text-white font-semibold py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#00C896' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span>Začít kurz</span>
                </button>
              </div>
            </div>
          </div>
        </Link>

        {/* Menu */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="w-8 h-8 bg-white/90 hover:bg-white rounded-full transition-colors flex items-center justify-center shadow-md"
            title="Možnosti"
          >
            <EllipsisVertical className="w-5 h-5 text-gray-700" />
          </button>
          
          {openMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={handleHideCourse}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                {isPublished ? (
                  <>
                    Skrýt kurz
                    <EyeOff className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Zveřejnit kurz
                    <Eye className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                Smazat kurz
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal*/}
        {showDeleteConfirm && (
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-20 rounded-lg"
            style={{ 
              width: '100%',
              maxWidth: '590px',
              height: '510px'
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl border border-gray-200" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-semibold mb-4 text-center text-gray-900">
                Opravdu chcete provést tuto akci?
              </h2>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Zrušit akci
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:bg-gray-400"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Mazání...' : 'Smazat'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
