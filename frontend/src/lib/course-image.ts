import { API_BASE_URL, backendUrl } from "./constants";

/** Výchozí náhled kurzu, dokud lektor nenahraje nebo nevygeneruje vlastní. */
export const DEFAULT_COURSE_IMAGE = "/courseai2.png";

/** Rozměry náhledu — stejné jako normalizace na backendu (16:9). */
export const COURSE_IMAGE_WIDTH = 1280;
export const COURSE_IMAGE_HEIGHT = 720;
export const COURSE_IMAGE_ASPECT = COURSE_IMAGE_WIDTH / COURSE_IMAGE_HEIGHT;

export const COURSE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const COURSE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** Výřez ve zdrojovém obrázku v pixelech (tvar `croppedAreaPixels` z react-easy-crop). */
export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** URL náhledu pro `<img>`; backend vrací cestu `/api/v1/...` bez prefixu proxy. */
export function courseImageSrc(imageUrl?: string | null): string {
  return imageUrl ? backendUrl(imageUrl) : DEFAULT_COURSE_IMAGE;
}

/**
 * Obrázek z backendu je už 1280×720 WebP — Next optimalizátor by ho jen znovu
 * stahoval přes proxy, proto se zobrazuje přímo. Blob/data URL (náhled před
 * uložením) optimalizovat nejde vůbec.
 */
export function isUnoptimizedCourseImage(src: string): boolean {
  return src.startsWith(API_BASE_URL) || src.startsWith("blob:") || src.startsWith("data:");
}

/**
 * Náhled ještě neuloženého obrázku. Data URL místo blob URL: nemusí se ručně
 * uvolňovat, takže nezmizí, když se formulář dočasně odmontuje.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Obrázek se nepodařilo načíst."));
    reader.readAsDataURL(blob);
  });
}

/** Chybová hláška pro vybraný soubor, nebo null, když je v pořádku. */
export function courseImageFileError(file: File): string | null {
  if (!COURSE_IMAGE_ACCEPT.split(",").includes(file.type)) {
    return "Podporované formáty jsou JPG, PNG a WebP.";
  }
  if (file.size > COURSE_IMAGE_MAX_BYTES) {
    return "Obrázek nesmí být větší než 10 MB.";
  }
  return null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Obrázek se nepodařilo načíst."));
    image.src = src;
  });
}

/**
 * Vyřízne `area` ze zdrojového obrázku a vykreslí ji do 1280×720 JPEG.
 * Bílé pozadí pod průhledností drží stejný výsledek jako normalizace na backendu.
 */
export async function renderCourseImage(src: string, area: PixelArea): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = COURSE_IMAGE_WIDTH;
  canvas.height = COURSE_IMAGE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Prohlížeč nepodporuje úpravu obrázků.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Obrázek se nepodařilo zpracovat."))),
      "image/jpeg",
      0.92,
    );
  });
}
