'use client';

import { X } from 'lucide-react';
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui';
import { PODCAST_SPEAKER_LABELS, type PodcastLine } from '@/lib/module-materials';
import { cn } from '@/lib/utils';

const SPEAKER_CLASS = {
  host: 'bg-gradient-r/15 text-gradient-r',
  expert: 'bg-tip/10 text-tip',
} as const;

// Prepis bez casovych znacek (backend je nevraci), jen poradi replik
export function PodcastTranscriptList({ lines, className }: { lines: PodcastLine[]; className?: string }) {
  if (lines.length === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Přepis není k dispozici.</p>;
  }
  return (
    <ol className={cn('flex flex-col gap-2.5', className)}>
      {lines.map((line, i) => (
        <li key={i} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 text-sm">
          <span className={cn('self-start justify-self-start rounded-full px-2 py-0.5 text-[11px] font-semibold', SPEAKER_CLASS[line.speaker])}>
            {PODCAST_SPEAKER_LABELS[line.speaker]}
          </span>
          <span className="break-words text-foreground">{line.text}</span>
        </li>
      ))}
    </ol>
  );
}

interface PodcastTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: PodcastLine[];
  moduleTitle: string;
}

export function PodcastTranscriptDialog({ open, onOpenChange, lines, moduleTitle }: PodcastTranscriptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[min(85vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="leading-tight font-semibold">Přepis podcastu</DialogTitle>
            <DialogDescription className="truncate text-xs">{moduleTitle}</DialogDescription>
          </div>
          <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Zavřít" />}>
            <X />
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <PodcastTranscriptList lines={lines} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
