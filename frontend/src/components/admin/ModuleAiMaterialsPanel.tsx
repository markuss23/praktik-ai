'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Info, Loader2, Maximize2, RefreshCw, Sparkles } from 'lucide-react';
import type { MindMap as MindMapData } from '@/api';
import { Alert, AlertDescription, AlertTitle, Button, ConfirmModal, Skeleton, useToast } from '@/components/ui';
import { MindMap } from '@/components/module/MindMap';
import { MindMapViewDialog } from '@/components/module/MindMapDialog';
import { PodcastPlayer } from '@/components/module/PodcastPlayer';
import { PodcastTranscriptList } from '@/components/module/PodcastTranscript';
import { generateModuleMindmap } from '@/lib/api-client';
import { readApiErrorDetail } from '@/lib/api-error';
import { hasMindmap, hasPodcast, parsePodcastTranscript, type ModuleMaterials } from '@/lib/module-materials';
import { cn } from '@/lib/utils';
import { MODULE_PODCAST_FINISHED_EVENT, useModulePodcastGeneration, type ModulePodcastFinishedDetail } from './ModulePodcastGenerationProvider';

// Kroky podcastu podle backendu (step 1-4); popis aktualniho kroku prijde v progress.label
const PODCAST_STEPS = [
  'Načtení obsahu modulu',
  'Scénář rozhovoru (AI)',
  'Namlouvání dvěma hlasy (AI)',
  'Uložení podcastu',
];

export type AiMaterialsView = 'podcast' | 'map';

interface ModuleAiMaterialsPanelProps {
  view: AiMaterialsView;
  moduleId: number;
  moduleTitle: string;
  materials: ModuleMaterials | undefined;
  // Proc generovani nejde spustit (neulozeny modul, bez textu, kurz ve schvalovani); null = jde
  blockReason: string | null;
  // Ulozi rozepsany text, backend generuje z obsahu v DB
  ensureSaved: () => Promise<boolean>;
  // Ulozeni selhalo; chybu (validace, toast) uz ukazal editor, panel jen preda rizeni
  onSaveFailed: () => void;
  onMindmapGenerated: (moduleId: number, mindmap: MindMapData) => void;
}

export function ModuleAiMaterialsPanel({
  view, moduleId, moduleTitle, materials, blockReason, ensureSaved, onSaveFailed, onMindmapGenerated,
}: ModuleAiMaterialsPanelProps) {
  const toast = useToast();
  const podcastGen = useModulePodcastGeneration();
  const [confirm, setConfirm] = useState<AiMaterialsView | null>(null);
  // Spousteni podcastu po modulech, at prepnuti modulu nezablokuje jiny
  const [podcastStarting, setPodcastStarting] = useState<Set<number>>(new Set());
  // Mapa se generuje v requestu; stav po modulech, aby prepnuti modulu nic nepomichalo
  const [mapBusy, setMapBusy] = useState<Set<number>>(new Set());
  const [mapErrors, setMapErrors] = useState<Record<number, string>>({});
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  // Novy podcast = nove audio, prehravac se proto vytvori znovu
  const [podcastVersion, setPodcastVersion] = useState(0);

  const podcastProgress = podcastGen.getProgress(moduleId);
  const podcastError = podcastGen.getError(moduleId);
  const lines = useMemo(() => parsePodcastTranscript(materials?.podcastTranscript), [materials?.podcastTranscript]);
  const podcastReady = hasPodcast(materials);
  const mindmap = hasMindmap(materials) ? materials?.mindmap ?? null : null;
  const mapGenerating = mapBusy.has(moduleId);
  const mapError = mapErrors[moduleId] ?? null;
  const startingPodcast = podcastStarting.has(moduleId);
  const podcastUnloaded = podcastGen.isUnloaded(moduleId);
  const [reloadingPodcast, setReloadingPodcast] = useState(false);

  const reloadPodcast = async () => {
    setReloadingPodcast(true);
    const ok = await podcastGen.reload(moduleId);
    setReloadingPodcast(false);
    if (!ok) toast.show({ variant: 'error', title: 'Podcast se nepodařilo načíst', message: 'Zkuste to za chvíli znovu nebo obnovte stránku.' });
  };

  // Bezici generovani (napr. po refreshi) se po otevreni modulu znovu sleduje
  useEffect(() => {
    // Neulozeny modul ma docasne zaporne ID
    if (moduleId > 0) podcastGen.resume(moduleId, moduleTitle);
    // resume je stabilni, nazev modulu jen do toastu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  useEffect(() => {
    const onFinished = (e: Event) => {
      const detail = (e as CustomEvent<ModulePodcastFinishedDetail>).detail;
      if (detail?.moduleId === moduleId && detail.status === 'completed') setPodcastVersion((v) => v + 1);
    };
    window.addEventListener(MODULE_PODCAST_FINISHED_EVENT, onFinished);
    return () => window.removeEventListener(MODULE_PODCAST_FINISHED_EVENT, onFinished);
  }, [moduleId]);

  const saveFirst = async (): Promise<boolean> => {
    if (await ensureSaved()) return true;
    onSaveFailed();
    return false;
  };

  const startPodcast = async () => {
    const id = moduleId;
    const title = moduleTitle;
    setPodcastStarting((prev) => new Set(prev).add(id));
    try {
      if (!(await saveFirst())) return;
      await podcastGen.start(id, title);
    } catch (err) {
      toast.show({
        variant: 'error',
        title: 'Generování podcastu se nepodařilo spustit',
        message: (await readApiErrorDetail(err)) ?? 'Zkuste to prosím znovu.',
      });
    } finally {
      setPodcastStarting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const generateMap = async () => {
    const id = moduleId;
    setMapBusy((prev) => new Set(prev).add(id));
    setMapErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      if (!(await saveFirst())) return;
      const result = await generateModuleMindmap(id);
      onMindmapGenerated(id, result.mindmap);
    } catch (err) {
      const detail = (await readApiErrorDetail(err)) ?? 'AI teď neodpověděla, zkuste to prosím znovu.';
      setMapErrors((prev) => ({ ...prev, [id]: detail }));
    } finally {
      setMapBusy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const generateButton = (label: string, onClick: () => void, busy: boolean) => (
    <Button variant="brand" onClick={onClick} disabled={!!blockReason || busy}>
      {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Sparkles data-icon="inline-start" />}
      {label}
    </Button>
  );

  const regenerateButton = (onClick: () => void, busy: boolean, busyLabel: string) => (
    <Button variant="outline" onClick={onClick} disabled={!!blockReason || busy}>
      {busy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
      {busy ? busyLabel : 'Vygenerovat znovu'}
    </Button>
  );

  const hint = (text: string) => (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{text}</span>
    </p>
  );

  const renderPodcast = () => (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Podcast k modulu</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          AI z textu modulu napíše rozhovor moderátora a experta (asi 5 minut) a namluví ho dvěma hlasy. Studenti si ho pustí v panelu modulu.
        </p>
      </div>

      {podcastError && !podcastProgress && (
        <Alert variant="error">
          <AlertCircle />
          <AlertTitle>Podcast se nepodařilo vytvořit</AlertTitle>
          <AlertDescription>{podcastError}</AlertDescription>
        </Alert>
      )}

      {podcastProgress ? (
        <PodcastProgressCard
          step={podcastProgress.step}
          total={podcastProgress.total}
          label={podcastProgress.label}
          failing={podcastGen.isFailing(moduleId)}
        />
      ) : !podcastReady && podcastUnloaded ? (
        // Podcast existuje, jen se nenacetl; tlacitko generovani by ho zbytecne platilo znovu
        <Alert variant="warning">
          <AlertCircle />
          <AlertTitle>Podcast je hotový, ale nepodařilo se ho načíst</AlertTitle>
          <AlertDescription>
            <p>Načtěte ho znovu, generovat ho není potřeba.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void reloadPodcast()} disabled={reloadingPodcast}>
              {reloadingPodcast ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
              Načíst znovu
            </Button>
          </AlertDescription>
        </Alert>
      ) : podcastReady ? (
        <>
          <PodcastPlayer
            // key podle modulu: panel zustava namontovany pres prepnuti modulu, prehravac nesmi
            key={`${moduleId}:${podcastVersion}`}
            variant="full"
            moduleId={moduleId}
            moduleTitle={moduleTitle}
            transcript={lines}
          />
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">Přepis</span>
              <span className="text-xs text-muted-foreground">jen ke čtení</span>
            </div>
            <PodcastTranscriptList lines={lines} className="max-h-72 overflow-y-auto px-4 py-3" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-5">
          {generateButton('Vygenerovat podcast', () => void startPodcast(), startingPodcast)}
          <p className="text-xs text-muted-foreground">
            {blockReason ?? 'Trvá 1 až 3 minuty. Běží na serveru, mezitím můžete pracovat dál.'}
          </p>
        </div>
      )}

      {podcastReady && !podcastProgress && (
        <div className="flex flex-col items-start gap-3">
          {hint(blockReason ?? 'Po úpravě textu modulu se podcast sám neaktualizuje. Po větších změnách ho vygenerujte znovu.')}
          {regenerateButton(() => setConfirm('podcast'), startingPodcast, 'Spouštím…')}
        </div>
      )}
    </section>
  );

  const renderMap = () => (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Myšlenková mapa</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          AI vybere z textu modulu hlavní téma, 5 až 7 větví a k nim podpojmy. Student na pojem klikne a zeptá se na něj AI tutora.
        </p>
      </div>

      {mapError && (
        <Alert variant="error">
          <AlertCircle />
          <AlertTitle>Mapu se nepodařilo vytvořit</AlertTitle>
          <AlertDescription>{mapError}</AlertDescription>
        </Alert>
      )}

      {mindmap ? (
        <div className={cn('rounded-xl border border-border p-3 transition-opacity', mapGenerating && 'opacity-50')} aria-busy={mapGenerating}>
          <MindMap map={mindmap} />
        </div>
      ) : mapGenerating ? (
        <div className="grid grid-cols-3 items-center gap-6 rounded-xl border border-border p-6" role="status" aria-label="Generuji mapu">
          <div className="flex flex-col gap-2"><Skeleton className="h-6 rounded-full" /><Skeleton className="h-6 rounded-full" /><Skeleton className="h-6 rounded-full" /></div>
          <Skeleton className="h-12 rounded-xl" />
          <div className="flex flex-col gap-2"><Skeleton className="h-6 rounded-full" /><Skeleton className="h-6 rounded-full" /><Skeleton className="h-6 rounded-full" /></div>
        </div>
      ) : null}

      {mindmap ? (
        <div className="flex flex-col items-start gap-3">
          {hint(blockReason ?? 'Mapu nejde ručně upravit, jen vygenerovat znovu. Po úpravě textu se sama neaktualizuje.')}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMapDialogOpen(true)}>
              <Maximize2 data-icon="inline-start" />
              Zobrazit větší
            </Button>
            {regenerateButton(() => setConfirm('map'), mapGenerating, 'Generuji mapu…')}
          </div>
        </div>
      ) : (
        <div className={cn('flex flex-col items-start gap-3', !mapGenerating && 'rounded-xl border border-dashed border-border p-5')}>
          {generateButton(mapGenerating ? 'Generuji mapu…' : 'Vygenerovat mapu', () => void generateMap(), mapGenerating)}
          <p className="text-xs text-muted-foreground">{blockReason ?? 'Trvá obvykle do 30 sekund.'}</p>
        </div>
      )}

      {mindmap && (
        <MindMapViewDialog open={mapDialogOpen} onOpenChange={setMapDialogOpen} map={mindmap} moduleTitle={moduleTitle} />
      )}
    </section>
  );

  return (
    <>
      {view === 'podcast' ? renderPodcast() : renderMap()}
      <ConfirmModal
        isOpen={confirm !== null}
        variant="warning"
        title={confirm === 'map' ? 'Vygenerovat mapu znovu?' : 'Vygenerovat podcast znovu?'}
        message={confirm === 'map'
          ? 'Nová mapa nahradí tu současnou. Studenti uvidí hned novou verzi.'
          : 'Nový podcast nahradí ten současný i s přepisem. Generování běží na serveru 1 až 3 minuty.'}
        confirmLabel="Vygenerovat znovu"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const target = confirm;
          setConfirm(null);
          if (target === 'map') void generateMap();
          else void startPodcast();
        }}
      />
    </>
  );
}

function PodcastProgressCard({ step, total, label, failing }: { step: number; total: number; label: string; failing: boolean }) {
  const current = Math.min(Math.max(step, 1), total);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          <Loader2 className="size-3.5 shrink-0 animate-spin text-gradient-r" />
          <span className="truncate">{label || 'Generuji podcast'}</span>
        </span>
        <span className="shrink-0 tabular-nums">{current} / {total}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gradient-r to-primary transition-[width] duration-500"
          style={{ width: `${Math.round((current / total) * 100)}%` }}
        />
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {PODCAST_STEPS.slice(0, total).map((text, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <li key={n} className={cn('flex items-center gap-2', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              <span className="flex size-5 shrink-0 items-center justify-center">
                {done ? <Check className="size-3.5 text-success" /> : active ? <Loader2 className="size-3.5 animate-spin text-gradient-r" /> : <span className="size-1.5 rounded-full bg-border" />}
              </span>
              {text}
            </li>
          );
        })}
      </ul>
      {failing ? (
        <p className="flex items-start gap-1.5 text-xs text-foreground">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
          Spojení se serverem vypadává, průběh zkoušíme načítat dál.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Můžete pracovat dál, generování běží na serveru. Až bude hotové, dáme vědět.</p>
      )}
    </div>
  );
}
