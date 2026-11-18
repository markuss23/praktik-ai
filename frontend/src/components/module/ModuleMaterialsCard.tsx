'use client';

import { useMemo, useState } from 'react';
import { Network } from 'lucide-react';
import type { MindMap as MindMapData, Module } from '@/api';
import { Button } from '@/components/ui';
import { mindmapStats, parsePodcastTranscript } from '@/lib/module-materials';
import { czechPlural } from '@/lib/utils';
import { PodcastPlayer } from './PodcastPlayer';
import { PodcastTranscriptDialog } from './PodcastTranscript';

interface ModuleMaterialsCardProps {
  moduleId: number;
  moduleTitle: string;
  podcastTranscript?: Module['podcastTranscript'];
  mindmap?: MindMapData | null;
  onOpenMap: () => void;
}

// Karta v panelu modulu mezi zalozkami a AI tutorem; bez podcastu i mapy se nezobrazi
export function ModuleMaterialsCard({ moduleId, moduleTitle, podcastTranscript, mindmap, onOpenMap }: ModuleMaterialsCardProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const lines = useMemo(() => parsePodcastTranscript(podcastTranscript), [podcastTranscript]);
  const showPodcast = Array.isArray(podcastTranscript);
  const showMap = !!mindmap && mindmap.branches.length > 0;
  if (!showPodcast && !showMap) return null;

  const stats = mindmap ? mindmapStats(mindmap) : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-card p-4" style={{ border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-semibold text-foreground">Materiály k modulu</h3>
      {showPodcast && (
        <PodcastPlayer
          variant="compact"
          moduleId={moduleId}
          moduleTitle={moduleTitle}
          transcript={lines}
          onShowTranscript={() => setTranscriptOpen(true)}
        />
      )}
      {showMap && stats && (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tip/10 text-tip">
            <Network className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Myšlenková mapa</span>
            <span className="block text-xs text-muted-foreground">
              {stats.concepts} {czechPlural(stats.concepts, 'pojem', 'pojmy', 'pojmů')} v {stats.topics} {stats.topics === 1 ? 'tématu' : 'tématech'}
            </span>
          </span>
          <Button variant="outline" size="sm" onClick={onOpenMap} aria-label="Otevřít myšlenkovou mapu">
            Otevřít
          </Button>
        </div>
      )}
      {showPodcast && (
        <PodcastTranscriptDialog open={transcriptOpen} onOpenChange={setTranscriptOpen} lines={lines} moduleTitle={moduleTitle} />
      )}
    </div>
  );
}
