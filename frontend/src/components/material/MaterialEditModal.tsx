"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import {
  catalogsApi,
  getResource,
  updateResource,
  uploadResourceFile,
  deleteResourceFile,
  listResourceComments,
  type ResourceComment,
} from "@/lib/api-client";
import type { CourseSubject, CourseTarget, PubResource, PubResourceFile } from "@/api";
import { Difficulty, EduLevel } from "@/api";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
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

interface MaterialEditModalProps {
  isOpen: boolean;
  resourceId: number | null;
  onClose: () => void;
  onUpdated?: (resource: PubResource) => void;
}

const EDU_LEVEL_OPTIONS: { value: EduLevel; label: string }[] = [
  { value: EduLevel.Primary, label: "Základní škola" },
  { value: EduLevel.Secondary, label: "Střední škola" },
  { value: EduLevel.Higher, label: "Vysoká škola" },
];

interface FormState {
  title: string;
  subjectId: string;
  targetId: string;
  educationLevel: EduLevel;
  difficultyLevel: Difficulty | "";
  description: string;
}

const FORM_ID = "material-edit-form";

export function MaterialEditModal({ isOpen, resourceId, onClose, onUpdated }: MaterialEditModalProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [allowForks, setAllowForks] = useState<boolean>(false);
  const [existingFiles, setExistingFiles] = useState<PubResourceFile[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<Set<number>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || resourceId == null) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSubmitting(false);
    setNewFiles([]);
    setFilesToDelete(new Set());
    setComments([]);

    // Komentáře od garanta (např. u vráceného materiálu) – načítáme zvlášť,
    // aby případná chyba nezablokovala načtení formuláře.
    listResourceComments(resourceId)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch(() => {
        // komentáře nemusí existovat
      });

    Promise.all([
      getResource(resourceId),
      catalogsApi.listCourseSubjects(),
      catalogsApi.listCourseTargets(),
    ])
      .then(([resource, subjectsData, targetsData]) => {
        if (cancelled) return;
        setSubjects(subjectsData);
        setTargets(targetsData);
        setExistingFiles(resource.files ?? []);
        setAllowForks(resource.allowForks ?? false);
        setForm({
          title: resource.title,
          subjectId: resource.subjectId != null ? String(resource.subjectId) : "",
          targetId: resource.targetId != null ? String(resource.targetId) : "",
          educationLevel: resource.educationLevel,
          difficultyLevel: resource.difficultyLevel ?? "",
          description: resource.description ?? "",
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("MaterialEditModal: failed to load resource", err);
          setError("Materiál se nepodařilo načíst.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, resourceId]);

  const handleFilePick = (picked: FileList | null) => {
    if (!picked) return;
    const incoming = Array.from(picked);
    setNewFiles((prev) => {
      const known = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...incoming.filter((f) => !known.has(`${f.name}:${f.size}`))];
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (submitting) return;
    handleFilePick(e.dataTransfer.files);
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDeleteExisting = (fileId: number) => {
    setFilesToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const fileLabelFromPath = (filename: string) => {
    const parts = filename.split("/");
    return parts[parts.length - 1] || filename;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || resourceId == null) return;

    const title = form.title.trim();
    const description = form.description.trim();

    if (title.length < 3) {
      setError("Název materiálu musí mít alespoň 3 znaky.");
      return;
    }
    if (!form.subjectId) {
      setError("Vyberte kategorii (obor).");
      return;
    }
    if (!form.targetId) {
      setError("Vyberte cílovou skupinu.");
      return;
    }
    if (!form.educationLevel) {
      setError("Vyberte úroveň vzdělání.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await updateResource(resourceId, {
        title,
        description: description || null,
        subjectId: Number(form.subjectId),
        targetId: Number(form.targetId),
        educationLevel: form.educationLevel,
        difficultyLevel: form.difficultyLevel || undefined,
        allowForks,
      });

      for (const fileId of filesToDelete) {
        await deleteResourceFile(resourceId, fileId);
      }
      for (const file of newFiles) {
        await uploadResourceFile(resourceId, file);
      }

      const updated = await getResource(resourceId);
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      console.error("MaterialEditModal: update failed", err);
      setError(err instanceof Error ? err.message : "Materiál se nepodařilo upravit.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleExistingFiles = existingFiles.filter((f) => !filesToDelete.has(f.fileId));

  // Base UI Select: placeholder je položka s `value: null` v `items`.
  const subjectItems = [
    { label: "Kategorie", value: null },
    ...subjects.map((s) => ({ label: s.name, value: String(s.subjectId) })),
  ];
  const targetItems = [
    { label: "Cílová skupina", value: null },
    ...targets.map((t) => ({ label: t.name, value: String(t.targetId) })),
  ];
  const difficultyItems = [
    { label: "Obtížnost", value: null },
    ...DIFFICULTY_ORDER.map((value) => ({ label: DIFFICULTY_LABELS[value], value })),
  ];

  const isReady = !loading && form !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Upravit materiál"
      maxWidth="max-w-xl"
      footer={
        isReady ? (
          <>
            <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
              Zrušit
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              size="lg"
              disabled={submitting || (form?.title.trim().length ?? 0) < 3}
            >
              {submitting ? "Ukládání…" : "Uložit změny"}
            </Button>
          </>
        ) : undefined
      }
    >
      {!isReady || !form ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Načítání…</p>
          {error && (
            <Alert variant="error">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
          {comments.length > 0 && (
            <Alert variant="warning">
              <AlertTitle className="text-xs">Komentáře od garanta</AlertTitle>
              <AlertDescription>
                <ul className="flex flex-col gap-2">
                  {comments.map((c) => (
                    <li key={c.commentId} className="text-xs">
                      <span className="font-medium">{c.authorDisplayName ?? "Garant"}:</span>{" "}
                      <span className="whitespace-pre-wrap">{c.comment}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((s) => (s ? { ...s, title: e.target.value } : s))}
            placeholder="Název materiálu"
            maxLength={120}
          />

          <Select
            items={subjectItems}
            value={form.subjectId === "" ? null : form.subjectId}
            onValueChange={(value) =>
              setForm((s) => (s ? { ...s, subjectId: value == null ? "" : String(value) } : s))
            }
          >
            <SelectTrigger className="w-full" aria-label="Kategorie">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subjectItems.map((item) => (
                <SelectItem key={item.value ?? "none"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              items={targetItems}
              value={form.targetId === "" ? null : form.targetId}
              onValueChange={(value) =>
                setForm((s) => (s ? { ...s, targetId: value == null ? "" : String(value) } : s))
              }
            >
              <SelectTrigger className="w-full" aria-label="Cílová skupina">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targetItems.map((item) => (
                  <SelectItem key={item.value ?? "none"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={EDU_LEVEL_OPTIONS}
              value={form.educationLevel}
              onValueChange={(value) =>
                setForm((s) => (s ? { ...s, educationLevel: value as EduLevel } : s))
              }
            >
              <SelectTrigger className="w-full" aria-label="Úroveň vzdělání">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDU_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={difficultyItems}
              value={form.difficultyLevel === "" ? null : form.difficultyLevel}
              onValueChange={(value) =>
                setForm((s) =>
                  s ? { ...s, difficultyLevel: value == null ? "" : (value as Difficulty) } : s,
                )
              }
            >
              <SelectTrigger className="w-full" aria-label="Obtížnost">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficultyItems.map((item) => (
                  <SelectItem key={item.value ?? "none"} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stávající přílohy */}
          {visibleExistingFiles.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">Přílohy</p>
              <ul className="flex flex-col gap-1">
                {visibleExistingFiles.map((file) => (
                  <li
                    key={file.fileId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs text-foreground">
                      <FileText className="size-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{fileLabelFromPath(file.filename)}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleDeleteExisting(file.fileId)}
                      disabled={submitting}
                      aria-label={`Odebrat přílohu ${file.filename}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Přidání nových příloh */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-md border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center"
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="h-auto flex-col gap-2 py-2"
            >
              <Plus className="size-7" strokeWidth={1.75} />
              <span className="text-sm font-medium">Nahrát podklady</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => handleFilePick(e.target.files)}
            />

            {newFiles.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1 text-left">
                {newFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-xs text-foreground">
                      <FileText className="size-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeNewFile(index)}
                      disabled={submitting}
                      aria-label={`Odebrat soubor ${file.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Textarea
            value={form.description}
            onChange={(e) => setForm((s) => (s ? { ...s, description: e.target.value } : s))}
            placeholder="Popis"
            rows={3}
            maxLength={1000}
          />

          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={allowForks}
              onCheckedChange={(checked) => setAllowForks(checked === true)}
              disabled={submitting}
            />
            Povolit ostatním vytvářet kopie tohoto materiálu
          </Label>

          {error && (
            <Alert variant="error">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </form>
      )}
    </Modal>
  );
}
