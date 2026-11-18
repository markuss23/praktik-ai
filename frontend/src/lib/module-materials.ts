import type { MindMap, Module } from '@/api';

// Podcast a myslenkova mapa modulu, sdilene adminem, studentem i nahledem

export type PodcastSpeaker = 'host' | 'expert';

export interface PodcastLine {
  speaker: PodcastSpeaker;
  text: string;
}

export const PODCAST_SPEAKER_LABELS: Record<PodcastSpeaker, string> = {
  host: 'Moderátor',
  expert: 'Expert',
};

// Data podcastu a mapy, ktera admin drzi u kazdeho modulu
export type ModuleMaterials = Pick<Module, 'podcastTranscript' | 'mindmap'>;

// API vraci prepis jako volne objekty; nevalidni radky se zahodi
export function parsePodcastTranscript(raw: Module['podcastTranscript']): PodcastLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((line) => {
    const text = typeof line?.text === 'string' ? line.text.trim() : '';
    if (!text) return [];
    const speaker: PodcastSpeaker = line?.speaker === 'expert' ? 'expert' : 'host';
    return [{ speaker, text }];
  });
}

// null = modul podcast nema
export function hasPodcast(module: ModuleMaterials | null | undefined): boolean {
  return Array.isArray(module?.podcastTranscript);
}

export function hasMindmap(module: ModuleMaterials | null | undefined): boolean {
  return !!module?.mindmap && module.mindmap.branches.length > 0;
}

// Odhad delky z poctu slov (namluvena cestina zhruba 150 slov za minutu)
export function estimatePodcastMinutes(lines: PodcastLine[]): number {
  const words = lines.reduce((sum, line) => sum + line.text.split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / 150));
}

export function mindmapStats(map: MindMap): { topics: number; concepts: number } {
  const topics = map.branches.length;
  return { topics, concepts: topics + map.branches.reduce((sum, b) => sum + b.children.length, 0) };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
