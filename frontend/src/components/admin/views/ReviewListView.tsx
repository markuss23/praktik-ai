'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Course, FeedbackItem, Status } from '@/api';
import { getCourses, getFeedbackSection } from '@/lib/api-client';
import { czechPlural, timeAgo } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRole } from '@/hooks/useRole';
import { PublishCourseButton } from '@/components/admin/PublishCourseButton';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { Badge, ReviewCardsSkeleton, Button, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { fetchMaterialsForReview, fetchApprovedMaterials } from '@/components/material/api';
import { MaterialCard } from '@/components/material/MaterialCard';
import type { Material } from '@/components/material/types';

const CARD_GRID = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4';

function StatusBadge({ status }: { status: Status }) {
  if (status === Status.InReview) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-accent/20 text-brand-accent">
        Ke kontrole
      </span>
    );
  }
  if (status === Status.Approved) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
        Schváleno
      </span>
    );
  }
  return null;
}

// Komentáře z minulého kola: autor na ně odpověděl nebo je odškrtl
function resubmissionInfo(feedbacks: FeedbackItem[] | undefined) {
  if (!feedbacks?.some((fb) => fb.isResolved || !!fb.reply)) return null;
  return { resolved: feedbacks.filter((fb) => fb.isResolved).length, total: feedbacks.length };
}

function CourseCard({
  course,
  onOpen,
  feedbacks,
  onPublished,
}: {
  course: Course;
  onOpen: () => void;
  // undefined = komentáře se ještě načítají nebo jde o schválený kurz
  feedbacks?: FeedbackItem[];
  // Jen u schváleného kurzu, ktery smi aktualni uzivatel publikovat
  onPublished?: () => void;
}) {
  const inReview = course.status === Status.InReview;
  const isApproved = course.status === Status.Approved;
  const resubmission = inReview ? resubmissionInfo(feedbacks) : null;

  return (
    <div
      className="bg-card rounded-xl shadow-sm border border-border p-5 flex flex-col gap-4 min-w-0 h-full hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <StatusBadge status={course.status} />
        {isApproved && (
          <Badge variant={course.isPublished ? 'resolved' : 'waiting'}>
            {course.isPublished ? 'Publikováno' : 'Nepublikováno'}
          </Badge>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-base leading-snug mb-1 break-words" title={course.title}>
          {course.title}
        </h3>
        {course.modulesCount !== undefined && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <BookOpen size={13} />
            {course.modulesCount} {czechPlural(course.modulesCount, 'modul', 'moduly', 'modulů')}
          </p>
        )}
        {course.ownerDisplayName && (
          <p className="text-xs text-muted-foreground mt-1 truncate" title={course.ownerDisplayName}>
            Autor: {course.ownerDisplayName}
          </p>
        )}
        {inReview && (
          // Kurz ve stavu ke kontrole autor upravit nemůže, updatedAt = čas odeslání
          <p className="text-xs text-muted-foreground mt-1">Odesláno {timeAgo(new Date(course.updatedAt)).toLowerCase()}</p>
        )}
        {resubmission && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="open">Opravená verze</Badge>
            <span>
              Vyřešené komentáře: {resubmission.resolved}/{resubmission.total}
            </span>
          </div>
        )}
      </div>

      {inReview && (
        <Button
          size="lg"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <ArrowRight data-icon="inline-start" />
          {resubmission ? 'Zkontrolovat opravy' : 'Zkontrolovat'}
        </Button>
      )}

      {isApproved && !course.isPublished && onPublished && (
        <PublishCourseButton
          courseId={course.courseId}
          courseTitle={course.title}
          onPublished={onPublished}
          className="w-full"
        />
      )}
    </div>
  );
}

type ReviewTab = 'courses' | 'materials';

// Segmentovaný přepínač nad kitovými Tabs. Kit u default variantu přidává
// aktivní stín a světlé pozadí — obojí přebíjíme stejným modifikátorem,
// aby zůstal původní gradient-r vzhled.
const REVIEW_TABS_LIST =
  'rounded-md border border-border bg-card p-1 shadow-sm group-data-horizontal/tabs:h-auto';
const REVIEW_TAB = [
  'flex-none rounded px-4 py-1.5 text-sm font-medium',
  'text-muted-foreground hover:text-foreground',
  'data-active:bg-gradient-r/20 data-active:text-gradient-r',
  'group-data-[variant=default]/tabs-list:data-active:shadow-none',
].join(' ');

const SECTION_HEADING = 'text-sm font-semibold text-muted-foreground uppercase tracking-wider';

export function ReviewListView() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const { isGuarantor } = useRole();
  const [activeTab, setActiveTab] = useState<ReviewTab>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  // Komentáře kurzů ke kontrole, podle nich se pozná opravená verze
  const [feedbacksByCourse, setFeedbacksByCourse] = useState<Record<number, FeedbackItem[]>>({});
  const [showApproved, setShowApproved] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);

  // Po schválení kurzu (?schvaleno=<id>) rovnou rozbalit Schváleno, ať jde kurz publikovat
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('schvaleno')) setShowApproved(true);
  }, []);
  const [approvedMaterials, setApprovedMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await getCourses({ includeInactive: false });
        // Guarantors and superadmins see all in_review + approved
        const filtered = all.filter(c =>
          c.status === Status.InReview || c.status === Status.Approved
        );
        if (cancelled) return;
        setCourses(filtered);
        setLoading(false);

        // Kurzů ke kontrole je málo, komentáře se dotahují až po vykreslení seznamu
        const inReview = filtered.filter((c) => c.status === Status.InReview);
        const sections = await Promise.all(
          inReview.map((c) => getFeedbackSection(c.courseId).then((s) => [c.courseId, s.feedbacks] as const).catch(() => null)),
        );
        if (cancelled) return;
        setFeedbacksByCourse(Object.fromEntries(sections.filter((s) => s !== null)));
      } catch (err) {
        console.error('Failed to load review courses:', err);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMaterials() {
      try {
        const [pending, approved] = await Promise.all([
          fetchMaterialsForReview(),
          fetchApprovedMaterials(),
        ]);
        if (!cancelled) {
          setMaterials(pending);
          setApprovedMaterials(approved);
        }
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

  // Schválený kurz se už neupravuje — garant si ho projde v read-only náhledu
  const handleOpenApproved = (courseId: number) => {
    router.push(`/admin?view=course-preview&courseId=${courseId}`);
  };

  // A user cannot review courses they own. Fronta od nejdéle čekajícího kurzu
  const reviewable = courses
    .filter(c => c.status === Status.InReview && c.ownerId !== currentUser?.userId)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  // Nepublikované nahoře (čekají na publikování), pak od naposledy změněného
  const approved = courses
    .filter(c => c.status === Status.Approved)
    .sort((a, b) =>
      Number(!!a.isPublished) - Number(!!b.isPublished)
      || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const unpublishedCount = approved.filter(c => !c.isPublished).length;
  const canPublish = (course: Course) => isGuarantor || course.ownerId === currentUser?.userId;
  const markPublished = (courseId: number) =>
    setCourses((prev) => prev.map((c) => (c.courseId === courseId ? { ...c, isPublished: true } : c)));

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Obsah ke schválení</h1>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ReviewTab)}
          className="gap-0"
        >
          <TabsList className={REVIEW_TABS_LIST}>
            <TabsTrigger value="courses" className={REVIEW_TAB}>
              Kurzy
            </TabsTrigger>
            <TabsTrigger value="materials" className={REVIEW_TAB}>
              Materiály
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'courses' ? (
        loading ? (
          <ReviewCardsSkeleton />
        ) : (
          <div className="flex flex-col gap-8">
            <section>
              <h2 className={`${SECTION_HEADING} mb-4`}>Ke kontrole ({reviewable.length})</h2>
              {reviewable.length > 0 ? (
                <div className={CARD_GRID}>
                  {reviewable.map((course) => (
                    <CourseCard
                      key={course.courseId}
                      course={course}
                      feedbacks={feedbacksByCourse[course.courseId]}
                      onOpen={() => handleStart(course.courseId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                  <BookOpen size={40} className="text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">Žádné kurzy ke kontrole</p>
                  <p className="text-muted-foreground text-sm mt-1">Momentálně nic nečeká na schválení.</p>
                </div>
              )}
            </section>

            {approved.length > 0 && (
              // Schválené kurzy jsou archiv, ne fronta práce: ve výchozím stavu sbalené
              <section className="flex flex-col gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowApproved((v) => !v)}
                  aria-expanded={showApproved}
                  className={`${SECTION_HEADING} self-start px-2 -mx-2`}
                >
                  Schváleno ({approved.length}{unpublishedCount > 0 ? `, nepublikováno ${unpublishedCount}` : ''})
                  <ChevronDown data-icon="inline-end" className={showApproved ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </Button>
                {showApproved && (
                  <div className={CARD_GRID}>
                    {approved.map((course) => (
                      <CourseCard
                        key={course.courseId}
                        course={course}
                        onOpen={() => handleOpenApproved(course.courseId)}
                        onPublished={canPublish(course) ? () => markPublished(course.courseId) : undefined}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )
      ) : materialsLoading ? (
        <ReviewCardsSkeleton />
      ) : materials.length === 0 && approvedMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen size={48} className="text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Žádné materiály ke schválení</p>
          <p className="text-muted-foreground text-sm mt-1">
            Momentálně nejsou žádné materiály čekající na schválení.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {materials.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
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
                    detailHref={`/admin/review/material/${material.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          {approvedMaterials.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Schváleno ({approvedMaterials.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedMaterials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    showStatus
                    showFolderAction={false}
                    showBookmarkAction={false}
                    variant="compact"
                    detailHref={`/admin/review/material/${material.id}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default ReviewListView;
