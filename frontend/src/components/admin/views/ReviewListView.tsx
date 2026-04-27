'use client';

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Course, Status } from '@/api';
import { getCourses } from '@/lib/api-client';
import { useRole } from '@/hooks/useRole';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewCardsSkeleton } from '@/components/ui';

// Pevná šířka jedné karty + mezery; používá se pro výpočet kroku posunu šipek.
const CARD_WIDTH = 280;
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
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4 min-w-0 h-full ${isApproved ? '' : 'hover:shadow-md transition-shadow'}`}>
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
            {course.modulesCount} {course.modulesCount === 1 ? 'modul' : course.modulesCount < 5 ? 'moduly' : 'modulů'}
          </p>
        )}
      </div>

      {!isApproved && onStart && (
        <button
          onClick={onStart}
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

/** Jednorřádkový carousel kurzů. Pokud se karty nevejdou, ukáže šipky doleva/doprava
 *  a posun mezi nimi animuje pružinou z motion knihovny. */
function CourseCarousel<T extends { courseId: number }>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);

  const recalcMax = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const max = Math.max(0, track.scrollWidth - viewport.clientWidth);
    setMaxOffset(max);
    setOffset(o => Math.min(o, max));
  }, []);

  // Počítáme po mountu i při změně počtu položek/šířky okna.
  useLayoutEffect(() => {
    recalcMax();
  }, [recalcMax, items.length]);

  useEffect(() => {
    const onResize = () => recalcMax();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcMax]);

  const step = CARD_WIDTH + CARD_GAP;
  const canPrev = offset > 0;
  const canNext = offset < maxOffset - 0.5;

  const handlePrev = () => setOffset(o => Math.max(0, o - step));
  const handleNext = () => setOffset(o => Math.min(maxOffset, o + step));

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        className="overflow-hidden"
        style={{ paddingBottom: 4 }}
      >
        <motion.div
          ref={trackRef}
          className="flex"
          style={{ gap: CARD_GAP }}
          animate={{ x: -offset }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
          {items.map(item => (
            <div
              key={item.courseId}
              style={{ width: CARD_WIDTH, minWidth: CARD_WIDTH }}
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
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            aria-label="Předchozí kurzy"
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
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            aria-label="Další kurzy"
          >
            <ChevronRight size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ReviewListView() {
  const router = useRouter();
  useRole(); // guard: only guarantors/superadmins see this page
  const { currentUser } = useCurrentUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleStart = (courseId: number) => {
    router.push(`/admin/review/${courseId}`);
  };

  // A user cannot review courses they own. Hide own in_review courses entirely;
  // own approved courses still show informationally.
  const inReview = courses.filter(c =>
    c.status === Status.InReview && c.ownerId !== currentUser?.userId
  );
  const approved = courses.filter(c => c.status === Status.Approved);

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-6">Obsah ke schválení</h1>

      {loading ? (
        <ReviewCardsSkeleton />
      ) : inReview.length === 0 && approved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">Žádné kurzy ke schválení</p>
          <p className="text-gray-400 text-sm mt-1">
            Momentálně nejsou žádné kurzy čekající na schválení.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {inReview.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Ke kontrole ({inReview.length})
              </h2>
              <CourseCarousel
                items={inReview}
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
                renderItem={(course) => <CourseCard course={course} />}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewListView;
