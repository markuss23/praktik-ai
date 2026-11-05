/**
 * Podklady ke kurzu (nahrání přes `uploadCourseFile`). Zrcadlí backendové
 * `SUPPORTED_EXTENSIONS` a `MAX_FILE_SIZE` v `backend/agents/base/loaders/base.py`
 * — při změně seznamu na backendu je potřeba upravit i tady, jinak upload
 * skončí chybou 400 „Nepodporovaný typ souboru“.
 *
 * Starý Word (.doc) MarkItDown neumí, proto v seznamu chybí.
 */
const DOCUMENT_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.xlsx', '.xls', '.csv', '.html', '.htm',
  '.txt', '.text', '.md', '.markdown', '.json', '.jsonl',
  '.epub', '.ipynb', '.zip', '.jpg', '.jpeg', '.png',
];
const AUDIO_VIDEO_EXTENSIONS = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.mpeg', '.mpga'];

export const COURSE_FILE_EXTENSIONS = [...DOCUMENT_EXTENSIONS, ...AUDIO_VIDEO_EXTENSIONS];

/** Hodnota pro `<input type="file" accept>`. */
export const COURSE_FILE_ACCEPT = COURSE_FILE_EXTENSIONS.join(',');

/** 25 MB — limit přepisu audia v OpenAI, backend ho hlídá u všech souborů. */
export const COURSE_FILE_MAX_SIZE = 25 * 1024 * 1024;

/** Popisek pod výběrem souboru. */
export const COURSE_FILE_FORMATS_LABEL =
  'PDF, Word (.docx), PowerPoint, Excel, Markdown, text, obrázky (JPG, PNG), audio a video — max 25 MB';

/** Vrátí důvod, proč backend soubor odmítne, nebo `null`, pokud projde. */
export function courseFileError(file: File): string | null {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  if (!COURSE_FILE_EXTENSIONS.includes(ext)) {
    return ext === '.doc'
      ? `Soubor „${file.name}“ je ve starém formátu Wordu (.doc). Uložte ho jako .docx.`
      : `Soubor „${file.name}“ má nepodporovaný formát.`;
  }
  if (file.size > COURSE_FILE_MAX_SIZE) {
    return `Soubor „${file.name}“ je příliš velký (max 25 MB).`;
  }
  return null;
}
