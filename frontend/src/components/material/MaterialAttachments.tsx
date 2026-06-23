"use client";

import { useState } from "react";
import { Download, Folder } from "lucide-react";
import JSZip from "jszip";
import type { MaterialAttachment } from "./types";

/** Stáhne soubor jako blob a vyvolá download dialog; při selhání otevře v nové kartě. */
async function downloadAttachment(attachment: MaterialAttachment): Promise<void> {
  if (!attachment.url) return;
  try {
    const res = await fetch(attachment.url);
    if (!res.ok) throw new Error(`Stažení selhalo (${res.status})`);
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  }
}

/** Nahradí znaky nepovolené v názvu souboru podtržítkem. */
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "soubory";
}

/** Stáhne všechny přílohy zabalené do jednoho ZIP archivu (jeden download dialog). */
async function downloadAllAsZip(
  attachments: MaterialAttachment[],
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();
  let added = 0;

  await Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.url) return;
      try {
        const res = await fetch(attachment.url);
        if (!res.ok) return;
        const blob = await res.blob();
        // Ošetření duplicitních názvů: soubor.pdf, soubor (1).pdf, …
        const count = usedNames.get(attachment.name) ?? 0;
        usedNames.set(attachment.name, count + 1);
        let entryName = attachment.name;
        if (count > 0) {
          const dot = entryName.lastIndexOf(".");
          entryName =
            dot > 0
              ? `${entryName.slice(0, dot)} (${count})${entryName.slice(dot)}`
              : `${entryName} (${count})`;
        }
        zip.file(entryName, blob);
        added += 1;
      } catch {
        // Soubor, který se nepodaří načíst, do archivu nepřidáme.
      }
    }),
  );

  if (added === 0) throw new Error("Žádný soubor se nepodařilo stáhnout.");

  const content = await zip.generateAsync({ type: "blob" });
  const objectUrl = window.URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}

interface MaterialAttachmentsProps {
  attachments: MaterialAttachment[];
  /** Použije se pro pojmenování ZIP archivu (např. „<title>.zip"). */
  title?: string;
}

/** Sekce „Přílohy" na detailu materiálu — seznam souborů se stažením po jednom i najednou. */
export function MaterialAttachments({ attachments, title }: MaterialAttachmentsProps) {
  const downloadable = attachments.filter((a) => a.url);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const handleDownload = async (attachment: MaterialAttachment) => {
    if (downloadingId || downloadingAll) return;
    setDownloadingId(attachment.id);
    try {
      await downloadAttachment(attachment);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (downloadingAll || downloadable.length === 0) return;
    setDownloadingAll(true);
    setDownloadError(null);
    try {
      const base = title ? sanitizeFileName(title) : "prilohy";
      await downloadAllAsZip(downloadable, `${base}.zip`);
    } catch {
      setDownloadError("Soubory se nepodařilo stáhnout. Zkus to prosím znovu.");
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-black">Přílohy</h2>
        {downloadable.length > 1 && (
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            <Download size={14} strokeWidth={1.75} />
            {downloadingAll ? "Stahuji…" : "Stáhnout vše"}
          </button>
        )}
      </div>

      {downloadError && (
        <p className="mb-3 text-xs text-red-600">{downloadError}</p>
      )}

      <ul className="space-y-2">
        {attachments.map((attachment, index) => (
          <li
            key={attachment.id}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3 row-fade-in transition-colors hover:bg-gray-50/60"
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 text-gray-700">
                <Folder size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-xs text-gray-500">
                {attachment.format}
                {attachment.sizeLabel ? ` ${attachment.sizeLabel}` : ""}
              </span>
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                disabled={!attachment.url || downloadingId === attachment.id || downloadingAll}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium transition-colors ${
                  attachment.url
                    ? "text-gray-700 hover:bg-gray-50"
                    : "text-gray-400 cursor-not-allowed"
                } disabled:opacity-60`}
              >
                <Download size={14} strokeWidth={1.75} />
                {downloadingId === attachment.id ? "Stahuji…" : "Stáhnout"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
