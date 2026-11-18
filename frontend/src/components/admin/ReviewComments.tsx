'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { CheckCircle, ChevronDown, CornerDownRight, Loader2, Send, Trash2, TriangleAlert, X } from 'lucide-react';

import type { FeedbackItem } from '@/api';
import { Alert, AlertDescription, Badge, Button, Drawer, DrawerContent, Label, Textarea } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getFeedbackSection, replyToFeedback, resolveFeedback } from '@/lib/api-client';
import { BTN_KEEP_BOX, cn, timeAgo } from '@/lib/utils';

// ── Panel ────────────────────────────────────────────────────────────────────

interface CommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Kontext pod titulkem — krok nebo modul, ke kterému komentáře patří. */
  subtitle?: string;
  /**
   * Hlavička stránky — panel začíná pod ní, aby tlačítka v hlavičce (přepínač
   * komentářů, Schválit / Zamítnout) zůstala vidět a šla použít.
   */
  anchorRef?: RefObject<HTMLElement | null>;
  // Od této šířky (CSS délka, např. "90rem") je panel sloupec vedle obsahu místo překryvu
  inlineMinWidth?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Spodní hrana hlavičky v px, dokud je panel otevřený (sleduje změnu velikosti). */
function useAnchorBottom(anchorRef: RefObject<HTMLElement | null> | undefined, active: boolean) {
  const [bottom, setBottom] = useState(0);
  useLayoutEffect(() => {
    const el = anchorRef?.current;
    if (!active || !el) return;
    const update = () => setBottom(Math.max(0, el.getBoundingClientRect().bottom));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    // Pod lg roluje celá stránka a hlavička odjede nahoru — panel ji sleduje
    // (capture zachytí i rolování vnitřních kontejnerů).
    window.addEventListener('scroll', update, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, { capture: true });
    };
  }, [anchorRef, active]);
  return bottom;
}

/**
 * Komentáře ke schvalování jako panel vysouvající se zprava přes obsah.
 * Nemodální: stránka pod ním zůstává ovladatelná (garant čte obsah a rovnou
 * k němu píše), zavírá se křížkem, tlačítkem v hlavičce nebo Escape — ne
 * klikem vedle, ať při čtení obsahu nezajíždí.
 */
export function CommentsDrawer({ open, onOpenChange, title, subtitle, anchorRef, inlineMinWidth, children, footer }: CommentsDrawerProps) {
  const inline = useMediaQuery(inlineMinWidth ? `(min-width: ${inlineMinWidth})` : null);
  const top = useAnchorBottom(anchorRef, open && !inline);

  const content = (
    <>
      <div className="flex items-start justify-between gap-2 border-b border-border p-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground" title={subtitle}>{subtitle}</p>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Zavřít komentáře">
          <X />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">{children}</div>
      {footer && <div className="border-t border-border p-3 shrink-0">{footer}</div>}
    </>
  );

  // Na široké obrazovce sloupec v layoutu, nezakrývá obsah ani jeho patičku
  if (inline) {
    return open ? (
      <aside
        aria-label={title}
        className="flex w-80 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
      >
        {content}
      </aside>
    ) : null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection="right"
      modal={false}
      disablePointerDismissal
    >
      <DrawerContent
        aria-label={title}
        className={cn('shadow-xl', top > 0 && 'rounded-tl-none')}
        style={top > 0 ? { top } : undefined}
      >
        {content}
      </DrawerContent>
    </Drawer>
  );
}

// ── Garant ───────────────────────────────────────────────────────────────────

interface ReviewerCommentListProps {
  feedbacks: FeedbackItem[];
  emptyText: string;
  contextLabel: (fb: FeedbackItem) => string | null;
  canDelete: (fb: FeedbackItem) => boolean;
  deletingId: number | null;
  onDelete: (feedbackId: number) => void;
}

// Komentáře garanta: nevyřešené nahoře, vyřešené autorem sbalené pod nimi
export function ReviewerCommentList({ feedbacks, emptyText, contextLabel, canDelete, deletingId, onDelete }: ReviewerCommentListProps) {
  const [showResolved, setShowResolved] = useState(false);
  const unresolved = feedbacks.filter((fb) => !fb.isResolved);
  const resolved = feedbacks.filter((fb) => fb.isResolved);

  if (feedbacks.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>;
  }

  const renderItem = (fb: FeedbackItem) => (
    <ReviewerComment
      key={fb.feedbackId}
      fb={fb}
      label={contextLabel(fb)}
      deletable={canDelete(fb)}
      deleting={deletingId === fb.feedbackId}
      onDelete={() => onDelete(fb.feedbackId)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-muted-foreground">K opravě ({unresolved.length})</h3>
        {unresolved.length > 0 ? (
          unresolved.map(renderItem)
        ) : (
          <p className="text-xs text-muted-foreground">Žádné nevyřešené komentáře.</p>
        )}
      </section>
      {resolved.length > 0 && (
        <section className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolved((v) => !v)}
            aria-expanded={showResolved}
            className="justify-between px-1 text-xs font-semibold text-muted-foreground"
          >
            Vyřešené autorem ({resolved.length})
            <ChevronDown data-icon="inline-end" className={cn('transition-transform', showResolved && 'rotate-180')} />
          </Button>
          {showResolved && resolved.map(renderItem)}
        </section>
      )}
    </div>
  );
}

function ReviewerComment({
  fb,
  label,
  deletable,
  deleting,
  onDelete,
}: {
  fb: FeedbackItem;
  label: string | null;
  deletable: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={cn('rounded-xl px-3.5 py-2.5', fb.isResolved ? 'border border-success/30 bg-success/10' : 'bg-muted')}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-foreground">{fb.author.displayName ?? 'Uživatel'}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {fb.isResolved && <Badge variant="resolved">Vyřešeno</Badge>}
          <span className="text-[11px] text-muted-foreground">{timeAgo(fb.createdAt)}</span>
          {
            // Komentář s odpovědí autora už smazat nejde (zmizela by i odpověď)
            deletable && !fb.reply && (
              <Button
                variant="ghost-destructive"
                size="icon-xs"
                onClick={onDelete}
                disabled={deleting}
                aria-label="Smazat komentář"
              >
                <Trash2 />
              </Button>
            )
          }
        </div>
      </div>
      {label && <p className="mb-1 text-[10px] font-medium text-gradient-r">{label}</p>}
      <p className="text-xs leading-relaxed text-foreground">{fb.feedback}</p>
      {fb.reply && (
        <div className="mt-2 ml-3 rounded-lg bg-card/70 px-3 py-2">
          <div className="mb-0.5 flex items-center gap-1">
            <CornerDownRight size={10} className="text-gradient-r" />
            <span className="text-[10px] font-medium text-gradient-r">Odpověď autora</span>
          </div>
          <p className="text-xs leading-relaxed text-foreground">{fb.reply}</p>
        </div>
      )}
    </div>
  );
}

interface ReviewerCommentComposerProps {
  // Kam se komentář uloží, např. "Příručka – str. 2"
  target: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  warning?: string | null;
}

// Pole pro nový komentář garanta; nad ním je vidět, ke které části se uloží
export function ReviewerCommentComposer({ target, value, onChange, onSubmit, submitting, warning }: ReviewerCommentComposerProps) {
  const inputId = useId();
  return (
    <div className="flex flex-col gap-2">
      {warning && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription className="text-xs">{warning}</AlertDescription>
        </Alert>
      )}
      <Label htmlFor={inputId} className="block text-xs font-normal text-muted-foreground">
        Komentář k: <span className="font-medium text-foreground">{target}</span>
      </Label>
      <div className="flex gap-2">
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="Co má autor opravit…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          className="field-sizing-fixed min-h-0 flex-1 resize-none text-xs"
        />
        <Button
          variant="brand-solid"
          size="icon"
          onClick={onSubmit}
          disabled={!value.trim() || submitting}
          aria-label="Odeslat komentář"
          className="self-end rounded-full"
        >
          {submitting ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Enter odešle, Shift+Enter nový řádek.</p>
    </div>
  );
}

// ── Autor vráceného kurzu ─────────────────────────────────────────────────────

/** Komentáře garanta ke kurzu + odpověď a označení „vyřešeno" (strana autora). */
export function useAuthorReviewFeedback(courseId: number) {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    getFeedbackSection(courseId)
      .then((section) => {
        if (!cancelled) setFeedbacks(section.feedbacks);
      })
      .catch(() => {}); // feedback may not exist
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const replace = (updated: FeedbackItem) =>
    setFeedbacks((prev) => prev.map((fb) => (fb.feedbackId === updated.feedbackId ? updated : fb)));

  return {
    feedbacks,
    reply: async (feedbackId: number, text: string) => replace(await replyToFeedback(feedbackId, text)),
    toggleResolve: async (fb: FeedbackItem) => replace(await resolveFeedback(fb.feedbackId, !fb.isResolved)),
  };
}

const AUTO_OPEN_KEY = 'reviewComments.autoOpened';

/**
 * Při prvním otevření vráceného kurzu otevře panel sám — v kroku, který má
 * nevyřešené komentáře. Pamatuje si nejnovější komentář, při dalším kole
 * zamítnutí (nové komentáře) se panel otevře znovu.
 */
export function useAutoOpenReviewComments(
  courseId: number,
  enabled: boolean,
  allFeedbacks: FeedbackItem[],
  stepFeedbacks: FeedbackItem[],
  setOpen: (open: boolean) => void,
) {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !enabled) return;
    if (!stepFeedbacks.some((fb) => !fb.isResolved)) return;
    handled.current = true;

    const newest = Math.max(...allFeedbacks.filter((fb) => !fb.isResolved).map((fb) => fb.feedbackId));
    const key = `${AUTO_OPEN_KEY}.${courseId}`;
    try {
      if ((Number(localStorage.getItem(key)) || 0) >= newest) return;
      localStorage.setItem(key, String(newest));
    } catch {
      // bez úložiště se panel otevře jen v rámci tohoto zobrazení
    }
    setOpen(true);
  }, [courseId, enabled, allFeedbacks, stepFeedbacks, setOpen]);
}

interface AuthorCommentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtitle?: string;
  anchorRef?: RefObject<HTMLElement | null>;
  /** Komentáře aktuálního kroku / modulu. */
  feedbacks: FeedbackItem[];
  /** Všechny komentáře kurzu — pro počítadlo vyřešených. */
  allFeedbacks: FeedbackItem[];
  emptyText: string;
  contextLabel: (fb: FeedbackItem) => string | null;
  onReply: (feedbackId: number, text: string) => Promise<void>;
  onToggleResolve: (fb: FeedbackItem) => Promise<void>;
}

/** Komentáře garanta u vráceného kurzu — autor na ně odpovídá a odškrtává je. */
export function AuthorCommentsDrawer({
  open,
  onOpenChange,
  subtitle,
  anchorRef,
  feedbacks,
  allFeedbacks,
  emptyText,
  contextLabel,
  onReply,
  onToggleResolve,
}: AuthorCommentsDrawerProps) {
  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const resolvedCount = allFeedbacks.filter((fb) => fb.isResolved).length;
  const allResolved = allFeedbacks.length > 0 && resolvedCount === allFeedbacks.length;

  const submitReply = async (feedbackId: number) => {
    const text = replyTexts[feedbackId]?.trim();
    if (!text) return;
    setBusy(feedbackId);
    try {
      await onReply(feedbackId, text);
      setReplyFor(null);
      setReplyTexts((prev) => ({ ...prev, [feedbackId]: '' }));
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setBusy(null);
    }
  };

  const toggleResolve = async (fb: FeedbackItem) => {
    setBusy(fb.feedbackId);
    try {
      await onToggleResolve(fb);
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <CommentsDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Komentáře ke schválení${feedbacks.length > 0 ? ` (${feedbacks.length})` : ''}`}
      subtitle={subtitle}
      anchorRef={anchorRef}
      footer={
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Vyřešeno v celém kurzu: {resolvedCount}/{allFeedbacks.length}
            </span>
            {allResolved && (
              <span className="flex items-center gap-1 font-medium text-success">
                <CheckCircle size={12} /> Vše vyřešeno
              </span>
            )}
          </div>
          {allResolved && (
            <p className="text-muted-foreground">Kurz můžete znovu odeslat ke schválení v přehledu kurzů.</p>
          )}
        </div>
      }
    >
      {feedbacks.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        feedbacks.map((fb) => (
          <div
            key={fb.feedbackId}
            className={cn('rounded-xl border', fb.isResolved ? 'border-success/30 bg-success/10' : 'border-border')}
          >
            <div className="px-3.5 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{fb.author.displayName ?? 'Uživatel'}</span>
                <Button
                  variant="plain"
                  onClick={() => void toggleResolve(fb)}
                  disabled={busy === fb.feedbackId}
                  className={cn(BTN_KEEP_BOX, 'shrink-0 rounded p-0.5 transition-colors', fb.isResolved
                    ? 'text-success hover:text-success'
                    : 'text-muted-foreground hover:text-success')}
                  title={fb.isResolved ? 'Označit jako nevyřešené' : 'Označit jako vyřešené'}
                  aria-label={fb.isResolved ? 'Označit jako nevyřešené' : 'Označit jako vyřešené'}
                >
                  <CheckCircle size={16} />
                </Button>
              </div>
              {contextLabel(fb) && <p className="mb-1 text-[10px] font-medium text-gradient-r">{contextLabel(fb)}</p>}
              <p className="text-xs leading-relaxed text-foreground">{fb.feedback}</p>
            </div>

            <div className="px-3.5 pb-2.5">
              {fb.reply ? (
                <div className="ml-3 rounded-lg bg-gradient-r/10 px-3 py-2">
                  <div className="mb-0.5 flex items-center gap-1">
                    <CornerDownRight size={10} className="text-gradient-r" />
                    <span className="text-[10px] font-medium text-gradient-r">Vaše odpověď</span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground">{fb.reply}</p>
                </div>
              ) : replyFor === fb.feedbackId ? (
                <div>
                  <Textarea
                    value={replyTexts[fb.feedbackId] ?? ''}
                    onChange={(e) => setReplyTexts((prev) => ({ ...prev, [fb.feedbackId]: e.target.value }))}
                    rows={2}
                    placeholder="Napište odpověď..."
                    className={cn('field-sizing-fixed min-h-0', 'w-full resize-none rounded-lg border border-border px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gradient-r/30')}
                  />
                  <div className="mt-1 flex gap-1">
                    <Button
                      variant="brand-solid"
                      onClick={() => void submitReply(fb.feedbackId)}
                      disabled={busy === fb.feedbackId}
                      className={cn(BTN_KEEP_BOX, 'flex-1 rounded-lg py-1 text-xs font-medium disabled:opacity-50')}
                    >
                      Odeslat
                    </Button>
                    <Button
                      variant="plain"
                      onClick={() => setReplyFor(null)}
                      className={cn(BTN_KEEP_BOX, 'px-2 py-1 text-xs text-muted-foreground hover:text-foreground')}
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="plain"
                  onClick={() => setReplyFor(fb.feedbackId)}
                  className={cn(BTN_KEEP_BOX, 'flex items-center gap-0.5 text-xs text-gradient-r hover:underline')}
                >
                  <CornerDownRight size={11} /> Odpovědět
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </CommentsDrawer>
  );
}
