import type { Course, Module, PubResource } from "@/api";
import { cn } from "@/lib/utils";

interface CategoryItem {
  code: string;
  name: string;
  description?: string;
}

interface CategoryGroupProps {
  label: string;
  items: CategoryItem[];
  className?: string;
}

/** Jedna skupina kategorií (např. „KRAUU kompetence") jako štítky; prázdná se nevykreslí. */
export function CategoryGroup({ label, items, className }: CategoryGroupProps) {
  if (items.length === 0) return null;
  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.code}
            title={item.description || undefined}
            className="inline-flex max-w-full items-baseline gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-foreground"
          >
            <span className="shrink-0 font-semibold text-muted-foreground">{item.code}</span>
            <span className="min-w-0 break-words">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CourseCategoriesProps {
  course: Pick<Course, "krauuCompetences" | "bloomLevels" | "crossSubjects">;
  className?: string;
}

/** KRAUU kompetence, Bloomova taxonomie a průřezové obory kurzu (jen pro čtení). */
export function CourseCategories({ course, className }: CourseCategoriesProps) {
  const krauu = course.krauuCompetences ?? [];
  const bloom = course.bloomLevels ?? [];
  const cross = course.crossSubjects ?? [];
  if (krauu.length + bloom.length + cross.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <CategoryGroup label="KRAUU kompetence" items={krauu} />
      <CategoryGroup label="Bloomova taxonomie" items={bloom} />
      <CategoryGroup label="Průřezové obory" items={cross} />
    </div>
  );
}

interface ModuleCategoriesProps {
  module: Pick<Module, "neuroPrinciples" | "krauuCompetences" | "bloomLevels">;
  className?: string;
}

/** Neurovědní principy, KRAUU kompetence a Bloomova taxonomie modulu (jen pro čtení). */
export function ModuleCategories({ module, className }: ModuleCategoriesProps) {
  const neuro = module.neuroPrinciples ?? [];
  const krauu = module.krauuCompetences ?? [];
  const bloom = module.bloomLevels ?? [];
  if (neuro.length + krauu.length + bloom.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <CategoryGroup label="Neurovědní principy" items={neuro} />
      <CategoryGroup label="KRAUU kompetence" items={krauu} />
      <CategoryGroup label="Bloomova taxonomie" items={bloom} />
    </div>
  );
}

interface MaterialCategoriesProps {
  material: Pick<PubResource, "krauuCompetences" | "bloomLevels">;
  className?: string;
}

/** KRAUU kompetence a Bloomova taxonomie materiálu z veřejné databáze (jen pro čtení). */
export function MaterialCategories({ material, className }: MaterialCategoriesProps) {
  const krauu = material.krauuCompetences ?? [];
  const bloom = material.bloomLevels ?? [];
  if (krauu.length + bloom.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <CategoryGroup label="KRAUU kompetence" items={krauu} />
      <CategoryGroup label="Bloomova taxonomie" items={bloom} />
    </div>
  );
}
