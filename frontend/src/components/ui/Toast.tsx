'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title?: string;
  message: string;
  durationMs: number;
}

interface ToastContextValue {
  show: (input: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => number;
  dismiss: (id: number) => void;
  /** Convenience: surface an error to the user. Accepts Error, plain string, or unknown. */
  error: (err: unknown, fallback?: string) => number;
  success: (message: string, title?: string) => number;
  info: (message: string, title?: string) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>(
    (input) => {
      const id = ++idRef.current;
      const duration = input.durationMs ?? (input.variant === 'error' ? 6000 : 4000);
      setToasts((prev) => [...prev, { id, durationMs: duration, ...input }]);
      window.setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const error = useCallback<ToastContextValue['error']>(
    (err, fallback = 'Něco se nepodařilo. Zkuste to znovu.') => {
      const message = parseApiErrorMessage(err) ?? fallback;
      const title = inferErrorTitle(err);
      return show({ variant: 'error', title, message });
    },
    [show],
  );

  const success = useCallback<ToastContextValue['success']>(
    (message, title) => show({ variant: 'success', title, message }),
    [show],
  );
  const info = useCallback<ToastContextValue['info']>(
    (message, title) => show({ variant: 'info', title, message }),
    [show],
  );

  const value = useMemo(
    () => ({ show, dismiss, error, success, info }),
    [show, dismiss, error, success, info],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useToast() called outside ToastProvider — falling back to console.');
    }
    const noop = () => 0;
    return {
      show: noop,
      dismiss: () => {},
      error: (err) => {
        console.error('[toast:error]', err);
        return 0;
      },
      success: noop,
      info: noop,
    };
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-[2500] flex flex-col items-end gap-2 max-w-[min(380px,calc(100vw-2rem))]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { ring: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  success: { ring: 'border-emerald-200', bg: 'bg-emerald-50 text-emerald-900', icon: CheckCircle },
  error: { ring: 'border-red-200', bg: 'bg-red-50 text-red-900', icon: AlertTriangle },
  warning: { ring: 'border-amber-200', bg: 'bg-amber-50 text-amber-900', icon: AlertTriangle },
  info: { ring: 'border-blue-200', bg: 'bg-blue-50 text-blue-900', icon: Info },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const v = VARIANT_STYLES[toast.variant];
  const Icon = v.icon;
  return (
    <motion.div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`pointer-events-auto w-full ${v.bg} border ${v.ring} shadow-lg rounded-lg px-4 py-3 flex items-start gap-3`}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold mb-0.5">{toast.title}</p>}
        <p className="text-sm leading-snug break-words">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Zavřít upozornění"
        className="p-1 -m-1 rounded hover:bg-black/5 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4 opacity-60" />
      </button>
    </motion.div>
  );
}

interface ResponseLike {
  status?: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}

interface MaybeApiError {
  message?: string;
  status?: number;
  response?: ResponseLike;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Neplatná data — zkontrolujte vyplněná pole.',
  401: 'Nejste přihlášeni. Přihlaste se prosím znovu.',
  403: 'K této akci nemáte oprávnění.',
  404: 'Položka nebyla nalezena.',
  409: 'Konflikt — položka již existuje nebo byla mezitím změněna.',
  413: 'Soubor je příliš velký.',
  500: 'Chyba serveru. Zkuste to prosím za chvíli znovu.',
  502: 'Server není dostupný. Zkuste to prosím za chvíli znovu.',
  503: 'Služba je dočasně nedostupná. Zkuste to prosím za chvíli znovu.',
};

function inferErrorTitle(err: unknown): string | undefined {
  const status = readStatus(err);
  if (status === 401) return 'Přihlášení vypršelo';
  if (status === 403) return 'Nedostatečná oprávnění';
  if (status === 404) return 'Nenalezeno';
  if (status && status >= 500) return 'Chyba serveru';
  return undefined;
}

function readStatus(err: unknown): number | undefined {
  const e = err as MaybeApiError | undefined;
  if (!e) return undefined;
  if (typeof e.status === 'number') return e.status;
  if (e.response && typeof e.response.status === 'number') return e.response.status;
  if (typeof e.message === 'string') {
    const m = e.message.match(/(\d{3})/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

export function parseApiErrorMessage(err: unknown): string | null {
  if (!err) return null;
  const status = readStatus(err);
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (typeof err === 'string') return err;
  if (err instanceof Error && err.message) {
    if (/Failed to fetch|NetworkError/i.test(err.message)) {
      return 'Síťová chyba — zkontrolujte připojení.';
    }
    return err.message;
  }
  return null;
}
