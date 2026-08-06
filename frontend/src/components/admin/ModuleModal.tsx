'use client';

import { Course } from "@/api";
import { Alert, AlertDescription, Button, Input, Label, Modal } from "@/components/ui";

interface ModuleModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: {
    moduleId: number | null;
    title: string;
    courseId: number;
  };
  courses: Course[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: any) => void;
}

const FORM_ID = "module-modal-form";

export function ModuleModal({
  isOpen,
  mode,
  formData,
  courses,
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
}: ModuleModalProps) {
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
      </form>
    </Modal>
  );
}
