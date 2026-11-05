"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, FileText, Trash2 } from "lucide-react";
import {
  catalogsApi,
  createResource,
  uploadResourceFile,
  getResource,
} from "@/lib/api-client";
import type {
  BloomLevel,
  CourseBlock,
  CourseEqfLevel,
  CourseLevel,
  CourseSubject,
  CourseTarget,
  CourseType,
  KrauuCompetence,
  PubResource,
} from "@/api";
import { Difficulty, EduLevel } from "@/api";
import { DIFFICULTY_LABELS, DIFFICULTY_ORDER } from "@/lib/difficulty";
import { catalogLabel, groupKrauuCompetences } from "@/lib/course-categories";
import {
  Alert,
  AlertDescription,
  Button,
  CatalogMultiSelect,
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
  eqfLevelId: string;
  courseTypeId: string;
  blockId: string;
  levelId: string;
  educationLevel: EduLevel;
  difficultyLevel: Difficulty | "";
  krauuCompetenceIds: number[];
  bloomLevelIds: number[];
  description: string;
  allowForks: boolean;
}

const INITIAL_FORM: FormState = {
  title: "",
  subjectId: "",
  targetId: "",
  eqfLevelId: "",
  courseTypeId: "",
  blockId: "",
  levelId: "",
  educationLevel: EduLevel.Higher,
  difficultyLevel: "",
  krauuCompetenceIds: [],
  bloomLevelIds: [],
  description: "",
  allowForks: false,
};

const FORM_ID = "material-create-form";

export function MaterialCreateModal({ isOpen, onClose, onCreated }: MaterialCreateModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [targets, setTargets] = useState<CourseTarget[]>([]);
  const [eqfLevels, setEqfLevels] = useState<CourseEqfLevel[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [blocks, setBlocks] = useState<CourseBlock[]>([]);
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [krauuCompetences, setKrauuCompetences] = useState<KrauuCompetence[]>([]);
  const [bloomLevels, setBloomLevels] = useState<BloomLevel[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(INITIAL_FORM);
    setFiles([]);
    setError(null);
    setSubmitting(false);

    let cancelled = false;
    setLoadingCatalogs(true);
    Promise.all([
      catalogsApi.listCourseSubjects(),
      catalogsApi.listCourseTargets(),
      catalogsApi.listCourseEqfLevels(),
      catalogsApi.listCourseTypes(),
      catalogsApi.listCourseBlocks(),
      catalogsApi.listCourseLevels(),
      catalogsApi.listKrauuCompetences(),
      catalogsApi.listBloomLevels(),
    ])
      .then(([subjectsData, targetsData, eqfData, typesData, blocksData, levelsData, krauuData, bloomData]) => {
        if (cancelled) return;
        setSubjects(subjectsData);
        setTargets(targetsData);
        setEqfLevels(eqfData);
        setCourseTypes(typesData);
        setBlocks(blocksData);
        setLevels(levelsData);
        setKrauuCompetences(krauuData);
        setBloomLevels(bloomData);
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
    if (!form.eqfLevelId) {
      setError("Vyberte EQF úroveň.");
      return;
    }
    if (!form.courseTypeId) {
      setError("Vyberte typ materiálu.");
      return;
    }
    if (form.krauuCompetenceIds.length === 0) {
      setError("Vyberte alespoň jednu KRAUU kompetenci.");
      return;
    }
    if (form.bloomLevelIds.length === 0) {
      setError("Vyberte alespoň jednu úroveň Bloomovy taxonomie.");
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
        eqfLevelId: Number(form.eqfLevelId),
        courseTypeId: Number(form.courseTypeId),
        blockId: form.blockId ? Number(form.blockId) : null,
        levelId: form.levelId ? Number(form.levelId) : null,
        educationLevel: form.educationLevel,
        difficultyLevel: form.difficultyLevel || undefined,
        krauuCompetenceIds: form.krauuCompetenceIds,
        bloomLevelIds: form.bloomLevelIds,
        allowForks: form.allowForks,
      });

      for (const file of files) {
        await uploadResourceFile(created.resourceId, file);
      }

      // Materiál zůstává jako koncept (draft). Ke schválení ho uživatel odešle
      // později tlačítkem „Odeslat ke schválení" v přehledu Moje sbírka.
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

  // Base UI Select: placeholder je položka s `value: null` v `items`.
  const subjectItems = [
    { label: "Kategorie", value: null },
    ...subjects.map((s) => ({ label: s.name, value: String(s.subjectId) })),
  ];
  const targetItems = [
    { label: "Cílová skupina", value: null },
    ...targets.map((t) => ({ label: t.name, value: String(t.targetId) })),
  ];
  const eqfItems = [
    { label: "EQF úroveň", value: null },
    ...eqfLevels.map((l) => ({ label: `${l.code} – ${l.name}`, value: String(l.eqfLevelId) })),
  ];
  const courseTypeItems = [
    { label: "Typ", value: null },
    ...courseTypes.map((t) => ({ label: t.name, value: String(t.typeId) })),
  ];
  const blockItems = [
    { label: "Tematický blok", value: null },
    ...blocks.map((b) => ({ label: b.name, value: String(b.blockId) })),
  ];
  const levelItems = [
    { label: "Zkušenost s AI", value: null },
    ...levels.map((l) => ({ label: l.name, value: String(l.levelId) })),
  ];
  const difficultyItems = [
    { label: "Obtížnost", value: null },
    ...DIFFICULTY_ORDER.map((value) => ({ label: DIFFICULTY_LABELS[value], value })),
  ];
  const krauuGroups = groupKrauuCompetences(krauuCompetences).map(({ area, competences }) => ({
    label: area.name,
    options: competences.map((c) => ({ value: c.krauuId, label: catalogLabel(c) })),
  }));
  const bloomOptions = bloomLevels.map((b) => ({ value: b.bloomId, label: catalogLabel(b) }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Vytvořit nový materiál"
      maxWidth="max-w-xl"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
            Zrušit akci
          </Button>
          <Button type="submit" form={FORM_ID} size="lg" disabled={submitting || form.title.trim().length < 3}>
            {submitting ? "Vytvářím…" : "Vytvořit materiál"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
          placeholder="Název materiálu"
          maxLength={120}
        />

        <Select
          items={subjectItems}
          value={form.subjectId === "" ? null : form.subjectId}
          onValueChange={(value) => setForm((s) => ({ ...s, subjectId: value == null ? "" : String(value) }))}
          disabled={loadingCatalogs}
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
            onValueChange={(value) => setForm((s) => ({ ...s, targetId: value == null ? "" : String(value) }))}
            disabled={loadingCatalogs}
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
            onValueChange={(value) => setForm((s) => ({ ...s, educationLevel: value as EduLevel }))}
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
              setForm((s) => ({ ...s, difficultyLevel: value == null ? "" : (value as Difficulty) }))
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            items={eqfItems}
            value={form.eqfLevelId === "" ? null : form.eqfLevelId}
            disabled={loadingCatalogs}
            onValueChange={(value) => setForm((s) => ({ ...s, eqfLevelId: value == null ? "" : String(value) }))}
          >
            <SelectTrigger className="w-full" aria-label="EQF úroveň">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eqfItems.map((item) => (
                <SelectItem key={item.value ?? "none"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={courseTypeItems}
            value={form.courseTypeId === "" ? null : form.courseTypeId}
            disabled={loadingCatalogs}
            onValueChange={(value) => setForm((s) => ({ ...s, courseTypeId: value == null ? "" : String(value) }))}
          >
            <SelectTrigger className="w-full" aria-label="Typ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courseTypeItems.map((item) => (
                <SelectItem key={item.value ?? "none"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={blockItems}
            value={form.blockId === "" ? null : form.blockId}
            disabled={loadingCatalogs}
            onValueChange={(value) => setForm((s) => ({ ...s, blockId: value == null ? "" : String(value) }))}
          >
            <SelectTrigger className="w-full" aria-label="Tematický blok">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {blockItems.map((item) => (
                <SelectItem key={item.value ?? "none"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={levelItems}
            value={form.levelId === "" ? null : form.levelId}
            disabled={loadingCatalogs}
            onValueChange={(value) => setForm((s) => ({ ...s, levelId: value == null ? "" : String(value) }))}
          >
            <SelectTrigger className="w-full" aria-label="Zkušenost s AI">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelItems.map((item) => (
                <SelectItem key={item.value ?? "none"} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <CatalogMultiSelect
            values={form.krauuCompetenceIds}
            onValueChange={(next) => setForm((s) => ({ ...s, krauuCompetenceIds: next }))}
            groups={krauuGroups}
            placeholder="KRAUU kompetence"
            disabled={loadingCatalogs || submitting}
            className="w-full"
          />
          <CatalogMultiSelect
            values={form.bloomLevelIds}
            onValueChange={(next) => setForm((s) => ({ ...s, bloomLevelIds: next }))}
            options={bloomOptions}
            placeholder="Bloomova taxonomie"
            disabled={loadingCatalogs || submitting}
            className="w-full"
          />
        </div>

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

          {files.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1 text-left">
              {files.map((file, index) => (
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
                    onClick={() => removeFile(index)}
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
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          placeholder="Popis"
          rows={3}
          maxLength={1000}
        />

        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={form.allowForks}
            onCheckedChange={(checked) => setForm((s) => ({ ...s, allowForks: checked === true }))}
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
    </Modal>
  );
}
