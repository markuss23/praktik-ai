'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Bot, CheckCircle, Loader2, MessagesSquare, SendHorizontal, UserRound, XCircle } from 'lucide-react';
import type { AssessmentSession } from '@/hooks/useAssessmentSession';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TypedAnswerTextarea } from './TypedAnswerTextarea';

interface SocraticDialogProps {
  session: AssessmentSession;
  startLabel: string;
  // Závěrečný test kurzu: AI se ptá na obsah celého kurzu
  courseLevel?: boolean;
}

type Message =
  | { key: string; role: 'ai'; text: string; turn: number | null }
  | { key: string; role: 'student'; text: string }
  | { key: string; role: 'summary'; text: string };

const BUBBLE_WIDTH = 'max-w-[85%] sm:max-w-[75%]';
const BUBBLE_TEXT = 'rounded-2xl px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

function AiAvatar() {
  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-r/10 text-gradient-r">
      <Bot className="size-4" />
    </span>
  );
}

function Appear({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  );
}

function AiMessage({ meta, highlight = false, children }: { meta: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <AiAvatar />
      <div className={cn(BUBBLE_WIDTH, 'flex min-w-0 flex-col gap-1')}>
        <span className="text-[11px] text-muted-foreground">{meta}</span>
        <div
          className={cn(
            BUBBLE_TEXT,
            'rounded-tl-sm border',
            highlight ? 'border-gradient-r/30 bg-gradient-r/5' : 'border-border bg-card',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function StudentMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Vy
        <UserRound aria-hidden className="size-3.5" />
      </span>
      <div className={cn(BUBBLE_WIDTH, BUBBLE_TEXT, 'rounded-tr-sm bg-gradient-r/10')}>{text}</div>
    </div>
  );
}

function TypingMessage({ note }: { note?: string }) {
  return (
    <div className="flex items-start gap-2">
      <AiAvatar />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] text-muted-foreground">AI</span>
        <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
          <span className="flex items-center gap-1" aria-hidden>
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="size-2 rounded-full bg-muted-foreground animate-bounce motion-reduce:animate-none"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
          <span className={note ? 'text-xs text-muted-foreground' : 'sr-only'}>{note ?? 'AI píše odpověď'}</span>
        </div>
      </div>
    </div>
  );
}

// Sokratovský dialog jako konverzace: AI se ptá, student odpovídá zprávami.
// Hodnocení v průběhu nemá (backend vrací is_correct bez významu), výsledek a shrnutí až na konci.
export function SocraticDialog({ session, startLabel, courseLevel = false }: SocraticDialogProps) {
  const {
    phase, current, answer, setAnswer, answered, pendingAnswer, missingHistory,
    result, starting, submitting, errorMsg, canSubmit, start, submit,
  } = session;
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  // Fokus do pole jen po akci studenta, ne při prvním načtení stránky
  const actedRef = useRef(false);
  // Obnovený rozhovor odscrollovat hned, nové zprávy plynule
  const firstScrollRef = useRef(true);

  const handleStart = () => {
    actedRef.current = true;
    start();
  };

  const handleSend = () => {
    actedRef.current = true;
    submit();
  };

  // Plochý seznam se stabilními key: otázka ani odpověď se po potvrzení serverem znovu neanimují
  const messages: Message[] = [];
  const turnOf = (index: number) => (missingHistory ? null : index + 1);
  answered.forEach((item, i) => {
    messages.push({ key: `q${i}`, role: 'ai', text: item.question, turn: turnOf(i) });
    messages.push({ key: `a${i}`, role: 'student', text: item.answer });
  });
  if (phase === 'running' && current) {
    messages.push({ key: `q${answered.length}`, role: 'ai', text: current.question, turn: turnOf(answered.length) });
    if (pendingAnswer) messages.push({ key: `a${answered.length}`, role: 'student', text: pendingAnswer });
  }
  const summary = phase === 'finished' && !starting ? answered[answered.length - 1]?.feedback : null;
  if (summary) messages.push({ key: 'summary', role: 'summary', text: summary });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScrollRef.current ? 'auto' : 'smooth' });
    firstScrollRef.current = false;
  }, [messages.length, starting, submitting]);

  useEffect(() => {
    if (phase !== 'running' || submitting || !actedRef.current) return;
    composerRef.current?.querySelector('textarea')?.focus();
  }, [phase, submitting, current?.question]);

  if (phase === 'loading' && !starting) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Loader2 className="size-8 animate-spin text-gradient-r" />
        <p className="text-sm text-muted-foreground">Načítám rozhovor…</p>
      </div>
    );
  }

  if (phase === 'idle' && !starting) {
    return (
      <div className="flex flex-col gap-4">
        {errorMsg && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </p>
        )}
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-gradient-r/10 text-gradient-r">
            <MessagesSquare className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-foreground">Rozhovor s AI</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              AI vybere téma z obsahu {courseLevel ? 'kurzu' : 'modulu'} a položí vám k němu otázku.
              Na vaše odpovědi bude navazovat dalšími. Odpovídejte vlastními slovy, hodnocení
              v průběhu neuvidíte. Na konci dostanete shrnutí a výsledek.
            </p>
          </div>
          <Button variant="brand-solid" size="lg" onClick={handleStart}>
            <MessagesSquare data-icon="inline-start" />
            {startLabel}
          </Button>
        </div>
      </div>
    );
  }

  const finished = phase === 'finished' && !starting ? result : null;
  const canType = phase === 'running' && !submitting;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Rozhovor s AI"
        aria-live="polite"
        className="flex max-h-[min(65vh,36rem)] min-h-48 flex-col gap-3 overflow-y-auto bg-muted/30 p-3 sm:gap-4 sm:p-4"
      >
        <p className="mx-auto max-w-md text-center text-xs text-muted-foreground">
          AI se ptá, vy odpovídáte vlastními slovy. Hodnocení uvidíte až na konci rozhovoru.
        </p>
        {missingHistory && (
          <p className="mx-auto rounded-full border border-dashed border-border px-3 py-1 text-center text-xs text-muted-foreground">
            Navazujete na rozběhnutý rozhovor. Dřívější zprávy se v tomto okně nezobrazují.
          </p>
        )}

        {messages.map((message) => (
          <Appear key={message.key}>
            {message.role === 'student' ? (
              <StudentMessage text={message.text} />
            ) : message.role === 'summary' ? (
              <AiMessage meta="AI · shrnutí" highlight>
                <span className="mb-1 block font-semibold">Shrnutí rozhovoru</span>
                {message.text}
              </AiMessage>
            ) : (
              <AiMessage meta={message.turn ? `AI · otázka ${message.turn}` : 'AI'}>{message.text}</AiMessage>
            )}
          </Appear>
        ))}

        {(starting || submitting) && (
          <Appear key={starting ? 'typing-start' : `typing-${answered.length}`}>
            <TypingMessage note={starting ? 'Vybírám téma a připravuji první otázku…' : undefined} />
          </Appear>
        )}
      </div>

      {finished ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-3 border-t p-4',
            finished.isPassed ? 'border-success/30 bg-success/10' : 'border-destructive/30 bg-destructive/10',
          )}
        >
          {finished.isPassed
            ? <CheckCircle className="size-6 shrink-0 text-success" />
            : <XCircle className="size-6 shrink-0 text-destructive" />}
          <div className="min-w-0 grow">
            <p className={cn('font-semibold', finished.isPassed ? 'text-success' : 'text-destructive')}>
              {finished.isPassed ? 'Splněno' : 'Nesplněno'}
              {finished.score !== null && ` — ${Math.round(finished.score)} %`}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {finished.isPassed
                ? 'Rozhovor je u konce, shrnutí najdete výše.'
                : 'Projděte si látku a zkuste nový rozhovor, téma může být jiné.'}
            </p>
          </div>
          {!finished.isPassed && (
            <Button variant="brand-solid" onClick={handleStart}>
              Nový rozhovor
            </Button>
          )}
        </div>
      ) : (
        <div ref={composerRef} className="border-t border-border bg-card p-3 sm:p-4">
          {errorMsg && (
            <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMsg}
            </p>
          )}
          <TypedAnswerTextarea
            // Odeslaná odpověď už je ve vlákně; při chybě se text vrátí do pole
            value={submitting ? '' : answer}
            onChange={setAnswer}
            disabled={!canType}
            rows={3}
            minHeight={88}
            ariaLabel="Vaše odpověď"
            placeholder={canType ? 'Napište odpověď…' : 'Počkejte na otázku…'}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
              e.preventDefault();
              handleSend();
            }}
          />
          <div className="flex items-center justify-end gap-3">
            <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">Ctrl/⌘ + Enter odešle odpověď</span>
            <Button variant="brand-solid" onClick={handleSend} disabled={!canType || !canSubmit}>
              {submitting
                ? <Loader2 data-icon="inline-start" className="animate-spin" />
                : <SendHorizontal data-icon="inline-start" />}
              Odeslat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
