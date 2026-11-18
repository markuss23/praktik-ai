'use client';

import { useEffect, useState } from 'react';
import { Bot, MessageSquareText, Network, X } from 'lucide-react';
import type { MindMap as MindMapData } from '@/api';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { MindMap, type MindMapNode } from './MindMap';
import { TutorChatPanel } from './TutorChatPanel';
import { useTutor } from './TutorProvider';

type AskKind = 'explain' | 'example' | 'relate' | 'summary';

const ACTIONS: Record<MindMapNode['kind'], { kind: AskKind; label: string }[]> = {
  root: [{ kind: 'summary', label: 'Shrň mi celé téma' }],
  branch: [
    { kind: 'explain', label: 'Vysvětli mi to' },
    { kind: 'example', label: 'Dej příklad z praxe' },
    { kind: 'relate', label: 'Jak to souvisí s celkem' },
  ],
  child: [
    { kind: 'explain', label: 'Vysvětli mi to' },
    { kind: 'example', label: 'Dej příklad z praxe' },
    { kind: 'relate', label: 'Jak to souvisí s celkem' },
  ],
};

function questionFor(kind: AskKind, node: MindMapNode, root: string): string {
  switch (kind) {
    case 'summary':
      return `Shrň mi hlavní myšlenky tématu „${node.label}“.`;
    case 'explain':
      return node.kind === 'child' && node.branch
        ? `Vysvětli mi pojem „${node.label}“ v tématu „${node.branch}“.`
        : `Vysvětli mi téma „${node.label}“.`;
    case 'example':
      return `Dej mi příklad z praxe k pojmu „${node.label}“.`;
    case 'relate':
      return `Jak souvisí „${node.label}“ s tématem „${root}“?`;
  }
}

interface MindMapAskMenuProps {
  node: MindMapNode;
  root: string;
  onAsk: (question: string) => void;
  onCustom: (draft: string) => void;
  // Nahled: akce jsou videt, ale nic neposilaji
  disabledNote?: string;
  // Tutor jeste odpovida; dalsi otazku by zahodil
  busy?: boolean;
}

function MindMapAskMenu({ node, root, onAsk, onCustom, disabledNote, busy = false }: MindMapAskMenuProps) {
  const path = node.kind === 'child' ? `${root} › ${node.branch}` : node.kind === 'branch' ? `${root} › téma` : 'Hlavní téma modulu';
  return (
    <div className="flex flex-col gap-2">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground break-words">{path}</p>
        <p className="text-sm font-semibold leading-snug text-foreground break-words">{node.label}</p>
      </div>
      <div className="flex flex-col gap-1">
        {ACTIONS[node.kind].map((action) => (
          <Button
            key={action.kind}
            variant="secondary"
            size="sm"
            className="justify-start"
            disabled={!!disabledNote || busy}
            onClick={() => onAsk(questionFor(action.kind, node, root))}
          >
            <Bot data-icon="inline-start" />
            {action.label}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="justify-start"
          disabled={!!disabledNote}
          onClick={() => onCustom(`K pojmu „${node.label}“: `)}
        >
          <MessageSquareText data-icon="inline-start" />
          Vlastní otázka…
        </Button>
      </div>
      {(disabledNote || busy) && (
        <p className="text-[11px] text-muted-foreground">{disabledNote ?? 'Tutor ještě odpovídá na předchozí otázku.'}</p>
      )}
    </div>
  );
}

function DialogHeaderRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tip/10 text-tip">
        <Network className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <DialogTitle className="leading-tight font-semibold">{title}</DialogTitle>
        <DialogDescription className="truncate text-xs">{description}</DialogDescription>
      </div>
      <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Zavřít" />}>
        <X />
      </DialogClose>
    </div>
  );
}

const DIALOG_CLASS = 'flex h-[min(92vh,820px)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl';

interface MindMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: MindMapData;
  moduleTitle: string;
}

// Student: mapa a vedle ni tutor se stejnou konverzaci jako karta v panelu modulu
export function MindMapTutorDialog({ open, onOpenChange, map, moduleTitle }: MindMapDialogProps) {
  const { ask, prefill, isTyping } = useTutor();
  // Pod lg se mapa a tutor stridaji v zalozkach; okno se vzdy otevre na mape
  const [mobileTab, setMobileTab] = useState<'map' | 'tutor'>('map');
  useEffect(() => {
    if (open) setMobileTab('map');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={DIALOG_CLASS}>
        <DialogHeaderRow title="Myšlenková mapa" description={`${moduleTitle} · klikni na pojem a zeptej se tutora`} />

        <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as 'map' | 'tutor')} className="shrink-0 gap-0 border-b border-border p-2 lg:hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">Mapa</TabsTrigger>
            <TabsTrigger value="tutor">AI Tutor</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex min-h-0 flex-1">
          <div className={cn('min-h-0 min-w-0 flex-1 overflow-auto p-3 sm:p-5', mobileTab === 'map' ? 'flex' : 'hidden lg:flex')}>
            <MindMap
              className="my-auto"
              map={map}
              renderActions={(node, close) => (
                <MindMapAskMenu
                  node={node}
                  root={map.root}
                  busy={isTyping}
                  onAsk={(question) => {
                    close();
                    ask(question, { scope: 'module' });
                    setMobileTab('tutor');
                  }}
                  onCustom={(draft) => {
                    close();
                    prefill(draft);
                    setMobileTab('tutor');
                  }}
                />
              )}
            />
          </div>
          <div className={cn('min-h-0 w-full flex-col bg-card lg:flex lg:w-[360px] lg:shrink-0 lg:border-l lg:border-border', mobileTab === 'tutor' ? 'flex' : 'hidden')}>
            <div className="hidden shrink-0 items-center gap-2 border-b border-border px-4 py-3 lg:flex">
              <Bot className="size-5 text-foreground" />
              <span className="text-sm font-semibold text-foreground">AI Tutor</span>
            </div>
            <TutorChatPanel variant="panel" focusOnPrefill />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Nahled pro studenta (akce u pojmu bez volani tutora) a cteni pro lektora a garanta
export function MindMapViewDialog({ open, onOpenChange, map, moduleTitle, preview = false }: MindMapDialogProps & { preview?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={DIALOG_CLASS}>
        <DialogHeaderRow
          title="Myšlenková mapa"
          description={preview ? `${moduleTitle} · student tu klikne na pojem a zeptá se tutora` : moduleTitle}
        />
        <div className="flex min-h-0 flex-1 overflow-auto p-3 sm:p-5">
          <MindMap
            className="my-auto"
            map={map}
            renderActions={preview
              ? (node, close) => (
                  <MindMapAskMenu node={node} root={map.root} onAsk={close} onCustom={close} disabledNote="V náhledu se tutor nevolá." />
                )
              : undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
