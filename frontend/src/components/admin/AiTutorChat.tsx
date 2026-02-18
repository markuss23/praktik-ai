'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, SendHorizontal, UserRound } from 'lucide-react';
import { learnBlocksChat } from '@/lib/api-client';

interface AiTutorChatProps {
  /** The current learn block ID to chat about */
  learnBlockId?: number;
}

/**
 * AI Tutor chatbot sidebar component.
 * Provides a collapsible chat interface for students to ask questions about the current module.
 */
export function AiTutorChat({ learnBlockId }: AiTutorChatProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo potřebuješ pomoc s přípravou do výuky?' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    const el = chatEndRef.current;
    if (el?.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

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

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
      {/* Tutor Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-900 text-sm">AI Tutor</span>
        </div>
        {chatOpen && (
          <button
            onClick={() => setChatOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Chat area */}
      {chatOpen ? (
        <>
          {/* Chat Messages */}
          <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto border-t border-gray-100 bg-white">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#EFEFEF' }}>
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'text-black rounded-bl-sm'
                }`}
                  style={{ backgroundColor: msg.role === 'user' ? '#000000' : '#EFEFEF' }}
                >
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#EFEFEF' }}>
                    <UserRound className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
            ))}
            {/* Loading bubble */}
            {isAiTyping && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#EFEFEF' }}>
                  <Bot className="w-4 h-4 text-black" />
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
            <div ref={chatEndRef} />
          </div>

          {/* Suggested questions */}
          {chatMessages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 bg-white">
              <button
                onClick={() => handleSuggestion('Jak můžu využít AI pro diferenciaci výuky?')}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Jak můžu využít AI pro diferenciaci výuky?
              </button>
            </div>
          )}

          {/* Chat Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white">
            <div
              className="flex items-center justify-between border border-gray-300 mx-auto"
              style={{ maxWidth: 280, height: 50, borderRadius: 100, paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12 }}
            >
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="Jak komunikovat s AI?"
                className="flex-grow bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none min-w-0"
              />
              <button
                onClick={handleSendChat}
                disabled={!chatMessage.trim() || isAiTyping}
                className={`flex-shrink-0 transition-all ${
                  chatMessage.trim() && !isAiTyping ? 'text-black hover:opacity-70' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <SendHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
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
            <p className="text-sm text-gray-600 leading-snug">
              Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu?
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

export default AiTutorChat;
