"use client";

import { useState } from "react";

interface TicketReplyBoxProps {
  /** Odeslání komentáře; vyhozená chyba se zobrazí pod polem. */
  onSend?: (text: string) => Promise<void> | void;
  /** Označení tiketu jako vyřešeného; vyhozená chyba se zobrazí pod polem. */
  onResolve?: () => Promise<void> | void;
  /** Skryje tlačítko „Označit jako vyřešené" (už vyřešený tiket). */
  hideResolve?: boolean;
  /** Když je nastaveno, vstupy jsou deaktivované a zobrazí se toto vysvětlení. */
  disabledNotice?: string;
}

/** Karta „Vaše odpověď" pod konverzací tiketu — podle mockupu detailu. */
export function TicketReplyBox({
  onSend,
  onResolve,
  hideResolve = false,
  disabledNotice,
}: TicketReplyBoxProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = Boolean(disabledNotice);

  const run = async (action: () => Promise<void> | void, clearText = false) => {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      if (clearText) setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Akce se nezdařila.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !onSend) return;
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Napište text komentáře.");
      return;
    }
    void run(() => onSend(trimmed), true);
  };

  return (
    <form
      onSubmit={handleSend}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
    >
      <h3 className="text-base font-semibold text-gray-900 mb-3">Vaše odpověď</h3>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Napište nám, s čím vám můžeme pomoci..."
        rows={4}
        disabled={submitting || disabled}
        className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
      />

      {disabledNotice && <p className="mt-2 text-xs text-gray-500">{disabledNotice}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-3 mt-4">
        {!hideResolve && onResolve ? (
          <button
            type="button"
            onClick={() => void run(onResolve)}
            disabled={submitting || disabled}
            className="px-4 py-2 rounded-md border border-purple-300 bg-white text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-60"
          >
            Označit jako vyřešené
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={submitting || disabled || text.trim().length < 1}
          className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
        >
          {submitting ? "Odesílám…" : "Odeslat komentář"}
        </button>
      </div>
    </form>
  );
}
