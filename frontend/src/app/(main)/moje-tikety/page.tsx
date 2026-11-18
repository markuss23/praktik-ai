"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TicketCardsSkeleton,
} from "@/components/ui";
import {
  isTicketUnresolved,
  listMyTickets,
  NEW_TICKET_QUERY_PARAM,
  takeTicketDraft,
  Ticket,
  TICKET_CATEGORY_LABELS,
  TICKET_CREATED_EVENT,
  TicketCard,
  type TicketCategory,
  TicketCreateModal,
  TicketDeleteModal,
  type TicketDraft,
  TicketTabs,
} from "@/components/tickets";

// Nevyřešené = open/in_progress/pending, Vyřešené = resolved/closed.
type TicketsTab = "open" | "resolved";

function ticketTab(ticket: Ticket): TicketsTab {
  return isTicketUnresolved(ticket) ? "open" : "resolved";
}

const TAB_DEFINITIONS: { id: TicketsTab; label: string }[] = [
  { id: "open", label: "Nevyřešené" },
  { id: "resolved", label: "Vyřešené" },
];

export default function MojeTiketyPage() {
  const { user, loading: authLoading, login, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TicketsTab>("open");
  const [createOpen, setCreateOpen] = useState(false);
  /** Dotaz odložený v AI chatu před přihlášením — předvyplní „Nový dotaz". */
  const [createDraft, setCreateDraft] = useState<TicketDraft | null>(null);
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TicketCategory | "">("");
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      // Po přihlášení zpět sem — i s parametrem pro otevření „Nového dotazu".
      login(`${window.location.pathname}${window.location.search}`);
    }
  }, [authLoading, user, login]);

  // Návrat z přihlášení
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has(NEW_TICKET_QUERY_PARAM)) return;
    params.delete(NEW_TICKET_QUERY_PARAM);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
    setCreateDraft(takeTicketDraft());
    setCreateOpen(true);
  }, [isAuthenticated]);

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

  // Tiket založený z AI chatu ve widgetu — seznam se obnoví bez skeletonu.
  useEffect(() => {
    const onCreated = () => loadTickets(false);
    window.addEventListener(TICKET_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(TICKET_CREATED_EVENT, onCreated);
  }, [loadTickets]);

  // Kurzy pro filtr — unikátní názvy z načtených tiketů.
  const courseOptions = useMemo(
    () =>
      Array.from(
        new Set(tickets.map((t) => t.courseTitle).filter((c): c is string => Boolean(c))),
      ).sort((a, b) => a.localeCompare(b, "cs")),
    [tickets],
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (courseFilter === "" || t.courseTitle === courseFilter) &&
          (typeFilter === "" || t.category === typeFilter),
      ),
    [tickets, courseFilter, typeFilter],
  );

  const counts = useMemo<Record<TicketsTab, number>>(
    () => ({
      open: filteredTickets.filter((t) => ticketTab(t) === "open").length,
      resolved: filteredTickets.filter((t) => ticketTab(t) === "resolved").length,
    }),
    [filteredTickets],
  );

  const visibleTickets = useMemo(
    () => filteredTickets.filter((t) => ticketTab(t) === tab),
    [filteredTickets, tab],
  );

  const hasActiveFilter = courseFilter !== "" || typeFilter !== "";

  // Base UI Select potřebuje `items`; placeholder = položka s `value: null`.
  const courseItems = [
    { label: "Všechny kurzy", value: null },
    ...courseOptions.map((course) => ({ label: course, value: course })),
  ];
  const typeItems = [
    { label: "Všechny typy", value: null },
    ...(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((category) => ({
      label: TICKET_CATEGORY_LABELS[category],
      value: category,
    })),
  ];

  return (
    <div className="py-8">
      <div
        className="mx-auto px-4 sm:px-6 lg:px-[100px]"
        style={{ maxWidth: "1440px", width: "100%" }}
      >
        {/* Breadcrumb */}
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          {" / "}
          <span className="text-foreground">Moje tikety</span>
        </p>

        {/* Hlavička */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Moje tikety</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Přehled vašich dotazů na podporu a jejich stav.
            </p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Nový dotaz
          </Button>
        </div>

        {/* Taby + filtry */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <TicketTabs tabs={TAB_DEFINITIONS} active={tab} counts={counts} onChange={setTab} />
          {tickets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={courseItems}
                value={courseFilter === "" ? null : courseFilter}
                onValueChange={(value) => setCourseFilter(value == null ? "" : String(value))}
              >
                <SelectTrigger aria-label="Filtrovat podle kurzu" className="max-w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courseItems.map((item) => (
                    <SelectItem key={item.value ?? "all"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={typeItems}
                value={typeFilter === "" ? null : typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value == null ? "" : (value as TicketCategory))
                }
              >
                <SelectTrigger aria-label="Filtrovat podle typu dotazu">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((item) => (
                    <SelectItem key={item.value ?? "all"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Seznam */}
        {loading ? (
          <TicketCardsSkeleton count={6} layout="grid" />
        ) : visibleTickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {hasActiveFilter
                  ? "Zvoleným filtrům neodpovídají žádné tikety."
                  : tab === "open"
                    ? "Nemáte žádné nevyřešené tikety."
                    : "Nemáte žádné vyřešené tikety."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTickets.map((ticket) => (
              <TicketCard
                key={ticket.ticketId}
                ticket={ticket}
                detailHref={`${ROUTES.MY_TICKETS}/${ticket.ticketId}`}
                onDelete={setTicketToDelete}
              />
            ))}
          </div>
        )}
      </div>

      <TicketCreateModal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateDraft(null);
        }}
        initialTitle={createDraft?.title}
        initialReason={createDraft?.reason}
        onCreated={() => loadTickets(false)}
      />

      <TicketDeleteModal
        ticket={ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onDeleted={(deleted) =>
          setTickets((prev) => prev.filter((t) => t.ticketId !== deleted.ticketId))
        }
      />
    </div>
  );
}
