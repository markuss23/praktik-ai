"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, FileText, Trash2 } from "lucide-react";
import {
  catalogsApi,
  getResource,
  updateResource,
  uploadResourceFile,
  deleteResourceFile,
} from "@/lib/api-client";
import type { CourseSubject, CourseTarget, PubResource, PubResourceFile } from "@/api";
import { Difficulty, EduLevel } from "@/api";
import { useModalDismiss } from "@/hooks/useModalDismiss";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";

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

export function MaterialEditModal({ isOpen, resourceId, onClose, onUpdated }: MaterialEditModalProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [allowForks, setAllowForks] = useState<boolean>(false);
  const [existingFiles, setExistingFiles] = useState<PubResourceFile[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<Set<number>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useModalDismiss(isOpen, () => {
    if (!submitting) onClose();
  });

  useEffect(() => {
    if (!isOpen || resourceId == null) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSubmitting(false);
    setNewFiles([]);
    setFilesToDelete(new Set());

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200"
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold text-black">Upravit materiál</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 hover:bg-gray-100 rounded text-gray-500"
            aria-label="Zavřít"
          >
            <X size={20} />
          </button>
        </div>

        {loading || !form ? (
          <div className="px-6 pb-6">
            <p className="text-sm text-gray-500">Načítání…</p>
            {error && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="px-6 pb-6 space-y-4">
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((s) => (s ? { ...s, title: e.target.value } : s))}
                placeholder="Název materiálu"
                maxLength={120}
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />

              <select
                value={form.subjectId}
                onChange={(e) => setForm((s) => (s ? { ...s, subjectId: e.target.value } : s))}
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              >
                <option value="">Kategorie</option>
                {subjects.map((subject) => (
                  <option key={subject.subjectId} value={subject.subjectId}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={form.targetId}
                  onChange={(e) => setForm((s) => (s ? { ...s, targetId: e.target.value } : s))}
                  className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  <option value="">Cílová skupina</option>
                  {targets.map((target) => (
                    <option key={target.targetId} value={target.targetId}>
                      {target.name}
                    </option>
                  ))}
                </select>

                <select
                  value={form.educationLevel}
                  onChange={(e) =>
                    setForm((s) => (s ? { ...s, educationLevel: e.target.value as EduLevel } : s))
                  }
                  required
                  className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  {EDU_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  value={form.difficultyLevel}
                  onChange={(e) =>
                    setForm((s) =>
                      s ? { ...s, difficultyLevel: e.target.value as Difficulty | "" } : s,
                    )
                  }
                  className="px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                >
                  <option value="">Obtížnost</option>
                  {DIFFICULTY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {DIFFICULTY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stávající přílohy */}
              {visibleExistingFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Přílohy</p>
                  <ul className="space-y-1">
                    {visibleExistingFiles.map((file) => (
                      <li
                        key={file.fileId}
                        className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-md px-3 py-2"
                      >
                        <span className="flex items-center gap-2 min-w-0 text-xs text-gray-700">
                          <FileText size={14} strokeWidth={1.75} className="flex-shrink-0" />
                          <span className="truncate">{fileLabelFromPath(file.filename)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDeleteExisting(file.fileId)}
                          disabled={submitting}
                          className="p-1 text-gray-400 hover:text-red-600"
                          aria-label={`Odebrat přílohu ${file.filename}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Přidání nových příloh */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="rounded-md border-2 border-dashed border-purple-300 bg-purple-50/40 px-4 py-8 text-center"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="inline-flex flex-col items-center gap-2 text-purple-700 hover:text-purple-800 disabled:opacity-60"
                >
                  <Plus size={28} strokeWidth={1.75} />
                  <span className="text-sm font-medium">Nahrát podklady</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => handleFilePick(e.target.files)}
                />

                {newFiles.length > 0 && (
                  <ul className="mt-4 space-y-1 text-left">
                    {newFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-md px-3 py-2"
                      >
                        <span className="flex items-center gap-2 min-w-0 text-xs text-gray-700">
                          <FileText size={14} strokeWidth={1.75} className="flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeNewFile(index)}
                          disabled={submitting}
                          className="p-1 text-gray-400 hover:text-red-600"
                          aria-label={`Odebrat soubor ${file.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <textarea
                value={form.description}
                onChange={(e) => setForm((s) => (s ? { ...s, description: e.target.value } : s))}
                placeholder="Popis"
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-60"
              >
                Zrušit
              </button>
              <button
                type="submit"
                disabled={submitting || form.title.trim().length < 3}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? "Ukládání…" : "Uložit změny"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
