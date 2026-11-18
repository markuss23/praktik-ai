'use client';

import { useMemo, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import type { Module } from '@/api';
import { Button } from '@/components/ui';
import { MindMap } from '@/components/module/MindMap';
import { MindMapViewDialog } from '@/components/module/MindMapDialog';
import { PodcastPlayer } from '@/components/module/PodcastPlayer';
import { PodcastTranscriptList } from '@/components/module/PodcastTranscript';
import { hasMindmap, hasPodcast, parsePodcastTranscript } from '@/lib/module-materials';

// Podcast a myslenkova mapa modulu pri schvalovani, jen ke cteni
export function ReviewModuleMaterials({ module }: { module: Module }) {
  const [mapOpen, setMapOpen] = useState(false);
  const lines = useMemo(() => parsePodcastTranscript(module.podcastTranscript), [module.podcastTranscript]);
  const mindmap = hasMindmap(module) ? module.mindmap ?? null : null;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Studenti najdou podcast a mapu v panelu modulu vedle AI tutora. Na pojem z mapy se můžou tutora rovnou zeptat.
      </p>

      {hasPodcast(module) && (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">Podcast</h3>
          <PodcastPlayer variant="full" moduleId={module.moduleId} moduleTitle={module.title} transcript={lines} />
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">Přepis</div>
            <PodcastTranscriptList lines={lines} className="max-h-80 overflow-y-auto px-4 py-3" />
          </div>
        </section>
      )}

      {mindmap && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">Myšlenková mapa</h3>
            <Button variant="outline" size="sm" onClick={() => setMapOpen(true)}>
              <Maximize2 data-icon="inline-start" />
              Zobrazit větší
            </Button>
          </div>
          <div className="rounded-xl border border-border p-3">
            <MindMap map={mindmap} />
          </div>
          <MindMapViewDialog open={mapOpen} onOpenChange={setMapOpen} map={mindmap} moduleTitle={module.title} />
        </section>
      )}
    </div>
  );
}
