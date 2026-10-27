'use client';

import type { BloomLevel, Course, KrauuCompetence, NeuroPrinciple } from "@/api";
import { Alert, AlertDescription, Button, Input, Label, Modal, Textarea } from "@/components/ui";
import { ModuleCategoryFields } from "./ModuleCategoryFields";
import type { ModuleCategoryValues } from "@/lib/course-categories";

/** Stejný limit jako backend (`Module.perex`: String(255)). */
export const MODULE_PEREX_MAX_LENGTH = 255;

export interface ModuleFormData {
  moduleId: number | null;
  title: string;
  perex: string;
  courseId: number;
  /** Neurovědní principy, KRAUU kompetence a Bloomova taxonomie modulu. */
  categories: ModuleCategoryValues;
}

interface ModuleModalProps<T extends ModuleFormData> {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: T;
  courses: Course[];
  neuroPrinciples: NeuroPrinciple[];
  krauuCompetences: KrauuCompetence[];
  bloomLevels: BloomLevel[];
  /** Zvýraznit prázdné povinné číselníky (po neúspěšném odeslání). */
  showCategoryErrors?: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: T) => void;
}

const FORM_ID = "module-modal-form";

/**
 * Formulář modulu: název, perex a pedagogické zařazení. AI generátor tato pole
 * naplní sám, autor je ale musí mít možnost upravit i mimo editor obsahu.
 */
export function ModuleModal<T extends ModuleFormData>({
  isOpen,
  mode,
  formData,
  courses,
  neuroPrinciples,
  krauuCompetences,
  bloomLevels,
  showCategoryErrors = false,
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
}: ModuleModalProps<T>) {
  const parentCourse = courses.find((course) => course.courseId === formData.courseId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Vytvořit nový modul' : 'Editovat modul'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={loading} onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" form={FORM_ID} size="lg" disabled={loading || formData.courseId === 0}>
            {loading ? 'Ukládání…' : mode === 'create' ? 'Vytvořit modul' : 'Uložit změny'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-5">
        {error && (
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mode === 'create' && (
          <div className="flex flex-col gap-1.5">
            {/* Kurz je daný kontextem, ze kterého se modal otevírá — jen se zobrazuje. */}
            <Label htmlFor="module-course">Kurz</Label>
            <Input id="module-course" value={parentCourse?.title ?? ''} disabled readOnly />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="module-title">Název modulu *</Label>
          <Input
            type="text"
            id="module-title"
            required
            value={formData.title}
            onChange={(e) => onChange({ ...formData, title: e.target.value })}
            placeholder="např. Co je prompt a jak funguje AI"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="module-perex">Perex</Label>
          <Textarea
            id="module-perex"
            rows={3}
            maxLength={MODULE_PEREX_MAX_LENGTH}
            value={formData.perex}
            onChange={(e) => onChange({ ...formData, perex: e.target.value })}
            placeholder="Krátké shrnutí, o čem modul je…"
            className="field-sizing-fixed min-h-0 resize-none"
          />
          <span className="text-xs text-muted-foreground">{formData.perex.length}/{MODULE_PEREX_MAX_LENGTH}</span>
        </div>

        <ModuleCategoryFields
          values={formData.categories}
          onChange={(categories) => onChange({ ...formData, categories })}
          neuroPrinciples={neuroPrinciples}
          krauuCompetences={krauuCompetences}
          bloomLevels={bloomLevels}
          showErrors={showCategoryErrors}
          columns={1}
          labelClassName="flex items-center text-sm leading-none font-medium mb-1.5"
          triggerClassName="w-full"
        />
      </form>
    </Modal>
  );
}
