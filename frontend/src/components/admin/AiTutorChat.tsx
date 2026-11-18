'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, X, Maximize2 } from 'lucide-react';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui';
import { useTutor } from '@/components/module/TutorProvider';
import { TutorChatPanel } from '@/components/module/TutorChatPanel';

// Karta AI tutora v panelu modulu; stav a konverzaci drzi TutorProvider.
// Rozbaleny chat je kitovy Dialog (overlay, focus trap i stacking resi Base UI).
export function AiTutorChat() {
  const { chatOpen, setChatOpen, askCount } = useTutor();
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Rozbalena karta muze v panelu modulu skoncit pod okrajem. Posun do zaberu jen pri otevreni
  // a pri kazde nove otazce (i z mapy), ne pri mountu, napr. po navratu ze zalozky Test.
  const seenRef = useRef({ chatOpen, askCount });
  useEffect(() => {
    const seen = seenRef.current;
    const opened = chatOpen && !seen.chatOpen;
    const asked = askCount !== seen.askCount;
    seenRef.current = { chatOpen, askCount };
    if (chatOpen && (opened || asked)) cardRef.current?.scrollIntoView({ block: 'nearest' });
  }, [chatOpen, askCount]);

  useEffect(() => {
    if (!expanded) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [expanded]);

  return (
    <>
      <div
        ref={cardRef}
        className={`bg-card rounded-lg overflow-hidden ${expanded ? 'invisible' : ''}`}
        aria-hidden={expanded}
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-foreground" />
            <span className="font-semibold text-foreground text-sm">AI Tutor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="plain"
              onClick={() => { setChatOpen(true); setExpanded(true); }}
              className={cn(BTN_KEEP_BOX, 'text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted')}
              title="Otevřít ve velkém"
              aria-label="Otevřít AI tutora ve velkém"
            >
              <Maximize2 className="size-4" />
            </Button>
            {chatOpen && (
              <Button
                variant="plain"
                onClick={() => setChatOpen(false)}
                className={cn(BTN_KEEP_BOX, 'text-muted-foreground hover:text-muted-foreground transition-colors p-1 rounded-md hover:bg-muted')}
                aria-label="Sbalit AI tutora"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {chatOpen && !expanded ? (
          <TutorChatPanel variant="inline" />
        ) : (
          // Sbaleny stav; kitovy Button je inline-flex a nezalamuje, tady je potreba blok s viceradkovym textem a jen horni linkou
          <Button
            variant="plain"
            onClick={() => setChatOpen(true)}
            className={cn(BTN_KEEP_BOX, 'block w-full whitespace-normal font-normal rounded-none border-0 border-t border-border px-4 py-3 text-left hover:bg-muted/50 transition-colors')}
          >
            <div className="flex items-start gap-2">
              <div className="size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--muted)' }}>
                <Bot className="size-4 text-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-snug break-words">
                Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo celému kurzu?
              </p>
            </div>
          </Button>
        )}
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(90vh,800px)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                <Bot className="size-5 text-foreground" />
              </div>
              <div>
                <DialogTitle className="leading-tight font-semibold">AI Tutor</DialogTitle>
                <DialogDescription className="text-xs">
                  Pomocník pro učební materiály
                </DialogDescription>
              </div>
            </div>
            <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Zavřít" />}>
              <X />
            </DialogClose>
          </div>

          <TutorChatPanel variant="modal" autoFocus />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AiTutorChat;
