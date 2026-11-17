import Link from "next/link";
import { ArrowRight, CheckCircle, Clock, FileText } from "lucide-react";
import { type CourseBlock, type Difficulty } from "@/api";
import { courseBlockTone } from "@/lib/course-categories";
import { DIFFICULTY_LABELS } from "@/lib/difficulty";
import { cn, czechPlural } from "@/lib/utils";

import { Button } from "../ui-kit/button";
import { Card, CardContent, CardFooter } from "../ui-kit/card";
import { Progress } from "../ui-kit/progress";
import { CourseBlockEyebrow } from "./CourseBlockEyebrow";
import { CourseImage } from "./CourseImage";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  duration: number;
  /** Doporučená obtížnost. Pokud není uvedena, fallback na „Začátečník". */
  difficulty?: Difficulty | null;
  completedModules?: number;
  totalModules?: number;
  /** `imageUrl` z API kurzu; bez něj se ukáže výchozí obrázek. */
  imageUrl?: string | null;
  isEnrolled?: boolean;
  isCompleted?: boolean;
  // Tematický blok: nadtitulek, linka pod obrázkem a tón karty v barvě bloku.
  block?: CourseBlock | null;
  /** Místo odkazu na detail kurzu zavolá handler (náhled pro studenta v adminu). */
  onSelect?: () => void;
}

export function CourseCard({
  id,
  title,
  description,
  duration,
  difficulty,
  completedModules = 0,
  totalModules = 0,
  imageUrl,
  isEnrolled = false,
  isCompleted = false,
  block,
  onSelect,
}: CourseCardProps) {
  const hasProgress = totalModules > 0;
  const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  const tone = courseBlockTone(block);

  // Výška počítá s řádkem nadtitulku (h-4 + mb-1.5), bez něj stačilo 530 px. Řádek drží
  // místo i u kurzu bez bloku, aby názvy karet v mřížce seděly na sebe. Tón papíru a stín
  // jsou u všech karet stejné (barva Kontextu), blok nesou nadtitulek a linka pod obrázkem.
  const cardContent = (
    <Card
      data-course-block={tone ?? undefined}
      className={cn(
        "h-[554px] w-full max-w-[590px] gap-0 py-0 transition-all duration-300",
        isCompleted ? "border-success opacity-75" : "hover:shadow-xl hover:shadow-block-context/30",
      )}
    >
      {/* Course Image */}
      <div className="relative h-[226px] w-full shrink-0 overflow-hidden">
        <CourseImage
          imageUrl={imageUrl}
          alt={title}
          className={cn("transition-transform duration-300", !isCompleted && "group-hover:scale-105")}
        />
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/30">
            <div className="rounded-full bg-card p-3 shadow-lg">
              <CheckCircle className="size-8 text-success" />
            </div>
          </div>
        )}
        {tone && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-block" />}
      </div>

      <CardContent className="flex min-h-0 grow flex-col bg-gradient-to-b from-transparent from-30% to-block-context/12 px-6 pt-6 pb-4">
        <div>
          <div className="mb-1.5 h-4">
            <CourseBlockEyebrow block={block} />
          </div>
          <h3
            className={cn(
              "mb-3 line-clamp-2 min-h-[3.5rem] text-xl font-semibold",
              isCompleted ? "text-success" : "text-gradient-r",
            )}
          >
            {title}
          </h3>

          <p className="mb-3 line-clamp-3 min-h-[3.75rem] text-sm text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="mt-auto">
          <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="size-4" />
              <span>{duration} minut</span>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {difficulty ? DIFFICULTY_LABELS[difficulty] : 'Začátečník'}
            </div>
          </div>

          {hasProgress && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-muted-foreground" />
                  <span className="text-foreground">
                    {completedModules}/{totalModules} {czechPlural(totalModules, 'modul', 'moduly', 'modulů')}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCompleted ? "text-success" : isEnrolled ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {isCompleted ? 'Dokončeno' : isEnrolled ? `${progressPercent}%` : 'Nezapsán'}
                </span>
              </div>
              <Progress
                value={isEnrolled ? progressPercent : 0}
                className="w-full [&_[data-slot=progress-track]]:h-2"
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-0">
        {isCompleted ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-b-md border-t border-success/30 bg-success/10 px-6 py-3.5 font-semibold text-success transition-colors group-hover:bg-success/20">
            <CheckCircle className="size-4.5" />
            <span>Kurz dokončen</span>
          </div>
        ) : (
          <Button
            variant={isEnrolled ? "brand" : "default"}
            className="h-auto w-full rounded-none rounded-b-md py-3.5 font-semibold"
          >
            <ArrowRight data-icon="inline-start" className="size-5" />
            <span>{isEnrolled ? 'Pokračovat' : 'Zobrazit kurz'}</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  // Klávesnicí se karta ovládá přes tlačítko v patičce, klik z něj probublá.
  if (onSelect) {
    return (
      <div onClick={onSelect} className="group block cursor-pointer">
        {cardContent}
      </div>
    );
  }

  // Dokončený kurz je klikací taky — detail kurzu slouží jako zpětný náhled.
  return (
    <Link href={`/courses/${id}`} className="group block">
      {cardContent}
    </Link>
  );
}
