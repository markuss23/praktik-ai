'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Course, Status } from '@/api';
import { getCourses } from '@/lib/api-client';
import { czechPlural } from '@/lib/utils';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewCardsSkeleton } from '@/components/ui';
import { fetchMaterialsForReview } from '@/components/material/api';
import { MaterialCard } from '@/components/material/MaterialCard';
import type { Material } from '@/components/material/types';

// Carousel je stránkovaný: max 5 karet na stránku, šipka posune o celou stránku
// (nikoli po jedné kartě). Na užších viewportech se počet karet na stránku
// automaticky zmenší, aby každá karta zůstala čitelně široká.
const PAGE_SIZE = 5;
const MIN_CARD_WIDTH = 220;
const CARD_GAP = 16;

function StatusBadge({ status }: { status: Status }) {
  if (status === Status.InReview) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Ke kontrole
      </span>
    );
  }
  if (status === Status.Approved) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Schváleno
      </span>
    );
  }
  return null;
}

function CourseCard({ course, onStart }: { course: Course; onStart?: () => void }) {
  const isApproved = course.status === Status.Approved;
  const clickable = !!onStart;
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 min-w-0 h-full ${clickable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}
      onClick={clickable ? onStart : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStart?.();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={course.status} />
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className="font-semibold text-gray-900 text-base leading-snug mb-1 break-words"
          title={course.title}
        >
          {course.title}
        </h3>
        {course.modulesCount !== undefined && (
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <BookOpen size={13} />
            {course.modulesCount} {czechPlural(course.modulesCount, 'modul', 'moduly', 'modulů')}
          </p>
        )}
        {course.ownerDisplayName && (
          <p className="text-xs text-gray-400 mt-1 truncate" title={course.ownerDisplayName}>
            Autor: {course.ownerDisplayName}
          </p>
        )}
      </div>

      {!isApproved && onStart && (
        <button
          onClick={(e) => { e.stopPropagation(); onStart(); }}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: '#00C896' }}
        >
          <ArrowRight size={16} />
          Začít kurz
        </button>
      )}
    </div>
  );
}


function CourseCarousel<T extends { courseId: number }>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  // Sleduj reálnou šířku viewportu — počítáme z ní šířku karty a posun.
  useLayoutEffect(() => {
    const measure = () => {
      const w = viewportRef.current?.clientWidth ?? 0;
      setViewportWidth(w);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const cardsPerPage = (() => {
    if (viewportWidth <= 0) return PAGE_SIZE;
    let n = PAGE_SIZE;
    while (n > 1) {
      const cw = (viewportWidth - (n - 1) * CARD_GAP) / n;
      if (cw >= MIN_CARD_WIDTH) break;
      n--;
    }
    return n;
  })();

  const totalPages = Math.max(1, Math.ceil(items.length / cardsPerPage));

  useEffect(() => {
    setPageIndex(p => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const cardWidth = cardsPerPage > 0 && viewportWidth > 0
    ? (viewportWidth - (cardsPerPage - 1) * CARD_GAP) / cardsPerPage
    : 0;

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < totalPages - 1;

  const handlePrev = () => setPageIndex(p => Math.max(0, p - 1));
  const handleNext = () => setPageIndex(p => Math.min(totalPages - 1, p + 1));

  const offset = pageIndex * (cardsPerPage * cardWidth + cardsPerPage * CARD_GAP);

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        className="overflow-hidden"
        style={{ paddingBottom: 4 }}
      >
        <motion.div
          className="flex"
          style={{ gap: CARD_GAP }}
          animate={{ x: -offset }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          {items.map(item => (
            <div
              key={item.courseId}
              style={{ width: cardWidth || undefined, minWidth: cardWidth || undefined }}
              className="flex-shrink-0"
            >
              {renderItem(item)}
            </div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {canPrev && (
          <motion.button
            key="carousel-prev"
            type="button"
            onClick={handlePrev}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-gray-900 z-10"
            aria-label="Předchozích pět kurzů"
          >
            <ChevronLeft size={18} />
          </motion.button>
        )}
        {canNext && (
          <motion.button
            key="carousel-next"
            type="button"
            onClick={handleNext}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-gray-900 z-10"
            aria-label="Dalších pět kurzů"
          >
            <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

type ReviewTab = 'courses' | 'materials';

export function ReviewListView() {
  const router = useRouter();
  useRole(); // guard: only guarantors/superadmins see this page
  const { currentUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<ReviewTab>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await getCourses({ includeInactive: false });
        // Guarantors and superadmins see all in_review + approved
        const filtered = all.filter(c =>
          c.status === Status.InReview || c.status === Status.Approved
        );
        setCourses(filtered);
      } catch (err) {
        console.error('Failed to load review courses:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMaterials() {
      try {
        const data = await fetchMaterialsForReview();
        if (!cancelled) setMaterials(data);
      } catch (err) {
        console.error('Failed to load review materials:', err);
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    }
    loadMaterials();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = (courseId: number) => {
    router.push(`/admin/review/${courseId}`);
  };

  const handleOpenApproved = (courseId: number) => {
    router.push(`/admin?view=course-content&courseId=${courseId}`);
  };

  // A user cannot review courses they own. in_review courses are hidden
  const reviewable = courses.filter(c =>
    c.status === Status.InReview && c.ownerId !== currentUser?.userId
  );
  const approved = courses.filter(c => c.status === Status.Approved);

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Obsah ke schválení</h1>
        <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-1 shadow-sm">
          <ReviewTabButton
            active={activeTab === 'courses'}
            onClick={() => setActiveTab('courses')}
          >
            Kurzy
          </ReviewTabButton>
          <ReviewTabButton
            active={activeTab === 'materials'}
            onClick={() => setActiveTab('materials')}
          >
            Materiály
          </ReviewTabButton>
        </div>
      </div>

      {activeTab === 'courses' ? (
        loading ? (
          <ReviewCardsSkeleton />
        ) : reviewable.length === 0 && approved.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Žádné kurzy ke schválení</p>
            <p className="text-gray-400 text-sm mt-1">
              Momentálně nejsou žádné kurzy čekající na schválení.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {reviewable.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Ke kontrole ({reviewable.length})
                </h2>
                <CourseCarousel
                  items={reviewable}
                  renderItem={(course) => (
                    <CourseCard
                      course={course}
                      onStart={() => handleStart(course.courseId)}
                    />
                  )}
                />
              </section>
            )}

            {approved.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Schváleno ({approved.length})
                </h2>
                <CourseCarousel
                  items={approved}
                  renderItem={(course) => (
                    <CourseCard
                      course={course}
                      onStart={() => handleOpenApproved(course.courseId)}
                    />
                  )}
                />
              </section>
            )}
          </div>
        )
      ) : materialsLoading ? (
        <ReviewCardsSkeleton />
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">Žádné materiály ke schválení</p>
          <p className="text-gray-400 text-sm mt-1">
            Momentálně nejsou žádné materiály čekající na schválení.
          </p>
        </div>
      ) : (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Ke kontrole ({materials.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                showStatus
                showFolderAction={false}
                showBookmarkAction={false}
                variant="compact"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

export default ReviewListView;
