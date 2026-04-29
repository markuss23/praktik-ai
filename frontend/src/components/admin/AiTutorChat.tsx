'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, SendHorizontal, UserRound, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { learnBlocksChat } from '@/lib/api-client';

interface AiTutorChatProps {
  /** The current learn block ID to chat about */
  learnBlockId?: number;
  /** Module ID — used to scope chat history persistence in sessionStorage. */
  moduleId?: number;
}

type ChatMessage = { role: 'user' | 'ai'; text: string };

const INITIAL_MESSAGE: ChatMessage = {
  role: 'ai',
  text: 'Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo potřebuješ pomoc s přípravou do výuky?',
};

const readStoredMessages = (key: string | null): ChatMessage[] => {
  if (typeof window === 'undefined' || !key) return [INITIAL_MESSAGE];
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as ChatMessage[];
  } catch { /* ignore */ }
  return [INITIAL_MESSAGE];
};

export function AiTutorChat({ learnBlockId, moduleId }: AiTutorChatProps) {
  const storageKey = moduleId !== undefined ? `ai-tutor-chat-${moduleId}` : null;

  const [chatOpen, setChatOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => readStoredMessages(storageKey));
  const inlineEndRef = useRef<HTMLDivElement>(null);
  const modalEndRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  // Track which storage key the current chatMessages belong to, so module
  // switches don't write stale chat into the new module's slot before reload.
  const loadedKeyRef = useRef<string | null>(storageKey);
  const skipNextPersistRef = useRef(false);

  // When moduleId changes (user navigates to another module without unmounting
  // this component), swap to that module's saved chat history.
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return;
    loadedKeyRef.current = storageKey;
    skipNextPersistRef.current = true;
    setChatMessages(readStoredMessages(storageKey));
  }, [storageKey]);

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

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isAiTyping) return;
    const msg = chatMessage.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatMessage('');
    setIsAiTyping(true);
    try {
      if (!learnBlockId) throw new Error('No learn block');
      const response = await learnBlocksChat(learnBlockId, msg);
      setChatMessages(prev => [...prev, { role: 'ai', text: response.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Omlouvám se, nepodařilo se spojit s AI tutorem. Zkuste to prosím znovu.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setChatMessages(prev => [...prev, { role: 'user', text: suggestion }]);
    setIsAiTyping(true);
    if (learnBlockId) {
      learnBlocksChat(learnBlockId, suggestion)
        .then(res => setChatMessages(prev => [...prev, { role: 'ai', text: res.answer }]))
        .catch(() => setChatMessages(prev => [...prev, { role: 'ai', text: 'Omlouvám se, nepodařilo se spojit s AI tutorem.' }]))
        .finally(() => setIsAiTyping(false));
    } else {
      setIsAiTyping(false);
    }
  };

  const renderChat = useCallback((variant: 'inline' | 'modal') => {
    const endRef = variant === 'modal' ? modalEndRef : inlineEndRef;
    const messagesAreaClass =
      variant === 'modal'
        ? 'flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-4 bg-white min-h-0'
        : 'px-4 py-3 space-y-3 max-h-64 overflow-y-auto no-scrollbar border-t border-gray-100 bg-white';
    const bubbleSize = variant === 'modal' ? 'text-base px-4 py-2.5 max-w-[80%]' : 'text-sm px-3 py-2 max-w-[75%]';
    const avatarSize = variant === 'modal' ? 'w-9 h-9' : 'w-7 h-7';
    const avatarIconSize = variant === 'modal' ? 'w-5 h-5' : 'w-4 h-4';

    return (
      <>
        <div className={messagesAreaClass}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0`}
                  style={{ backgroundColor: '#EFEFEF' }}>
                  <Bot className={`${avatarIconSize} text-black`} />
                </div>
              )}
              <div
                className={`${bubbleSize} rounded-2xl break-words whitespace-pre-wrap min-w-0 ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'text-black rounded-bl-sm'
                }`}
                style={{
                  backgroundColor: msg.role === 'user' ? '#000000' : '#EFEFEF',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0`}
                  style={{ backgroundColor: '#EFEFEF' }}>
                  <UserRound className={`${avatarIconSize} text-black`} />
                </div>
              )}
            </div>
          ))}

          {/* Loading bubble */}
          {isAiTyping && (
            <div className="flex items-end gap-2 justify-start">
              <div className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0`}
                style={{ backgroundColor: '#EFEFEF' }}>
                <Bot className={`${avatarIconSize} text-black`} />
              </div>
              <div className="rounded-2xl px-4 py-3 rounded-bl-sm" style={{ backgroundColor: '#EFEFEF' }}>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggested questions — jen ve fázi prvního pozdravu */}
        {chatMessages.length <= 1 && (
          <div className={`${variant === 'modal' ? 'px-6 pb-3' : 'px-4 pb-2'} flex flex-wrap gap-1.5 bg-white`}>
            <button
              onClick={() => handleSuggestion('Jak můžu využít AI pro diferenciaci výuky?')}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              Jak můžu využít AI pro diferenciaci výuky?
            </button>
          </div>
        )}

        {/* Chat Input */}
        <div className={`${variant === 'modal' ? 'px-6 py-4' : 'px-3 py-3'} border-t border-gray-100 bg-white`}>
          <div
            className="flex items-center justify-between border border-gray-300 mx-auto"
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
              className={`flex-grow bg-transparent ${variant === 'modal' ? 'text-base' : 'text-sm'} text-gray-700 placeholder:text-gray-400 focus:outline-none min-w-0`}
            />
            <button
              onClick={handleSendChat}
              disabled={!chatMessage.trim() || isAiTyping}
              title={isAiTyping ? 'Počkejte, než AI dopíše odpověď' : undefined}
              aria-label="Odeslat zprávu"
              className={`flex-shrink-0 transition-all ${
                chatMessage.trim() && !isAiTyping ? 'text-black hover:opacity-70' : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <SendHorizontal className={variant === 'modal' ? 'w-6 h-6' : 'w-5 h-5'} />
            </button>
          </div>
        </div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, isAiTyping, chatMessage]);

  return (
    <>
      <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        {/* Tutor Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900 text-sm">AI Tutor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setChatOpen(true); setExpanded(true); }}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              title="Otevřít ve velkém"
              aria-label="Otevřít AI tutora ve velkém"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {chatOpen && (
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                aria-label="Sbalit AI tutora"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Inline chat */}
        {chatOpen ? (
          renderChat('inline')
        ) : (
          /* Collapsed state - click to open */
          <button
            onClick={() => setChatOpen(true)}
            className="w-full px-4 py-3 border-t border-gray-100 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: '#EFEFEF' }}>
                <Bot className="w-4 h-4 text-black" />
              </div>
              <p className="text-sm text-gray-600 leading-snug break-words">
                Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu?
              </p>
            </div>
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="ai-tutor-modal"
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
              style={{ height: 'min(90vh, 800px)' }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              role="dialog"
              aria-modal="true"
              aria-label="AI tutor"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFEFEF' }}>
                    <Bot className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 leading-tight">AI Tutor</p>
                    <p className="text-xs text-gray-500">Pomocník pro učební materiály</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-md hover:bg-gray-100"
                  aria-label="Zavřít"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderChat('modal')}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AiTutorChat;
