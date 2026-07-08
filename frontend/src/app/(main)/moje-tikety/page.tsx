"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import {
  listMyTickets,
  Ticket,
  TicketCard,
  TicketCreateModal,
} from "@/components/tickets";

type TicketsTab = "open" | "resolved";

const TAB_DEFINITIONS: { id: TicketsTab; label: string }[] = [
  { id: "open", label: "Nevyřešené" },
  { id: "resolved", label: "Vyřešené" },
];

/** Podtržené taby s počty podle mockupu. */
function TicketTabs({
  active,
  counts,
  onChange,
}: {
  active: TicketsTab;
  counts: Record<TicketsTab, number>;
  onChange: (tab: TicketsTab) => void;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-gray-200">
      {TAB_DEFINITIONS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 pb-2.5 -mb-px border-b-2 text-sm font-semibold transition-colors ${
              isActive
                ? "border-red-400 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                isActive ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function MojeTiketyPage() {
  const { user, loading: authLoading, login, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TicketsTab>("open");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      login();
    }
  }, [authLoading, user, login]);

  const loadTickets = useCallback((showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading) setLoading(true);
    listMyTickets()
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    loadTickets(true);
  }, [loadTickets]);

  const counts = useMemo<Record<TicketsTab, number>>(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    }),
    [tickets],
  );

  const visibleTickets = useMemo(
    () => tickets.filter((t) => t.status === tab),
    [tickets, tab],
  );

  return (
    <div className="py-8">
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: "1440px", width: "100%" }}
      >
        {/* Breadcrumb */}
        <p className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700 transition-colors">
            Home
          </Link>
          {" / "}
          <span className="text-gray-700">Moje tikety</span>
        </p>

        {/* Hlavička */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moje tikety</h1>
            <p className="text-sm text-gray-500 mt-1">
              Přehled vašich dotazů na podporu a jejich stav.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus size={16} />
            Nový dotaz
          </button>
        </div>

        {/* Taby */}
        <div className="mb-6">
          <TicketTabs active={tab} counts={counts} onChange={setTab} />
        </div>

        {/* Seznam */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 flex items-center justify-center">
            <p className="text-sm text-gray-500">Načítání tiketů…</p>
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-sm text-gray-500">
              {tab === "open"
                ? "Nemáte žádné nevyřešené tikety."
                : "Nemáte žádné vyřešené tikety."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTickets.map((ticket) => (
              <TicketCard
                key={ticket.ticketId}
                ticket={ticket}
                detailHref={`${ROUTES.MY_TICKETS}/${ticket.ticketId}`}
              />
            ))}
          </div>
        )}
      </div>

      <TicketCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadTickets(false)}
      />
    </div>
  );
}
