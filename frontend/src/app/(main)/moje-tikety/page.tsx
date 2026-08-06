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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  listMyTickets,
  Ticket,
  TICKET_TYPE_LABELS,
  TicketCard,
  TicketCreateModal,
  TicketDeleteModal,
  TicketType,
} from "@/components/tickets";

type TicketsTab = "open" | "resolved";

const TAB_DEFINITIONS: { id: TicketsTab; label: string }[] = [
  { id: "open", label: "Nevyřešené" },
  { id: "resolved", label: "Vyřešené" },
];

/** Podtržené taby s počty podle mockupu — kitový `Tabs` ve variantě `line`. */
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
    <Tabs value={active} onValueChange={(value) => onChange(value as TicketsTab)}>
      <TabsList variant="line" className="border-b border-border">
        {TAB_DEFINITIONS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="font-semibold">
            {tab.label}
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium",
                tab.id === active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[tab.id]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default function MojeTiketyPage() {
  const { user, loading: authLoading, login, isAuthenticated } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TicketsTab>("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TicketType | "">("");
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

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
          (typeFilter === "" || t.ticketType === typeFilter),
      ),
    [tickets, courseFilter, typeFilter],
  );

  const counts = useMemo<Record<TicketsTab, number>>(
    () => ({
      open: filteredTickets.filter((t) => t.status === "open").length,
      resolved: filteredTickets.filter((t) => t.status === "resolved").length,
    }),
    [filteredTickets],
  );

  const visibleTickets = useMemo(
    () => filteredTickets.filter((t) => t.status === tab),
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
    ...(Object.keys(TICKET_TYPE_LABELS) as TicketType[]).map((type) => ({
      label: TICKET_TYPE_LABELS[type],
      value: type,
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
          <TicketTabs active={tab} counts={counts} onChange={setTab} />
          {tickets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={courseItems}
                value={courseFilter === "" ? null : courseFilter}
                onValueChange={(value) => setCourseFilter(value == null ? "" : String(value))}
              >
                <SelectTrigger aria-label="Filtrovat podle kurzu">
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
                  setTypeFilter(value == null ? "" : (value as TicketType))
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
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Načítání tiketů…</p>
            </CardContent>
          </Card>
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
        onClose={() => setCreateOpen(false)}
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
