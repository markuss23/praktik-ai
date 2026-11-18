import { type CourseBlock } from "@/api";
import { courseBlockTone } from "@/lib/course-categories";
import { cn } from "@/lib/utils";

interface CourseBlockEyebrowProps {
  block?: CourseBlock | null;
  className?: string;
}

// Nadtitulek s názvem tematického bloku nad názvem kurzu (karta i řádek katalogu).
export function CourseBlockEyebrow({ block, className }: CourseBlockEyebrowProps) {
  if (!block) return null;
  const tone = courseBlockTone(block);

  return (
    <p
      data-course-block={tone ?? undefined}
      className={cn(
        "flex items-center gap-2 text-[11px] leading-4 font-semibold tracking-[0.14em] uppercase",
        tone ? "text-block-ink" : "text-muted-foreground",
        className,
      )}
    >
      {tone && <span aria-hidden className="h-0.5 w-4 shrink-0 rounded-full bg-block" />}
      {block.name}
    </p>
  );
}
