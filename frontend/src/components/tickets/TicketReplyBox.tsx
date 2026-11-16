"use client";

import { useState } from "react";
import { Button, Checkbox, Textarea } from '@/components/ui';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

interface TicketReplyBoxProps {
  /** Odeslání komentáře; vyhozená chyba se zobrazí pod polem. */
  onSend?: (text: string, options: { internal: boolean }) => Promise<void> | void;
  // Popisek tlačítka stavu (výchozí "Označit jako vyřešené").
  resolveLabel?: string;
  // Staff může místo odpovědi uložit interní poznámku.
  allowInternal?: boolean;
  placeholder?: string;
  /** Označení tiketu jako vyřešeného; vyhozená chyba se zobrazí pod polem. */
  onResolve?: () => Promise<void> | void;
  /** Skryje tlačítko „Označit jako vyřešené" (už vyřešený tiket). */
  hideResolve?: boolean;
  /** Když je nastaveno, vstupy jsou deaktivované a zobrazí se toto vysvětlení. */
  disabledNotice?: string;
  // Informace pod polem, vstupy nechává aktivní.
  hint?: string;
}

/** Karta „Vaše odpověď" pod konverzací tiketu — podle mockupu detailu. */
export function TicketReplyBox({
  onSend,
  onResolve,
  hideResolve = false,
  disabledNotice,
  hint,
  resolveLabel = "Označit jako vyřešené",
  allowInternal = false,
  placeholder = "Napište nám, s čím vám můžeme pomoci...",
}: TicketReplyBoxProps) {
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = Boolean(disabledNotice);

  const run = async (action: () => Promise<void> | void, clearText = false) => {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      if (clearText) {
        setText("");
        // Další zpráva zase míří autorovi tiketu, ať poznámka neodejde omylem.
        setInternal(false);
      }
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
    void run(() => onSend(trimmed, { internal: allowInternal && internal }), true);
  };

  return (
    <form
      onSubmit={handleSend}
      className="bg-card rounded-xl border border-border shadow-sm p-5"
    >
      <h3 className="text-base font-semibold text-foreground mb-3">Vaše odpověď</h3>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={submitting || disabled}
        className={cn("field-sizing-fixed min-h-0", "w-full px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-gradient-r/30 focus:border-gradient-r/30 disabled:opacity-60")}
      />

      {allowInternal && (
        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground select-none">
          <Checkbox
            checked={internal}
            onCheckedChange={(checked) => setInternal(checked === true)}
            disabled={submitting || disabled}
          />
          Interní poznámka (autor tiketu ji neuvidí)
        </label>
      )}

      {(disabledNotice ?? hint) && (
        <p className="mt-2 text-xs text-muted-foreground">{disabledNotice ?? hint}</p>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3 mt-4">
        {!hideResolve && onResolve ? (
          <Button
            variant="plain"
            type="button"
            onClick={() => void run(onResolve)}
            disabled={submitting || disabled}
            className={cn(BTN_KEEP_BOX, "px-4 py-2 rounded-md border border-gradient-r/30 bg-card text-sm font-medium text-gradient-r hover:bg-gradient-r/10 transition-colors disabled:opacity-60")}
          >
            {resolveLabel}
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="plain"
          type="submit"
          disabled={submitting || disabled || text.trim().length < 1}
          className={cn(BTN_KEEP_BOX, "px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-60")}
        >
          {submitting ? "Odesílám…" : internal && allowInternal ? "Uložit poznámku" : "Odeslat komentář"}
        </Button>
      </div>
    </form>
  );
}
