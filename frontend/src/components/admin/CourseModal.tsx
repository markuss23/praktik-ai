'use client';

import { useState } from "react";
import type { CourseBlock } from "@/api";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";

interface CourseModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  formData: {
    courseId: number | null;
    title: string;
    description: string;
    courseBlockId?: number;
  };
  blocks?: CourseBlock[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: any) => void;
}

const FORM_ID = "course-modal-form";

export function CourseModal({
  isOpen,
  mode,
  formData,
  blocks = [],
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
}: CourseModalProps) {
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = formData.title.trim();
    const desc = formData.description.trim();

    if (title.length < 3 || title.length > 120) {
      setValidationError('Název kurzu musí mít 3 až 120 znaků.');
      return;
    }
    if (desc.length < 3 || desc.length > 500) {
      setValidationError('Popis kurzu musí mít 3 až 500 znaků.');
      return;
    }
    if (mode === 'create' && blocks.length > 0 && !formData.courseBlockId) {
      setValidationError('Vyberte tematický blok.');
      return;
    }

    setValidationError('');
    onSubmit(e);
  };

  const displayError = validationError || error;
  const blockItems = [
    { label: 'Vyberte blok…', value: null },
    ...blocks.map((b) => ({ label: b.name, value: b.blockId })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Vytvořit nový kurz' : 'Editovat kurz'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={loading} onClick={onClose}>
            Zrušit
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            disabled={
              loading || formData.title.trim().length < 3 || formData.description.trim().length < 3
            }
          >
            {loading ? 'Ukládání…' : mode === 'create' ? 'Vytvořit kurz' : 'Uložit změny'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        {displayError && (
          <Alert variant="error">
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-title">Název kurzu *</Label>
          <Input
            type="text"
            id="course-title"
            required
            minLength={3}
            maxLength={120}
            value={formData.title}
            onChange={(e) => onChange({ ...formData, title: e.target.value })}
            placeholder="např. Jak komunikovat s AI?"
          />
          <span className="text-xs text-muted-foreground">{formData.title.length}/120</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="course-description">Popis kurzu *</Label>
          <Textarea
            id="course-description"
            required
            rows={4}
            minLength={3}
            maxLength={500}
            value={formData.description}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
            placeholder="Stručný popis kurzu…"
          />
          <span className="text-xs text-muted-foreground">{formData.description.length}/500</span>
        </div>

        {blocks.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-block">Tematický blok *</Label>
            <Select
              items={blockItems}
              value={formData.courseBlockId ?? null}
              onValueChange={(value) =>
                onChange({ ...formData, courseBlockId: value == null ? undefined : Number(value) })
              }
            >
              <SelectTrigger id="course-block" size="default" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b) => (
                  <SelectItem key={b.blockId} value={b.blockId}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form>
    </Modal>
  );
}
