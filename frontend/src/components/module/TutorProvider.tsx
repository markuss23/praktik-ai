'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { MentorScope } from '@/api';
import { mentorChat } from '@/lib/api-client';
import { readApiErrorDetail } from '@/lib/api-error';

// Sdileny stav AI tutora: karta v panelu, velke okno i okno myslenkove mapy
// ukazuji stejnou konverzaci a posilaji pres stejny ask()

export type TutorMessage = { role: 'user' | 'ai'; text: string };

// Volba "Navazovat na predchozi otazky" plati pro vsechny kurzy v prohlizeci
const USE_HISTORY_STORAGE_KEY = 'ai-tutor-use-history';
// Klic bez kurzu nebo modulu se drzi jen v pameti
const MEMORY_KEY_PREFIX = '__';

const initialMessage = (scope: MentorScope): TutorMessage => ({
  role: 'ai',
  text: scope === 'course'
    ? 'Ahoj! 👋 Jsem tvůj AI asistent. Ptej se na cokoliv z celého kurzu nebo na pomoc s přípravou do výuky.'
    : 'Ahoj! 👋 Jsem tvůj AI asistent. Máš nějaké otázky k tomuto modulu nebo potřebuješ pomoc s přípravou do výuky?',
});

function readStoredMessages(key: string, scope: MentorScope): TutorMessage[] {
  if (typeof window === 'undefined' || key.startsWith(MEMORY_KEY_PREFIX)) return [initialMessage(scope)];
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as TutorMessage[];
  } catch {
    // sessionStorage nedostupny nebo poskozeny zaznam
  }
  return [initialMessage(scope)];
}

function readUseHistory(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(USE_HISTORY_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

interface TutorContextValue {
  courseId?: number;
  learnBlockId?: number;
  // Skutecny rozsah; bez learn blocku zbyva jen cely kurz
  scope: MentorScope;
  setScope: (scope: MentorScope) => void;
  messages: TutorMessage[];
  isTyping: boolean;
  useHistory: boolean;
  setUseHistory: (value: boolean) => void;
  // Rozepsana zprava, sdilena vsemi poli tutora
  draft: string;
  setDraft: (value: string) => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  // scope v options prepne rozsah (otazky z mapy jdou vzdy k modulu)
  ask: (message: string, options?: { scope?: MentorScope }) => void;
  prefill: (text: string) => void;
  // Meni se s kazdym prefill(), panel podle nej presune fokus do pole
  prefillNonce: number;
  // Pocet odeslanych otazek; karta tutora se podle nej posune do zaberu
  askCount: number;
}

const TutorContext = createContext<TutorContextValue | null>(null);

interface TutorProviderProps {
  courseId?: number;
  learnBlockId?: number;
  moduleId?: number;
  children: React.ReactNode;
}

export function TutorProvider({ courseId, learnBlockId, moduleId, children }: TutorProviderProps) {
  const [preferredScope, setPreferredScope] = useState<MentorScope>('module');
  const scope: MentorScope = learnBlockId ? preferredScope : 'course';

  // Historii vede backend zvlast pro modul a pro kurz, konverzace jsou proto oddelene
  const keyFor = useCallback(
    (s: MentorScope) => {
      if (s === 'course') return courseId !== undefined ? `ai-tutor-chat-course-${courseId}` : `${MEMORY_KEY_PREFIX}course`;
      return moduleId !== undefined ? `ai-tutor-chat-${moduleId}` : `${MEMORY_KEY_PREFIX}module`;
    },
    [courseId, moduleId],
  );
  const storageKey = keyFor(scope);

  const [conversations, setConversations] = useState<Record<string, TutorMessage[]>>({});
  const messages = useMemo(
    () => conversations[storageKey] ?? readStoredMessages(storageKey, scope),
    [conversations, storageKey, scope],
  );

  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [askCount, setAskCount] = useState(0);

  const [useHistory, setUseHistoryState] = useState(readUseHistory);
  const setUseHistory = useCallback((value: boolean) => {
    setUseHistoryState(value);
    try {
      localStorage.setItem(USE_HISTORY_STORAGE_KEY, value ? '1' : '0');
    } catch {
      // bez localStorage volba plati jen do reloadu
    }
  }, []);

  // Konverzace preziji refresh stranky (sessionStorage), zapisuji se jen zmenene
  const persistedRef = useRef<Record<string, TutorMessage[]>>({});
  useEffect(() => {
    for (const [key, list] of Object.entries(conversations)) {
      if (persistedRef.current[key] === list || key.startsWith(MEMORY_KEY_PREFIX)) continue;
      try {
        sessionStorage.setItem(key, JSON.stringify(list));
      } catch {
        // ignorujeme, konverzace zustane jen v pameti
      }
      persistedRef.current[key] = list;
    }
  }, [conversations]);

  const append = useCallback((key: string, s: MentorScope, message: TutorMessage) => {
    setConversations((prev) => ({ ...prev, [key]: [...(prev[key] ?? readStoredMessages(key, s)), message] }));
  }, []);

  const ask = useCallback(
    async (message: string, options?: { scope?: MentorScope }) => {
      const text = message.trim();
      if (!text || typingRef.current) return;
      const requested = options?.scope ?? scope;
      const s: MentorScope = requested === 'module' && !learnBlockId ? 'course' : requested;
      if (options?.scope) setPreferredScope(options.scope);
      const key = keyFor(s);
      append(key, s, { role: 'user', text });
      setChatOpen(true);
      setAskCount((n) => n + 1);
      typingRef.current = true;
      setIsTyping(true);
      try {
        if (courseId === undefined) throw new Error('No course');
        const response = await mentorChat({ scope: s, courseId, learnBlockId, message: text, useHistory });
        append(key, s, { role: 'ai', text: response.answer });
      } catch (err) {
        // Hlaska ze serveru ma prednost (napr. vycerpany denni limit AI)
        const detail = await readApiErrorDetail(err);
        append(key, s, {
          role: 'ai',
          text: detail ?? 'Omlouvám se, nepodařilo se spojit s AI tutorem. Zkuste to prosím znovu.',
        });
      } finally {
        typingRef.current = false;
        setIsTyping(false);
      }
    },
    [scope, learnBlockId, keyFor, append, courseId, useHistory],
  );

  const prefill = useCallback((text: string) => {
    setDraft(text);
    setPrefillNonce((n) => n + 1);
  }, []);

  const value = useMemo<TutorContextValue>(
    () => ({
      courseId,
      learnBlockId,
      scope,
      setScope: setPreferredScope,
      messages,
      isTyping,
      useHistory,
      setUseHistory,
      draft,
      setDraft,
      chatOpen,
      setChatOpen,
      ask: (message, options) => void ask(message, options),
      prefill,
      prefillNonce,
      askCount,
    }),
    [courseId, learnBlockId, scope, messages, isTyping, useHistory, setUseHistory, draft, chatOpen, ask, prefill, prefillNonce, askCount],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error('useTutor musí být uvnitř TutorProvider');
  return ctx;
}
