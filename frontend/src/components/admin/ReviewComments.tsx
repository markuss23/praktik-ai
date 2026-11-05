'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { CheckCircle, CornerDownRight, X } from 'lucide-react';

import type { FeedbackItem } from '@/api';
import { Button, Drawer, DrawerContent, Textarea } from '@/components/ui';
import { getFeedbackSection, replyToFeedback, resolveFeedback } from '@/lib/api-client';
import { BTN_KEEP_BOX, cn } from '@/lib/utils';

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
export function CommentsDrawer({ open, onOpenChange, title, subtitle, anchorRef, children, footer }: CommentsDrawerProps) {
  const top = useAnchorBottom(anchorRef, open);
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
      </DrawerContent>
    </Drawer>
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
