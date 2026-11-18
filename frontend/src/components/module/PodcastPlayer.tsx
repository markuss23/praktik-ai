'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Headphones, Loader2, Pause, Play } from 'lucide-react';
import { Button, Slider, useToast } from '@/components/ui';
import { fetchModulePodcast } from '@/lib/api-client';
import { saveBlob } from '@/lib/download';
import { estimatePodcastMinutes, formatDuration, type PodcastLine } from '@/lib/module-materials';
import { cn, czechPlural } from '@/lib/utils';

const SPEEDS = [1, 1.25, 1.5, 0.75];

interface PodcastPlayerProps {
  moduleId: number;
  moduleTitle: string;
  transcript: PodcastLine[];
  // compact = karta v panelu modulu, full = admin panel
  variant: 'compact' | 'full';
  onShowTranscript?: () => void;
}

export function PodcastPlayer({ moduleId, moduleTitle, transcript, variant, onShowTranscript }: PodcastPlayerProps) {
  const toast = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const minutes = estimatePodcastMinutes(transcript);

  // Odchod z modulu behem stahovani nesmi pustit audio na pozadi
  const mountedRef = useRef(false);

  // Uvolneni blobu a zastaveni pri odchodu z modulu
  useEffect(() => {
    mountedRef.current = true;
    const audio = audioRef.current;
    return () => {
      mountedRef.current = false;
      audio?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, []);

  const loadBlob = async (): Promise<Blob> => {
    if (blobRef.current) return blobRef.current;
    const blob = await fetchModulePodcast(moduleId);
    blobRef.current = blob;
    return blob;
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || loading) return;
    if (!urlRef.current) {
      setLoading(true);
      try {
        const blob = await loadBlob();
        if (!mountedRef.current) return;
        urlRef.current = URL.createObjectURL(blob);
        audio.src = urlRef.current;
        audio.playbackRate = SPEEDS[speedIndex];
      } catch (err) {
        if (mountedRef.current) toast.error(err, 'Podcast se nepodařilo načíst.');
        return;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
    setStarted(true);
    if (audio.paused) {
      try {
        await audio.play();
      } catch (err) {
        // Pauza pred rozbehnutim prehravani play() prerusi, to neni chyba
        if ((err as { name?: string } | null)?.name !== 'AbortError') toast.error(err, 'Podcast nejde přehrát.');
      }
    } else {
      audio.pause();
    }
  };

  const cycleSpeed = () => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const download = async () => {
    try {
      saveBlob(await loadBlob(), `${moduleTitle || 'podcast'}.wav`);
    } catch (err) {
      toast.error(err, 'Podcast se nepodařilo stáhnout.');
    }
  };

  const seek = (value: number | readonly number[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    if (audioRef.current && Number.isFinite(next)) audioRef.current.currentTime = next as number;
    setCurrent(next as number);
  };

  const speedLabel = `${String(SPEEDS[speedIndex]).replace('.', ',')}×`;
  const totalLabel = duration > 0 ? formatDuration(duration) : `asi ${minutes} min`;

  const audio = (
    <audio
      ref={audioRef}
      preload="none"
      className="hidden"
      onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
      // Neobvykla WAV hlavicka muze dat Infinity
      onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
    />
  );

  const playButton = (size: 'sm' | 'lg') => (
    <Button
      variant="brand-solid"
      size={size === 'lg' ? 'icon-lg' : 'icon'}
      onClick={() => void togglePlay()}
      disabled={loading}
      aria-label={playing ? 'Pozastavit podcast' : 'Přehrát podcast'}
      className={cn('shrink-0 rounded-full', size === 'lg' ? 'size-10' : 'size-8')}
    >
      {loading ? <Loader2 className="animate-spin" /> : playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
    </Button>
  );

  const slider = (
    <Slider
      value={[Math.min(current, duration || current)]}
      min={0}
      max={duration || 1}
      step={1}
      disabled={!duration}
      onValueChange={seek}
      aria-label="Pozice v podcastu"
      getAriaLabel={() => 'Pozice v podcastu'}
      getAriaValueText={(_formatted, value) => `${formatDuration(value)} z ${totalLabel}`}
    />
  );

  const times = (
    <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
      <span>{formatDuration(current)}</span>
      <span>{totalLabel}</span>
    </div>
  );

  const speedButton = (
    <Button variant="ghost" size="xs" onClick={cycleSpeed} aria-label={`Rychlost přehrávání ${speedLabel}`} className="min-w-11 tabular-nums">
      {speedLabel}
    </Button>
  );

  const downloadButton = (
    <Button variant="ghost" size="icon-xs" onClick={() => void download()} aria-label="Stáhnout podcast" title="Stáhnout WAV">
      <Download />
    </Button>
  );

  if (variant === 'full') {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
        {audio}
        {playButton('lg')}
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-foreground">Podcast k modulu</span>
            <span className="text-xs text-muted-foreground">
              Moderátor a expert · {transcript.length} {czechPlural(transcript.length, 'replika', 'repliky', 'replik')}
            </span>
          </div>
          {slider}
          {times}
        </div>
        <div className="flex items-center gap-1">
          {speedButton}
          {downloadButton}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {audio}
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-r/15 text-gradient-r">
          <Headphones className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Podcast</span>
          <span className="block text-xs text-muted-foreground">asi {minutes} min · rozhovor</span>
        </span>
        {!started && onShowTranscript && (
          <Button variant="ghost" size="icon-sm" onClick={onShowTranscript} aria-label="Přepis podcastu" title="Přepis">
            <FileText />
          </Button>
        )}
        {playButton('sm')}
      </div>
      {started && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted p-2.5">
          {slider}
          {times}
          <div className="flex items-center justify-between">
            {speedButton}
            <span className="flex items-center gap-0.5">
              {onShowTranscript && (
                <Button variant="ghost" size="xs" onClick={onShowTranscript}>
                  <FileText data-icon="inline-start" />
                  Přepis
                </Button>
              )}
              {downloadButton}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
