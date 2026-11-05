'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageOff, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';

import type { ImageGenerationProgressResponse } from '@/api';
import { CourseImageCropModal } from '@/components/admin/CourseImageCropModal';
import { Button, ConfirmModal, useToast } from '@/components/ui';
import { CourseImage } from '@/components/ui/CourseImage';
import {
  deleteCourseImage,
  generateCourseImage,
  getCourse,
  getCourseImageGenerationProgress,
  uploadCourseImage,
} from '@/lib/api-client';
import { readApiErrorDetail } from '@/lib/api-error';
import {
  COURSE_IMAGE_ACCEPT,
  COURSE_IMAGE_HEIGHT,
  COURSE_IMAGE_WIDTH,
  blobToDataUrl,
  courseImageFileError,
} from '@/lib/course-image';
import { cn } from '@/lib/utils';

const POLL_MS = 3000;
// Generování obvykle trvá desítky sekund; po této době přestaneme čekat.
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

// Náhled je na mobilu přes celou šířku, od sm vedle akcí v šířce w-72.
const PREVIEW_SIZES = '(min-width: 640px) 288px, 100vw';

const HINT = `Zobrazuje se na kartě kurzu. Ukládá se v poměru 16:9 (${COURSE_IMAGE_WIDTH} × ${COURSE_IMAGE_HEIGHT} px), větší i menší obrázek se ořízne a přizpůsobí. JPG, PNG nebo WebP do 10 MB.`;

interface FieldLayoutProps {
  labelClassName?: string;
  preview: React.ReactNode;
  actions: React.ReactNode;
  error: string | null;
}

function FieldLayout({ labelClassName, preview, actions, error }: FieldLayoutProps) {
  return (
    <div>
      <span className={labelClassName ?? 'block text-sm font-medium text-foreground mb-2'}>Náhledový obrázek</span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:w-72">
          {preview}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">{actions}</div>
          <p className="text-xs text-muted-foreground">{HINT}</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/** Skrytý file input + validace; vybraný soubor jde do dialogu s ořezem. */
function useImageFilePicker(setError: (msg: string | null) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={COURSE_IMAGE_ACCEPT}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const fileError = courseImageFileError(file);
        setError(fileError);
        if (!fileError) setCropFile(file);
      }}
    />
  );

  return { input, open: () => inputRef.current?.click(), cropFile, closeCrop: () => setCropFile(null) };
}

// ── Existující kurz: změny se ukládají hned ────────────────────────────────

interface CourseImageFieldProps {
  courseId: number;
  imageUrl: string | null | undefined;
  onChange: (imageUrl: string | null) => void;
  labelClassName?: string;
  /** Kurz je ve schvalování / schválený — obrázek se jako ostatní údaje nemění. */
  locked?: boolean;
}

/**
 * Náhledový obrázek uloženého kurzu — nahrání s ořezem, AI generování, odebrání.
 * Ukládá se hned (mimo tlačítko „Uložit změny"), stejně jako podklady kurzu.
 */
export function CourseImageField({ courseId, imageUrl, onChange, labelClassName, locked = false }: CourseImageFieldProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'delete' | null>(null);
  const [confirm, setConfirm] = useState<'generate' | 'delete' | null>(null);
  // Běžící AI generování: výchozí obrázek (pro detekci dokončení) a poslední známý krok.
  const [generation, setGeneration] = useState<{ baseline: string | null; startedAt: number } | null>(null);
  const [progress, setProgress] = useState<ImageGenerationProgressResponse | null>(null);
  const picker = useImageFilePicker(setError);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const imageUrlRef = useRef(imageUrl ?? null);
  useEffect(() => {
    imageUrlRef.current = imageUrl ?? null;
  }, [imageUrl]);

  // Po otevření navaž na generování, které už běží (spuštěné při tvorbě kurzu nebo před refreshem).
  useEffect(() => {
    let cancelled = false;
    getCourseImageGenerationProgress(courseId)
      .then((p) => {
        if (cancelled || p.status !== 'running') return;
        setProgress(p);
        setGeneration({ baseline: imageUrlRef.current, startedAt: Date.now() });
      })
      .catch(() => {
        // bez průběhu prostě nic neběží
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // Polling generování. Průběh je na backendu jen v paměti jednoho workeru, takže
  // dokončení poznáme hlavně podle změny obrázku kurzu (ten je v DB); progress
  // slouží pro popisek kroku a hlášení chyby.
  useEffect(() => {
    if (!generation) return;
    let cancelled = false;
    let timer: number | undefined;

    const finish = (imageUrlAfter: string | null, failure: string | null) => {
      setGeneration(null);
      setProgress(null);
      if (failure) {
        setError(failure);
        toast.error(failure);
        return;
      }
      onChangeRef.current(imageUrlAfter);
      toast.success('Náhledový obrázek je vygenerovaný.');
    };

    const poll = async () => {
      try {
        const p = await getCourseImageGenerationProgress(courseId);
        if (cancelled) return;
        if (p.status === 'failed') {
          finish(null, p.error ? `Generování obrázku selhalo: ${p.error}` : 'Generování obrázku selhalo.');
          return;
        }
        if (p.status === 'running') setProgress(p);

        const course = await getCourse(courseId);
        if (cancelled) return;
        const current = course.imageUrl ?? null;
        if (current && current !== generation.baseline) {
          finish(current, null);
          return;
        }
      } catch {
        // přechodná chyba sítě — zkusí se znovu
      }
      if (Date.now() - generation.startedAt > GENERATION_TIMEOUT_MS) {
        finish(null, 'Generování obrázku trvá příliš dlouho. Zkuste stránku obnovit později.');
        return;
      }
      timer = window.setTimeout(poll, POLL_MS);
    };

    timer = window.setTimeout(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [generation, courseId, toast]);

  const startGeneration = async () => {
    setConfirm(null);
    setError(null);
    try {
      const p = await generateCourseImage(courseId);
      setProgress(p);
      setGeneration({ baseline: imageUrl ?? null, startedAt: Date.now() });
    } catch (err) {
      setError((await readApiErrorDetail(err)) ?? 'Generování obrázku se nepodařilo spustit.');
    }
  };

  const handleCropConfirm = async (image: Blob) => {
    try {
      const result = await uploadCourseImage(courseId, image);
      onChange(result.imageUrl ?? null);
      picker.closeCrop();
      setError(null);
      toast.success('Náhledový obrázek je uložený.');
    } catch (err) {
      // Chybu ukáže dialog s ořezem, ať se dá zkusit znovu.
      throw new Error((await readApiErrorDetail(err)) ?? 'Obrázek se nepodařilo nahrát.');
    }
  };

  const handleDelete = async () => {
    setConfirm(null);
    setBusy('delete');
    setError(null);
    try {
      await deleteCourseImage(courseId);
      onChange(null);
    } catch (err) {
      setError((await readApiErrorDetail(err)) ?? 'Obrázek se nepodařilo odebrat.');
    } finally {
      setBusy(null);
    }
  };

  const generating = generation !== null;
  const disabled = locked || generating || busy !== null;

  return (
    <>
      <FieldLayout
        labelClassName={labelClassName}
        error={error}
        preview={
          <>
            <CourseImage imageUrl={imageUrl} alt="Náhledový obrázek kurzu" sizes={PREVIEW_SIZES} className={cn(generating && 'opacity-40')} />
            {!imageUrl && !generating && (
              <span className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Výchozí obrázek
              </span>
            )}
            {generating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                <Loader2 className="size-6 animate-spin text-gradient-r" />
                <span className="text-xs font-medium text-foreground">
                  {progress && progress.step > 0
                    ? `${progress.label} (${progress.step}/${progress.total})`
                    : 'Generuji obrázek…'}
                </span>
              </div>
            )}
          </>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={picker.open} disabled={disabled}>
              <Upload data-icon="inline-start" />
              Nahrát z počítače
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (imageUrl ? setConfirm('generate') : void startGeneration())}
              disabled={disabled}
            >
              {generating ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Sparkles data-icon="inline-start" />}
              {generating ? 'Generuji…' : 'Vygenerovat AI'}
            </Button>
            {imageUrl && (
              <Button type="button" variant="ghost-destructive" size="sm" onClick={() => setConfirm('delete')} disabled={disabled}>
                {busy === 'delete' ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
                Odebrat
              </Button>
            )}
          </>
        }
      />
      {picker.input}

      <CourseImageCropModal file={picker.cropFile} onCancel={picker.closeCrop} onConfirm={handleCropConfirm} />

      <ConfirmModal
        isOpen={confirm === 'generate'}
        variant="warning"
        title="Vygenerovat nový obrázek?"
        message="Současný náhledový obrázek se po vygenerování nahradí novým."
        confirmLabel="Vygenerovat"
        onConfirm={() => void startGeneration()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        isOpen={confirm === 'delete'}
        variant="danger"
        title="Odebrat náhledový obrázek?"
        message="Kurz se vrátí k výchozímu obrázku."
        confirmLabel="Odebrat"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

// ── Nový kurz: výběr se použije až po jeho vytvoření ─────────────────────────

export type PendingCourseImage =
  | { kind: 'default' }
  | { kind: 'upload'; image: Blob; previewSrc: string }
  | { kind: 'generate' };

interface NewCourseImageFieldProps {
  value: PendingCourseImage;
  onChange: (value: PendingCourseImage) => void;
  disabled?: boolean;
  labelClassName?: string;
}

/**
 * Náhledový obrázek pro kurz, který ještě neexistuje: nahraný výřez se drží
 * v paměti a odešle se po vytvoření kurzu, AI generování se spustí tamtéž.
 */
export function NewCourseImageField({ value, onChange, disabled = false, labelClassName }: NewCourseImageFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const picker = useImageFilePicker(setError);

  const handleCropConfirm = async (image: Blob) => {
    onChange({ kind: 'upload', image, previewSrc: await blobToDataUrl(image) });
    picker.closeCrop();
    setError(null);
  };

  return (
    <>
      <FieldLayout
        labelClassName={labelClassName}
        error={error}
        preview={
          value.kind === 'generate' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-r/10 p-3 text-center">
              <Sparkles className="size-6 text-gradient-r" />
              <span className="text-xs font-medium text-foreground">Obrázek vygeneruje AI po vytvoření kurzu</span>
            </div>
          ) : (
            <>
              <CourseImage
                src={value.kind === 'upload' ? value.previewSrc : undefined}
                alt="Náhledový obrázek kurzu"
                sizes={PREVIEW_SIZES}
              />
              {value.kind === 'default' && (
                <span className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Výchozí obrázek
                </span>
              )}
            </>
          )
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={picker.open} disabled={disabled}>
              <Upload data-icon="inline-start" />
              Nahrát z počítače
            </Button>
            <Button
              type="button"
              variant={value.kind === 'generate' ? 'secondary' : 'outline'}
              size="sm"
              aria-pressed={value.kind === 'generate'}
              onClick={() => onChange({ kind: 'generate' })}
              disabled={disabled}
            >
              <Sparkles data-icon="inline-start" />
              Vygenerovat AI
            </Button>
            {value.kind !== 'default' && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ kind: 'default' })} disabled={disabled}>
                <ImageOff data-icon="inline-start" />
                Použít výchozí
              </Button>
            )}
          </>
        }
      />
      {picker.input}

      <CourseImageCropModal file={picker.cropFile} onCancel={picker.closeCrop} onConfirm={handleCropConfirm} />
    </>
  );
}
