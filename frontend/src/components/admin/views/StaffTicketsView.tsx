'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { TicketCardsSkeleton } from '@/components/ui';
import { useRole } from '@/hooks/useRole';
import {
  isTicketUnassigned,
  isTicketUnresolved,
  listStaffTickets,
  TicketCard,
  TicketTabs,
  type Ticket,
} from '@/components/tickets';

// Nové = nevyřešené, které nikdo neřeší (i znovu otevřené bez převzetí),
// V řešení = převzaté nevyřešené, Vyřešené = resolved/closed.
type StaffTab = 'new' | 'active' | 'done';

const TABS: { id: StaffTab; label: string }[] = [
  { id: 'new', label: 'Nové' },
  { id: 'active', label: 'V řešení' },
  { id: 'done', label: 'Vyřešené' },
];

const EMPTY_TEXT: Record<StaffTab, string> = {
  new: 'Žádné nové tikety.',
  active: 'Žádné tikety v řešení.',
  done: 'Zatím žádné vyřešené tikety.',
};

function staffTab(ticket: Ticket): StaffTab {
  if (isTicketUnassigned(ticket)) return 'new';
  return isTicketUnresolved(ticket) ? 'active' : 'done';
}

export function StaffTicketsView() {
  const { isGuarantor } = useRole();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StaffTab>('new');

  useEffect(() => {
    let cancelled = false;
    listStaffTickets()
      .then((data) => {
        if (!cancelled) setTickets(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Tikety se nepodařilo načíst.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo<Record<StaffTab, number>>(() => {
    const result: Record<StaffTab, number> = { new: 0, active: 0, done: 0 };
    tickets.forEach((t) => {
      result[staffTab(t)] += 1;
    });
    return result;
  }, [tickets]);

  const visible = useMemo(() => tickets.filter((t) => staffTab(t) === tab), [tickets, tab]);

  return (
    <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tikety</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isGuarantor
              ? 'Dotazy ke všem kurzům, veřejným materiálům i obecné dotazy.'
              : 'Dotazy studentů k vašim kurzům.'}
          </p>
        </div>
        <TicketTabs tabs={TABS} active={tab} counts={counts} onChange={setTab} />
      </div>

      {loading ? (
        <TicketCardsSkeleton count={6} layout="grid" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TicketIcon size={48} className="mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">{EMPTY_TEXT[tab]}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((ticket) => (
            <TicketCard
              key={ticket.ticketId}
              ticket={ticket}
              detailHref={`/admin/tikety/${ticket.ticketId}`}
              showPeople
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default StaffTicketsView;
