import type { Course } from '@/api';
import { CourseCategories } from '@/components/ui';
import { CourseImage } from '@/components/ui/CourseImage';
import { DIFFICULTY_LABELS } from '@/lib/difficulty';
import { czechPlural } from '@/lib/utils';

interface ReviewCourseSummaryProps {
  course: Course;
  modulesCount: number;
}

const EMPTY = 'Neurčeno';

/**
 * První krok schvalování: vše, co kurz popisuje mimo obsah modulů — obrázek,
 * popis, zařazení v číselnících a pedagogické kategorie. Jen pro čtení.
 */
export function ReviewCourseSummary({ course, modulesCount }: ReviewCourseSummaryProps) {
  const info: { label: string; value: string }[] = [
    { label: 'Obtížnost', value: course.difficulty ? DIFFICULTY_LABELS[course.difficulty] : EMPTY },
    { label: 'Délka', value: course.durationMinutes ? `${course.durationMinutes} minut` : EMPTY },
    { label: 'Počet modulů', value: `${modulesCount} ${czechPlural(modulesCount, 'modul', 'moduly', 'modulů')}` },
    {
      label: 'EQF úroveň',
      value: course.courseEqfLevel ? `${course.courseEqfLevel.code} – ${course.courseEqfLevel.name}` : EMPTY,
    },
    { label: 'Typ kurzu', value: course.courseType?.name ?? EMPTY },
    { label: 'Povinnost kurzu', value: course.courseRequirement?.name ?? EMPTY },
    { label: 'Úroveň', value: course.courseLevel?.name ?? EMPTY },
    { label: 'Tematický blok', value: course.courseBlock?.name ?? EMPTY },
    { label: 'Cílová skupina', value: course.courseTarget?.name ?? EMPTY },
    { label: 'Obor', value: course.courseSubject?.name ?? EMPTY },
  ];

  const hasCategories =
    (course.krauuCompetences?.length ?? 0) + (course.bloomLevels?.length ?? 0) + (course.crossSubjects?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted md:w-80">
          <CourseImage imageUrl={course.imageUrl} alt={`Náhledový obrázek kurzu ${course.title}`} sizes="(min-width: 768px) 320px, 100vw" />
          {!course.imageUrl && (
            <span className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Výchozí obrázek
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground break-words">{course.title}</h3>
          {course.ownerDisplayName && (
            <p className="mt-0.5 text-xs text-muted-foreground">Autor: {course.ownerDisplayName}</p>
          )}
          <p className="mt-3 text-sm text-foreground whitespace-pre-wrap break-words">
            {course.description?.trim() || <span className="text-muted-foreground">Kurz nemá popis.</span>}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {info.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={value === EMPTY ? 'text-sm text-muted-foreground' : 'text-sm font-medium text-foreground break-words'}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Pedagogické zařazení</h4>
        {hasCategories ? (
          <CourseCategories course={course} />
        ) : (
          <p className="text-sm text-warning">Kurz nemá vyplněné KRAUU kompetence, Bloomovu taxonomii ani průřezové obory.</p>
        )}
      </div>
    </div>
  );
}
