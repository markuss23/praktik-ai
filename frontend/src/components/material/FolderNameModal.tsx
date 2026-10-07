"use client";

import { useEffect, useState } from "react";

import { Button, Input, Modal } from "@/components/ui";

interface FolderNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
  initialName?: string;
  title?: string;
  submitLabel?: string;
}

const FORM_ID = "folder-name-form";

export function FolderNameModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = "",
  title = "Pojemnujte novou složku",
  submitLabel = "Vytvořit složku",
}: FolderNameModalProps) {
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      setError("Zadejte název složky.");
      return;
    }
    if (trimmed.length > 60) {
      setError("Název složky může mít maximálně 60 znaků.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Složku se nepodařilo vytvořit.");
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
      title={title}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
            Zrušit akci
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            disabled={submitting || name.trim().length < 1}
          >
            {submitting ? "Ukládání…" : submitLabel}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nová složka"
          maxLength={60}
          aria-invalid={error ? true : undefined}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
