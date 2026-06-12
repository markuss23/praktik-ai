"use client";

import { useState } from "react";
import { Download, Folder } from "lucide-react";
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

interface MaterialAttachmentsProps {
  attachments: MaterialAttachment[];
}

/** Sekce „Přílohy" na detailu materiálu — seznam souborů se stažením po jednom i najednou. */
export function MaterialAttachments({ attachments }: MaterialAttachmentsProps) {
  const downloadable = attachments.filter((a) => a.url);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

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
    try {
      for (const attachment of downloadable) {
        await downloadAttachment(attachment);
      }
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
