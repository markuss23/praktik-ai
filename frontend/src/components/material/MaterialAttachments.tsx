"use client";

import { useState } from "react";
import { Download, Folder } from "lucide-react";
import JSZip from "jszip";
import { fetchResourceFileBlob } from "@/lib/api-client";
import { saveBlob } from "@/lib/download";
import type { MaterialAttachment } from "./types";

/** Zda přílohu vůbec lze stáhnout (reálný soubor v API, nebo přímá URL u mocků). */
function isDownloadable(attachment: MaterialAttachment): boolean {
  return (
    (attachment.resourceId != null && attachment.fileId != null) || !!attachment.url
  );
}

/** Načte obsah přílohy — přes backend (s tokenem), nebo z přímé URL u mocků. */
async function loadAttachmentBlob(attachment: MaterialAttachment): Promise<Blob> {
  if (attachment.resourceId != null && attachment.fileId != null) {
    return fetchResourceFileBlob(attachment.resourceId, attachment.fileId);
  }
  if (attachment.url) {
    const res = await fetch(attachment.url);
    if (!res.ok) throw new Error(`Stažení selhalo (${res.status})`);
    return res.blob();
  }
  throw new Error("Soubor není k dispozici.");
}

/** Stáhne soubor jako blob a vyvolá download dialog. */
async function downloadAttachment(attachment: MaterialAttachment): Promise<void> {
  saveBlob(await loadAttachmentBlob(attachment), attachment.name);
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
      if (!isDownloadable(attachment)) return;
      try {
        const blob = await loadAttachmentBlob(attachment);
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

  saveBlob(await zip.generateAsync({ type: "blob" }), zipName);
}

interface MaterialAttachmentsProps {
  attachments: MaterialAttachment[];
  /** Použije se pro pojmenování ZIP archivu (např. „<title>.zip"). */
  title?: string;
}

/** Sekce „Přílohy" na detailu materiálu — seznam souborů se stažením po jednom i najednou. */
export function MaterialAttachments({ attachments, title }: MaterialAttachmentsProps) {
  const downloadable = attachments.filter(isDownloadable);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const handleDownload = async (attachment: MaterialAttachment) => {
    if (downloadingId || downloadingAll) return;
    setDownloadingId(attachment.id);
    setDownloadError(null);
    try {
      await downloadAttachment(attachment);
    } catch (err) {
      console.error("downloadAttachment failed:", err);
      setDownloadError(
        err instanceof Error
          ? `„${attachment.name}" se nepodařilo stáhnout: ${err.message}`
          : `„${attachment.name}" se nepodařilo stáhnout.`,
      );
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
        <h2 className="text-lg font-bold text-foreground">Přílohy</h2>
        {downloadable.length > 1 && (
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-60"
          >
            <Download size={14} strokeWidth={1.75} />
            {downloadingAll ? "Stahuji…" : "Stáhnout vše"}
          </button>
        )}
      </div>

      {downloadError && (
        <p className="mb-3 text-xs text-destructive">{downloadError}</p>
      )}

      <ul className="space-y-2">
        {attachments.map((attachment, index) => (
          <li
            key={attachment.id}
            className="flex items-center justify-between bg-card border border-border rounded-md px-4 py-3 row-fade-in transition-colors hover:bg-muted/50/60"
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center size-9 rounded-md bg-muted text-foreground">
                <Folder size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{attachment.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs text-muted-foreground">
                {attachment.format}
                {attachment.sizeLabel ? ` ${attachment.sizeLabel}` : ""}
              </span>
              <button
                type="button"
                onClick={() => handleDownload(attachment)}
                disabled={
                  !isDownloadable(attachment) ||
                  downloadingId === attachment.id ||
                  downloadingAll
                }
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium transition-colors ${
                  isDownloadable(attachment)
                    ? "text-foreground hover:bg-muted/50"
                    : "text-muted-foreground cursor-not-allowed"
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
