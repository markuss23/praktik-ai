'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { AlertTriangle, Loader2, ZoomIn, ZoomOut } from 'lucide-react';

import { Button, Modal, Slider } from '@/components/ui';
import { COURSE_IMAGE_ASPECT, COURSE_IMAGE_HEIGHT, COURSE_IMAGE_WIDTH, renderCourseImage } from '@/lib/course-image';

const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

interface CourseImageCropModalProps {
  /** Vybraný soubor; null = dialog je zavřený. */
  file: File | null;
  onCancel: () => void;
  /**
   * Hotový výřez 1280×720. Dokud promise běží, tlačítko se točí; vyhozená
   * chyba se ukáže v dialogu a ten zůstane otevřený.
   */
  onConfirm: (image: Blob) => Promise<void> | void;
}

/**
 * Ořez náhledového obrázku do 16:9. Výřez vyplňuje celou plochu (`objectFit="cover"`),
 * takže výchozí stav = vycentrovaný ořez na plnou šířku/výšku — „Použít" bez
 * úprav dá stejný výsledek jako automatické oříznutí na backendu.
 */
export function CourseImageCropModal({ file, onCancel, onConfirm }: CourseImageCropModalProps) {
  if (!file) return null;
  // Nový soubor = nový stav dialogu (posun, zoom, chyba).
  return <CropDialog key={`${file.name}-${file.size}-${file.lastModified}`} file={file} onCancel={onCancel} onConfirm={onConfirm} />;
}

function CropDialog({ file, onCancel, onConfirm }: { file: File } & Omit<CourseImageCropModalProps, 'file'>) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleConfirm = async () => {
    if (!src || !area) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(await renderCourseImage(src, area));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Obrázek se nepodařilo uložit.');
      setSaving(false);
    }
  };

  // Výřez menší než výsledných 1280 px se zvětší — upozornit, ať autor ví proč je rozmazaný.
  const upscaled = area !== null && Math.round(area.width) < COURSE_IMAGE_WIDTH;

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onCancel();
      }}
      title="Upravit náhledový obrázek"
      description={`Posuňte a přibližte obrázek, aby výřez seděl. Uloží se v poměru 16:9 (${COURSE_IMAGE_WIDTH} × ${COURSE_IMAGE_HEIGHT} px).`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Zrušit
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={saving || !area}>
            {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {saving ? 'Ukládání…' : 'Použít obrázek'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              maxZoom={MAX_ZOOM}
              aspect={COURSE_IMAGE_ASPECT}
              objectFit="cover"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Oddálit"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - ZOOM_STEP))}
          >
            <ZoomOut />
          </Button>
          <Slider
            aria-label="Přiblížení"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={[zoom]}
            onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Přiblížit"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          >
            <ZoomIn />
          </Button>
        </div>

        {upscaled && area && (
          <p className="flex items-start gap-2 text-xs text-warning">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            Výřez má jen {Math.round(area.width)} × {Math.round(area.height)} px, obrázek se zvětší a může být méně ostrý.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Důležitý obsah držte spíš uprostřed — užší karty kurzu okraje obrázku trochu oříznou.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}
