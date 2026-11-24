'use client';

import { useEffect, useId, useRef } from 'react';
import { Bot, SendHorizontal, UserRound } from 'lucide-react';
import type { MentorScope } from '@/api';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import { Button, Switch } from '@/components/ui';
import { useTutor } from './TutorProvider';

// Rozsah mentora: podklady a historie z learn blocku, nebo z celeho kurzu
const SCOPE_OPTIONS: { value: MentorScope; label: string }[] = [
  { value: 'module', label: 'Tento modul' },
  { value: 'course', label: 'Celý kurz' },
];

// Mentor odpovida v HTML
const looksLikeHtml = (text: string) => /<\/?[a-z][^>]*>/i.test(text);
// Jen tagy, ktere mentorovi povoluje prompt
const MENTOR_HTML = { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'], ALLOWED_ATTR: [] };
// Preflight maze okraje i odrazky a v bubline je potreba vratit
const AI_HTML_CLASS = cn(
  'whitespace-normal',
  '[&_p:not(:last-child)]:mb-2 [&_strong]:font-semibold [&_li]:mt-0.5',
  '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_ul:not(:last-child)]:mb-2 [&_ol:not(:last-child)]:mb-2',
);

// inline = karta v panelu modulu, modal = velke okno tutora, panel = sloupec vedle myslenkove mapy
export type TutorChatVariant = 'inline' | 'modal' | 'panel';

const VARIANT = {
  inline: {
    pad: 'px-4',
    messages: 'px-4 py-3 space-y-3 max-h-64 overflow-y-auto no-scrollbar border-t border-border bg-card',
    bubble: 'text-sm px-3 py-2 max-w-[75%]',
    avatar: 'size-7',
    avatarIcon: 'size-4',
    inputBox: { maxWidth: 280, height: 50 },
    inputText: 'text-sm',
    sendIcon: 'size-5',
  },
  modal: {
    pad: 'px-6',
    messages: 'flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4 bg-card min-h-0',
    bubble: 'text-base px-4 py-2.5 max-w-[80%]',
    avatar: 'size-9',
    avatarIcon: 'size-5',
    inputBox: { maxWidth: 720, height: 56 },
    inputText: 'text-base',
    sendIcon: 'size-6',
  },
  panel: {
    pad: 'px-4',
    messages: 'flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3 bg-card min-h-0',
    bubble: 'text-sm px-3 py-2 max-w-[85%]',
    avatar: 'size-7',
    avatarIcon: 'size-4',
    inputBox: { maxWidth: 520, height: 50 },
    inputText: 'text-sm',
    sendIcon: 'size-5',
  },
} as const;

interface TutorChatPanelProps {
  variant: TutorChatVariant;
  // Po prefill() z mapy presune fokus do pole tohoto panelu
  focusOnPrefill?: boolean;
  autoFocus?: boolean;
}

export function TutorChatPanel({ variant, focusOnPrefill = false, autoFocus = false }: TutorChatPanelProps) {
  const {
    scope, setScope, learnBlockId, messages, isTyping, useHistory, setUseHistory,
    draft, setDraft, ask, prefillNonce,
  } = useTutor();
  const v = VARIANT[variant];
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Fokus po odpovedi jen v panelu, ze ktereho student psal (ne v jinem okne za dialogem)
  const sentHereRef = useRef(false);
  const historyHelpId = useId();

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useEffect(() => {
    if (isTyping || !sentHereRef.current) return;
    sentHereRef.current = false;
    inputRef.current?.focus();
  }, [isTyping]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Reaguje jen na novy prefill, ne na stary nonce pri znovuotevreni okna
  const handledNonceRef = useRef(prefillNonce);
  useEffect(() => {
    if (!focusOnPrefill || prefillNonce === handledNonceRef.current) return;
    handledNonceRef.current = prefillNonce;
    // Zavirany popover vraci fokus na pojem; pole dostane fokus az po nem
    const timer = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusOnPrefill, prefillNonce]);

  const send = (text: string) => {
    if (!text.trim() || isTyping) return;
    sentHereRef.current = true;
    ask(text);
  };

  const handleSend = () => {
    if (!draft.trim() || isTyping) return;
    const msg = draft.trim();
    setDraft('');
    send(msg);
  };

  // Prepinac navazovani posila use_history=false; backend konverzaci uklada dal
  return (
    <>
      <div
        role="radiogroup"
        aria-label="Rozsah AI tutora"
        className={cn(
          'flex flex-wrap gap-1.5 bg-card',
          variant === 'inline' ? 'px-4 pt-2 pb-1.5 border-t border-border' : `${v.pad} pt-3 pb-2`,
        )}
      >
        {SCOPE_OPTIONS.map((option) => {
          const active = scope === option.value;
          return (
            <Button
              key={option.value}
              variant="plain"
              role="radio"
              aria-checked={active}
              disabled={isTyping || (option.value === 'module' && !learnBlockId)}
              title={option.value === 'module' && !learnBlockId ? 'Modul nemá obsah, ke kterému se ptát' : undefined}
              onClick={() => setScope(option.value)}
              className={cn(
                BTN_KEEP_BOX,
                'text-xs px-3 py-1 rounded-full border transition-colors disabled:opacity-50',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:bg-muted/50',
              )}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      <label
        className={cn(
          'flex items-start gap-2 bg-card cursor-pointer',
          variant === 'inline' ? 'px-4 pb-2.5' : `${v.pad} pb-3 border-b border-border`,
        )}
      >
        <Switch
          size="sm"
          checked={useHistory}
          onCheckedChange={setUseHistory}
          aria-describedby={historyHelpId}
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">Navazovat na předchozí otázky</span>
          <span id={historyHelpId} className="block text-[11px] leading-snug text-muted-foreground">
            {useHistory
              ? `Tutor navazuje na vaše předchozí otázky ${scope === 'module' ? 'v tomto modulu' : 'v celém kurzu'}.`
              : 'Každou otázku bere samostatně. Konverzace se dál ukládá.'}
          </span>
        </span>
      </label>

      <div ref={messagesRef} className={v.messages}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className={`${v.avatar} rounded-full flex items-center justify-center shrink-0`} style={{ backgroundColor: 'var(--muted)' }}>
                <Bot className={`${v.avatarIcon} text-foreground`} />
              </div>
            )}
            <div
              className={`${v.bubble} rounded-2xl break-words whitespace-pre-wrap min-w-0 ${
                msg.role === 'user' ? 'text-primary-foreground rounded-br-sm' : 'text-foreground rounded-bl-sm'
              }`}
              style={{
                backgroundColor: msg.role === 'user' ? 'var(--foreground)' : 'var(--muted)',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {msg.role === 'ai' && looksLikeHtml(msg.text) ? (
                <div className={AI_HTML_CLASS} dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.text, MENTOR_HTML) }} />
              ) : msg.text}
            </div>
            {msg.role === 'user' && (
              <div className={`${v.avatar} rounded-full flex items-center justify-center shrink-0`} style={{ backgroundColor: 'var(--muted)' }}>
                <UserRound className={`${v.avatarIcon} text-foreground`} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2 justify-start">
            <div className={`${v.avatar} rounded-full flex items-center justify-center shrink-0`} style={{ backgroundColor: 'var(--muted)' }}>
              <Bot className={`${v.avatarIcon} text-foreground`} />
            </div>
            <div className="rounded-2xl px-4 py-3 rounded-bl-sm" style={{ backgroundColor: 'var(--muted)' }}>
              <div className="flex items-center gap-1">
                <span className="size-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        // Navrh otazky jen ve fazi prvniho pozdravu
        <div className={`${variant === 'modal' ? 'px-6 pb-3' : 'px-4 pb-2'} flex flex-wrap gap-1.5 bg-card`}>
          <Button
            variant="plain"
            onClick={() => send('Jak můžu využít AI pro diferenciaci výuky?')}
            className={cn(BTN_KEEP_BOX, 'text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-card hover:bg-muted/50 transition-colors')}
          >
            Jak můžu využít AI pro diferenciaci výuky?
          </Button>
        </div>
      )}

      <div className={`${variant === 'modal' ? 'px-6 py-4' : 'px-3 py-3'} border-t border-border bg-card`}>
        <div
          className="flex items-center justify-between border border-border mx-auto"
          style={{
            maxWidth: v.inputBox.maxWidth,
            height: v.inputBox.height,
            borderRadius: 100,
            paddingTop: 4,
            paddingBottom: 4,
            paddingLeft: 16,
            paddingRight: 12,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (isTyping) {
                e.preventDefault();
                return;
              }
              handleSend();
            }}
            placeholder={isTyping ? 'Tutor přemýšlí..' : 'Co máte na mysli?'}
            aria-label="Zpráva pro AI tutora"
            className={`grow bg-transparent ${v.inputText} text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0`}
          />
          <Button
            variant="plain"
            onClick={handleSend}
            disabled={!draft.trim() || isTyping}
            title={isTyping ? 'Počkejte, než AI dopíše odpověď' : undefined}
            aria-label="Odeslat zprávu"
            className={cn(BTN_KEEP_BOX, `shrink-0 transition-all ${
              draft.trim() && !isTyping ? 'text-foreground hover:opacity-70' : 'text-muted-foreground cursor-not-allowed'
            }`)}
          >
            <SendHorizontal className={v.sendIcon} />
          </Button>
        </div>
      </div>
    </>
  );
}
