'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import type { CourseRecommendation } from '@/lib/krauu-stats';

// Kurzy, které rozvíjejí nejslabší kompetence a uživatel je ještě nedokončil
export function CompetenceRecommendations({ items }: { items: CourseRecommendation[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Pro vaše nejslabší kompetence teď není jiný nedokončený kurz. Můžete si zopakovat testy v modulech,
        ze kterých výsledky pocházejí.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map(({ course, targets, enrolled }) => (
        <li key={course.courseId} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Link
            href={`/courses/${course.courseId}`}
            className="text-sm font-semibold text-foreground hover:text-gradient-r line-clamp-2 [overflow-wrap:anywhere]"
          >
            {course.title}
          </Link>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>Rozvíjí:</span>
            {targets.map((t) => (
              <span key={t.krauuId} className="truncate" title={`${t.code} ${t.name}`}>
                <span className="tabular-nums">{t.code}</span> <span className="text-foreground">{t.name}</span>
              </span>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-auto self-start"
            render={<Link href={`/courses/${course.courseId}`} />}
            nativeButton={false}
          >
            {enrolled ? 'Pokračovat v kurzu' : 'Zobrazit kurz'}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
