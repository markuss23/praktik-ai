import { AttachType } from '@/api';

/**
 * Lokalizované popisky typu přílohy pro UI (filtr ve veřejné databázi).
 * Žije mimo `src/api/models/AttachType.ts` schválně — ten soubor je
 * generovaný OpenAPI generatorem, takže by se runtime helpery při
 * regeneraci klienta zahodily.
 */
export const FILE_TYPE_LABELS: Record<AttachType, string> = {
  pdf: 'PDF',
  docx: 'Word',
  pptx: 'PowerPoint',
  image: 'Obrázek',
  video: 'Video',
  other: 'Ostatní',
};

/** Pořadí pro select — od nejčastějšího typu podkladu. */
export const FILE_TYPE_ORDER: AttachType[] = [
  AttachType.Pdf,
  AttachType.Docx,
  AttachType.Pptx,
  AttachType.Image,
  AttachType.Video,
  AttachType.Other,
];
