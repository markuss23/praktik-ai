'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hand } from 'lucide-react';
import type { TicketMessageItem } from '@/api';
import { Button, ConfirmModal } from '@/components/ui';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getModule } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import {
  addTicketMessage,
  buildTicketConversation,
  claimTicket,
  dispatchStaffTicketsChanged,
  formatTicketCode,
  getTicket,
  isTicketUnresolved,
  listTicketMessages,
  TICKET_ENTITY_LABELS,
  TicketCard,
  TicketConversation,
  TicketDeleteModal,
  TicketReplyBox,
  updateTicketStatus,
  type Ticket,
} from '@/components/tickets';

const LIST_HREF = '/admin/tikety';

interface Subject {
  label: string;
  href?: string;
}

// Čeho se tiket týká + odkaz, kam se podívat (náhled kurzu, materiál).
async function resolveSubject(ticket: Ticket): Promise<Subject | null> {
  const coursePreview = (courseId: number) => `/admin?view=course-preview&courseId=${courseId}`;
  switch (ticket.entityType) {
    case 'module': {
      if (ticket.entityId == null) return null;
      const module = await getModule(ticket.entityId).catch(() => null);
      const course = ticket.courseTitle ? ` · kurz ${ticket.courseTitle}` : '';
      return {
        label: module ? `Modul „${module.title}“${course}` : `Modul #${ticket.entityId}${course}`,
        href: ticket.courseId != null ? coursePreview(ticket.courseId) : undefined,
      };
    }
    case 'course':
      return {
        label: `Kurz ${ticket.courseTitle ? `„${ticket.courseTitle}“` : `#${ticket.entityId}`}`,
        href: ticket.courseId != null ? coursePreview(ticket.courseId) : undefined,
      };
    case 'pub_resource':
      return {
        label: `Veřejný materiál #${ticket.entityId}`,
        href: `${ROUTES.PUBLIC_DATABASE}/${ticket.entityId}`,
      };
    case 'general':
      return { label: TICKET_ENTITY_LABELS.general };
    default:
      return null;
  }
}

export function StaffTicketDetailView({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [thread, setThread] = useState<TicketMessageItem[]>([]);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(ticketId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.allSettled([getTicket(ticketId, { staff: true }), listTicketMessages(ticketId)]).then(
      ([ticketResult, threadResult]) => {
        if (cancelled) return;
        const loaded = ticketResult.status === 'fulfilled' ? ticketResult.value : null;
        setTicket(loaded);
        if (threadResult.status === 'fulfilled') {
          setThread(threadResult.value);
        } else {
          setThreadError(
            threadResult.reason instanceof Error
              ? threadResult.reason.message
              : 'Konverzaci se nepodařilo načíst.',
          );
        }
        setLoading(false);
        if (loaded) {
          void resolveSubject(loaded).then((s) => {
            if (!cancelled) setSubject(s);
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // Dokud neznáme přihlášeného, nikdo není "Vy" (-1 se s žádným autorem neshoduje).
  const messages = useMemo(
    () => (ticket ? buildTicketConversation(ticket, thread, currentUser?.userId ?? -1) : []),
    [ticket, thread, currentUser?.userId],
  );

  // Odpověď backendu nemá courseTitle, necháme si ho z načteného tiketu.
  const applyUpdate = (updated: Ticket) =>
    setTicket((prev) => (prev ? { ...updated, courseTitle: prev.courseTitle } : updated));

  const handleClaim = async () => {
    if (!ticket) return;
    setActionError(null);
    setClaiming(true);
    try {
      applyUpdate(await claimTicket(ticket.ticketId));
      dispatchStaffTicketsChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Tiket se nepodařilo převzít.');
    } finally {
      setClaiming(false);
    }
  };

  const handleSend = async (text: string, { internal }: { internal: boolean }) => {
    if (!ticket) return;
    const created = await addTicketMessage(ticket.ticketId, text, internal);
    setThread((prev) => [...prev, created]);
    // Jakákoli zpráva vrací vyřešený tiket do in_progress (add_ticket_message).
    if (ticket.status === 'resolved') {
      setTicket((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
    }
  };

  const handleResolve = async () => {
    if (!ticket) return;
    applyUpdate(await updateTicketStatus(ticket.ticketId, 'resolved'));
    dispatchStaffTicketsChanged();
  };

  // Vyřešený tiket, který autor nepotvrdí, může uzavřít i staff (backend to dovoluje jen z resolved).
  const handleConfirmClose = async () => {
    if (!ticket) return;
    setActionError(null);
    setClosing(true);
    try {
      applyUpdate(await updateTicketStatus(ticket.ticketId, 'closed'));
      dispatchStaffTicketsChanged();
      setCloseOpen(false);
    } catch (err) {
      setCloseOpen(false);
      setActionError(err instanceof Error ? err.message : 'Tiket se nepodařilo uzavřít.');
    } finally {
      setClosing(false);
    }
  };

  // Psát i vyřešit jde bez převzetí, stejně jako na backendu; převzetí jen ukáže, kdo tiket řeší.
  const canResolve = ticket ? isTicketUnresolved(ticket) : false;
  const canClose = ticket?.status === 'resolved';

  const replyDisabledNotice =
    ticket?.status === 'closed'
      ? 'Tiket je uzavřený, další zprávy do něj už nelze přidat.'
      : undefined;
  const replyHint =
    ticket?.status === 'resolved'
      ? 'Tiket je vyřešený a čeká na potvrzení autorem. Když se neozve, můžete ho uzavřít sami. Další zprávou ho znovu otevřete.'
      : undefined;

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link href={LIST_HREF} className="transition-colors hover:text-foreground">
          Tikety
        </Link>
        {' / '}
        <span className="text-foreground">
          {Number.isFinite(ticketId) ? formatTicketCode(ticketId) : 'Tiket'}
        </span>
      </p>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl bg-card p-8 shadow-sm">
          <p className="text-sm text-muted-foreground">Načítání tiketu…</p>
        </div>
      ) : !ticket ? (
        <div className="rounded-xl bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Tiket nenalezen nebo k němu nemáte přístup.</p>
          <Link
            href={LIST_HREF}
            className="mt-3 inline-block text-sm font-medium text-gradient-r hover:underline"
          >
            Zpět na tikety
          </Link>
        </div>
      ) : (
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <TicketCard
            ticket={ticket}
            hideDetailButton
            large
            showPeople
            deletable
            onDelete={setTicketToDelete}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="min-w-0 text-sm">
              {subject && (
                <p className="text-muted-foreground">
                  Týká se:{' '}
                  {subject.href ? (
                    <Link href={subject.href} className="font-medium text-gradient-r hover:underline">
                      {subject.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{subject.label}</span>
                  )}
                </p>
              )}
              <p className="mt-1 text-muted-foreground">
                {ticket.status === 'open'
                  ? 'Tiket zatím nikdo neřeší. Převezměte ho, ať autor ví, že se na něm pracuje.'
                  : ticket.assigneeDisplayName
                    ? `Řeší: ${ticket.assigneeDisplayName}`
                    : 'Tiket nikdo nepřevzal.'}
              </p>
              {actionError && <p className="mt-1 text-xs text-destructive">{actionError}</p>}
            </div>
            {ticket.status === 'open' && (
              <Button onClick={() => void handleClaim()} disabled={claiming}>
                <Hand data-icon="inline-start" />
                {claiming ? 'Přebírám…' : 'Převzít tiket'}
              </Button>
            )}
          </div>

          <section>
            <h2 className="mb-4 text-xl font-bold text-foreground">Konverzace</h2>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              {threadError ? (
                <p className="text-sm text-destructive">{threadError}</p>
              ) : (
                <TicketConversation messages={messages} />
              )}
            </div>
          </section>

          <TicketReplyBox
            onSend={handleSend}
            onResolve={canResolve ? handleResolve : canClose ? () => setCloseOpen(true) : undefined}
            resolveLabel={canClose ? 'Uzavřít tiket' : 'Označit jako vyřešené'}
            allowInternal
            placeholder="Napište odpověď autorovi tiketu…"
            disabledNotice={replyDisabledNotice}
            hint={replyHint}
          />
        </div>
      )}

      <TicketDeleteModal
        ticket={ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onDeleted={() => {
          dispatchStaffTicketsChanged();
          router.push(LIST_HREF);
        }}
      />

      <ConfirmModal
        isOpen={closeOpen}
        variant="warning"
        title="Uzavřít tiket"
        message="Do uzavřeného tiketu už nepůjde psát a autor ho uvidí jako uzavřený."
        confirmLabel="Uzavřít"
        loading={closing}
        onConfirm={() => void handleConfirmClose()}
        onCancel={() => setCloseOpen(false)}
      />
    </div>
  );
}

export default StaffTicketDetailView;
