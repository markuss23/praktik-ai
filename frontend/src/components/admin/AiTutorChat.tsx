'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, SendHorizontal, UserRound, Maximize2 } from 'lucide-react';
import type { MentorScope } from '@/api';
import { mentorChat } from '@/lib/api-client';
import { readApiErrorDetail } from '@/lib/api-error';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui';

interface AiTutorChatProps {
  courseId?: number;
  learnBlockId?: number;
  moduleId?: number;
}

type ChatMessage = { role: 'user' | 'ai'; text: string };

const SCOPE_OPTIONS: { value: MentorScope; label: string }[] = [
  { value: 'module', label: 'Tento modul' },
  { value: 'course', label: 'Celý kurz' },
];

const initialMessage = (scope: MentorScope): ChatMessage => ({
  role: 'ai',
  text: scope === 'course'
    ? 'Ahoj! 👋 Jsem tvůj AI asistent. Ptej se na cokoliv z celého kurzu nebo na pomoc s přípravou do výuky.'
    : 'Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo potřebuješ pomoc s přípravou do výuky?',
});

const readStoredMessages = (key: string | null, scope: MentorScope): ChatMessage[] => {
  if (typeof window === 'undefined' || !key) return [initialMessage(scope)];
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChatMessage[];
  } catch { /* ignore */ }
  return [initialMessage(scope)];
};

export function AiTutorChat({ courseId, learnBlockId, moduleId }: AiTutorChatProps) {
  // Modul potřebuje learn block — bez něj (modul bez obsahu) zbývá jen celý kurz
  const [preferredScope, setPreferredScope] = useState<MentorScope>('module');
  const scope: MentorScope = learnBlockId ? preferredScope : 'course';
  // Historii vede backend zvlášť pro modul a pro kurz — konverzace se proto ukládají odděleně
  const storageKey = scope === 'course'
    ? (courseId !== undefined ? `ai-tutor-chat-course-${courseId}` : null)
    : (moduleId !== undefined ? `ai-tutor-chat-${moduleId}` : null);

  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => readStoredMessages(storageKey, scope));
  const inlineEndRef = useRef<HTMLDivElement>(null);
  const modalEndRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const loadedKeyRef = useRef<string | null>(storageKey);
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return;
    loadedKeyRef.current = storageKey;
    skipNextPersistRef.current = true;
    setChatMessages(readStoredMessages(storageKey, scope));
  }, [storageKey, scope]);

  // Persist chat history across page refreshes.
  useEffect(() => {
    if (!storageKey) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch { /* ignore */ }
  }, [storageKey, chatMessages]);

  useEffect(() => {
    for (const ref of [inlineEndRef, modalEndRef]) {
      const el = ref.current;
      if (el?.parentElement) {
        el.parentElement.scrollTop = el.parentElement.scrollHeight;
      }
    }
  }, [chatMessages, isAiTyping, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  useEffect(() => {
    if (isAiTyping) return;
    const target = expanded ? modalInputRef.current : inlineInputRef.current;
    target?.focus();
  }, [isAiTyping, expanded]);

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

  const askTutor = async (msg: string) => {
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsAiTyping(true);
    try {
      if (courseId === undefined) throw new Error('No course');
      const response = await mentorChat({ scope, courseId, learnBlockId, message: msg });
      setChatMessages(prev => [...prev, { role: 'ai', text: response.answer }]);
    } catch (err) {
      // Hláška ze serveru má přednost (např. vyčerpaný denní limit AI)
      const detail = await readApiErrorDetail(err);
      setChatMessages(prev => [...prev, {
        role: 'ai',
        text: detail ?? 'Omlouvám se, nepodařilo se spojit s AI tutorem. Zkuste to prosím znovu.',
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendChat = () => {
    if (!chatMessage.trim() || isAiTyping) return;
    const msg = chatMessage.trim();
    setChatMessage('');
    askTutor(msg);
  };

  const handleSuggestion = (suggestion: string) => {
    if (isAiTyping) return;
    askTutor(suggestion);
  };

  const renderChat = useCallback((variant: 'inline' | 'modal') => {
    const endRef = variant === 'modal' ? modalEndRef : inlineEndRef;
    const messagesAreaClass =
      variant === 'modal'
        ? 'flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4 bg-card min-h-0'
        : 'px-4 py-3 space-y-3 max-h-64 overflow-y-auto no-scrollbar border-t border-border bg-card';
    const bubbleSize = variant === 'modal' ? 'text-base px-4 py-2.5 max-w-[80%]' : 'text-sm px-3 py-2 max-w-[75%]';
    const avatarSize = variant === 'modal' ? 'size-9' : 'size-7';
    const avatarIconSize = variant === 'modal' ? 'size-5' : 'size-4';

    return (
      <>
        {/* Rozsah mentora — podklady a historie z learn blocku, nebo z celého kurzu */}
        <div
          role="radiogroup"
          aria-label="Rozsah AI tutora"
          className={cn(
            'flex flex-wrap gap-1.5 bg-card',
            variant === 'modal' ? 'px-6 py-3 border-b border-border' : 'px-4 py-2 border-t border-border',
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
                disabled={isAiTyping || (option.value === 'module' && !learnBlockId)}
                title={option.value === 'module' && !learnBlockId ? 'Modul nemá obsah, ke kterému se ptát' : undefined}
                onClick={() => setPreferredScope(option.value)}
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

        <div className={messagesAreaClass}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className={`${avatarSize} rounded-full flex items-center justify-center shrink-0`}
                  style={{ backgroundColor: 'var(--muted)' }}>
                  <Bot className={`${avatarIconSize} text-foreground`} />
                </div>
              )}
              <div
                className={`${bubbleSize} rounded-2xl break-words whitespace-pre-wrap min-w-0 ${
                  msg.role === 'user'
                    ? 'text-primary-foreground rounded-br-sm'
                    : 'text-foreground rounded-bl-sm'
                }`}
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--foreground)' : 'var(--muted)',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className={`${avatarSize} rounded-full flex items-center justify-center shrink-0`}
                  style={{ backgroundColor: 'var(--muted)' }}>
                  <UserRound className={`${avatarIconSize} text-foreground`} />
                </div>
              )}
            </div>
          ))}

          {/* Loading bubble */}
          {isAiTyping && (
            <div className="flex items-end gap-2 justify-start">
              <div className={`${avatarSize} rounded-full flex items-center justify-center shrink-0`}
                style={{ backgroundColor: 'var(--muted)' }}>
                <Bot className={`${avatarIconSize} text-foreground`} />
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
          <div ref={endRef} />
        </div>

        {/* Suggested questions — jen ve fázi prvního pozdravu */}
        {chatMessages.length <= 1 && (
          <div className={`${variant === 'modal' ? 'px-6 pb-3' : 'px-4 pb-2'} flex flex-wrap gap-1.5 bg-card`}>
            <Button
              variant="plain"
              onClick={() => handleSuggestion('Jak můžu využít AI pro diferenciaci výuky?')}
              className={cn(BTN_KEEP_BOX, "text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground bg-card hover:bg-muted/50 transition-colors")}
            >
              Jak můžu využít AI pro diferenciaci výuky?
            </Button>
          </div>
        )}

        {/* Chat Input */}
        <div className={`${variant === 'modal' ? 'px-6 py-4' : 'px-3 py-3'} border-t border-border bg-card`}>
          <div
            className="flex items-center justify-between border border-border mx-auto"
            style={{
              maxWidth: variant === 'modal' ? 720 : 280,
              height: variant === 'modal' ? 56 : 50,
              borderRadius: 100,
              paddingTop: 4,
              paddingBottom: 4,
              paddingLeft: 16,
              paddingRight: 12,
            }}
          >
            <input
              ref={variant === 'modal' ? modalInputRef : inlineInputRef}
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (isAiTyping) {
                  e.preventDefault();
                  return;
                }
                handleSendChat();
              }}
              placeholder={isAiTyping ? 'Tutor přemýšlí..' : 'Co máte na mysli?'}
              aria-label="Zpráva pro AI tutora"
              className={`grow bg-transparent ${variant === 'modal' ? 'text-base' : 'text-sm'} text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0`}
            />
            <Button
              variant="plain"
              onClick={handleSendChat}
              disabled={!chatMessage.trim() || isAiTyping}
              title={isAiTyping ? 'Počkejte, než AI dopíše odpověď' : undefined}
              aria-label="Odeslat zprávu"
              className={cn(BTN_KEEP_BOX, `shrink-0 transition-all ${
                chatMessage.trim() && !isAiTyping ? 'text-foreground hover:opacity-70' : 'text-muted-foreground cursor-not-allowed'
              }`)}
            >
              <SendHorizontal className={variant === 'modal' ? 'size-6' : 'size-5'} />
            </Button>
          </div>
        </div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, isAiTyping, chatMessage, scope, learnBlockId, courseId]);

  return (
    <>
      <div
        className={`bg-card rounded-lg overflow-hidden ${expanded ? 'invisible' : ''}`}
        aria-hidden={expanded}
        style={{ border: '1px solid var(--border)' }}
      >
        {/* Tutor Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-foreground" />
            <span className="font-semibold text-foreground text-sm">AI Tutor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="plain"
              onClick={() => { setChatOpen(true); setExpanded(true); }}
              className={cn(BTN_KEEP_BOX, "text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted")}
              title="Otevřít ve velkém"
              aria-label="Otevřít AI tutora ve velkém"
            >
              <Maximize2 className="size-4" />
            </Button>
            {chatOpen && (
              <Button
                variant="plain"
                onClick={() => setChatOpen(false)}
                className={cn(BTN_KEEP_BOX, "text-muted-foreground hover:text-muted-foreground transition-colors p-1 rounded-md hover:bg-muted")}
                aria-label="Sbalit AI tutora"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Inline chat */}
        {chatOpen ? (
          renderChat('inline')
        ) : (
          /* Collapsed state - click to open.
             Kitový Button je inline-flex, centruje, nezalamuje a má rámeček
             kolem dokola — tady potřebujeme blok s víceřádkovým textem a jen horní linkou. */
          <Button
            variant="plain"
            onClick={() => setChatOpen(true)}
            className={cn(BTN_KEEP_BOX, "block w-full whitespace-normal font-normal rounded-none border-0 border-t border-border px-4 py-3 text-left hover:bg-muted/50 transition-colors")}
          >
            <div className="flex items-start gap-2">
              <div className="size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: 'var(--muted)' }}>
                <Bot className="size-4 text-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-snug break-words">
                Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo celému kurzu?
              </p>
            </div>
          </Button>
        )}
      </div>

      {/* Rozbalený chat — kitový Dialog (overlay, focus trap i stacking řeší Base UI) */}
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

          {renderChat('modal')}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AiTutorChat;
