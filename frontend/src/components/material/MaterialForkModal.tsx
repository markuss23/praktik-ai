"use client";

import { useEffect, useState } from "react";

import { Button, Input, Label, Modal, Textarea } from "@/components/ui";
import { createResourceFork } from "@/components/material/api";
import { apiErrorDetail } from "@/lib/api-client";

interface MaterialForkModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: number;
  defaultTitle: string;
  defaultDescription?: string;
  /** Zavolá se po úspěšném vytvoření kopie (předá ID nového draftu). */
  onForked?: (newResourceId: number) => void;
}

const FORM_ID = "material-fork-form";

/**
 * Modal pro vytvoření kopie (forku) veřejného materiálu do vlastní sbírky.
 * Vznikne nový materiál ve stavu draft; soubory a hodnocení se nekopírují.
 */
export function MaterialForkModal({
  isOpen,
  onClose,
  resourceId,
  defaultTitle,
  defaultDescription = "",
  onForked,
}: MaterialForkModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, defaultTitle, defaultDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 1) {
      setError("Zadej název kopie.");
      return;
    }
    if (trimmed.length > 255) {
      setError("Název může mít maximálně 255 znaků.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createResourceFork(resourceId, {
        title: trimmed,
        description: description.trim() || null,
      });
      onForked?.(created.resourceId);
      onClose();
    } catch (err) {
      setError(await apiErrorDetail(err, "Kopii se nepodařilo vytvořit."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Vytvořit kopii materiálu"
      description="Vznikne nový materiál ve tvé sbírce (jako koncept), který můžeš upravit. Soubory a hodnocení se nekopírují."
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" form={FORM_ID} size="lg" disabled={submitting || title.trim().length < 1}>
            {submitting ? "Vytvářím…" : "Vytvořit kopii"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="fork-title">Název kopie</Label>
          <Input
            id="fork-title"
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Název materiálu"
            maxLength={255}
            disabled={submitting}
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="fork-description">Popis (nepovinný)</Label>
          <Textarea
            id="fork-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Popis"
            rows={3}
            disabled={submitting}
            className="resize-y"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
