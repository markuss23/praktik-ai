"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, FileText, Trash2 } from "lucide-react";
import {
  catalogsApi,
  createResource,
  uploadResourceFile,
  updateResourceStatus,
  getResource,
} from "@/lib/api-client";
import type { CourseSubject, CourseTarget, PubResource } from "@/api";
import { Difficulty, EduLevel, UpdateResourceStatusNewStatusEnum } from "@/api";
import { useModalDismiss } from "@/hooks/useModalDismiss";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";

interface MaterialCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (resource: PubResource) => void;
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

const INITIAL_FORM: FormState = {
  title: "",
  subjectId: "",
  targetId: "",
  educationLevel: EduLevel.Higher,
  difficultyLevel: "",
  description: "",
};

export function MaterialCreateModal({ isOpen, onClose, onCreated }: MaterialCreateModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useModalDismiss(isOpen, () => {
    if (!submitting) onClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM);
    setFiles([]);
    setError(null);
    setSubmitting(false);

    let cancelled = false;
    setLoadingCatalogs(true);
    Promise.all([catalogsApi.listCourseSubjects(), catalogsApi.listCourseTargets()])
      .then(([subjectsData, targetsData]) => {
        if (cancelled) return;
        setSubjects(subjectsData);
        setTargets(targetsData);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("MaterialCreateModal: failed to load catalogs", err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalogs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilePick = (picked: FileList | null) => {
    if (!picked) return;
    const incoming = Array.from(picked);
    setFiles((prev) => {
      const known = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [
        ...prev,
        ...incoming.filter((f) => !known.has(`${f.name}:${f.size}`)),
      ];
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (submitting) return;
    handleFilePick(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();

    if (title.length < 3) {
      setError("Název materiálu musí mít alespoň 3 znaky.");
      return;
    }
    if (!form.educationLevel) {
      setError("Vyberte úroveň vzdělání.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const created = await createResource({
        title,
        description: description || null,
        subjectId: form.subjectId ? Number(form.subjectId) : null,
        targetId: form.targetId ? Number(form.targetId) : null,
        educationLevel: form.educationLevel,
        difficultyLevel: form.difficultyLevel || undefined,
      });

      for (const file of files) {
        await uploadResourceFile(created.resourceId, file);
      }

      // Materiál se vytvoří jako draft – odešleme ho ke schválení (draft → pending_review)
      await updateResourceStatus(created.resourceId, UpdateResourceStatusNewStatusEnum.PendingReview);

      // Načteme finální stav (pending_review + soubory) pro okamžité zobrazení ve sbírce
      const finalResource = await getResource(created.resourceId);
      onCreated?.(finalResource);
      onClose();
    } catch (err) {
      console.error("MaterialCreateModal: create failed", err);
      setError(err instanceof Error ? err.message : "Materiál se nepodařilo vytvořit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200"
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold text-black">Vytvořit nový materiál</h3>
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

        <div className="px-6 pb-6 space-y-4">
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Název materiálu"
            maxLength={120}
            className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
          />

          <select
            value={form.subjectId}
            onChange={(e) => setForm((s) => ({ ...s, subjectId: e.target.value }))}
            disabled={loadingCatalogs}
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
              onChange={(e) => setForm((s) => ({ ...s, targetId: e.target.value }))}
              disabled={loadingCatalogs}
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
                setForm((s) => ({ ...s, educationLevel: e.target.value as EduLevel }))
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
                setForm((s) => ({ ...s, difficultyLevel: e.target.value as Difficulty | "" }))
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

            {files.length > 0 && (
              <ul className="mt-4 space-y-1 text-left">
                {files.map((file, index) => (
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
                      onClick={() => removeFile(index)}
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
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
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
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
          >
            Zrušit akci
          </button>
          <button
            type="submit"
            disabled={submitting || form.title.trim().length < 3}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Odesílání…" : "Odeslat ke schválení"}
          </button>
        </div>
      </form>
    </div>
  );
}
