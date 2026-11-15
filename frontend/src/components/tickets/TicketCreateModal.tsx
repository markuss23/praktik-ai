"use client";

import { useEffect, useState } from "react";
import { getModules, getMyEnrollments, MyEnrollmentExtended } from "@/lib/api-client";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { createTicket, getTicketCategories, listMyTickets } from "./api";
import { appendDiagnostics, collectDiagnostics } from "./diagnostics";
import {
  isTicketUnresolved,
  Ticket,
  TICKET_CATEGORY_LABELS,
  TICKET_ENTITY_LABELS,
  type TicketCategory,
  type TicketEntityType,
} from "./types";

// Pevný cíl tiketu (např. materiál z Veřejné databáze), výběr "Čeho se dotaz týká" se skryje.
export interface TicketTarget {
  entityType: TicketEntityType;
  entityId: number;
  label: string;
}

type SelectableEntity = "module" | "course" | "general";

interface TicketCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Zavolá se po úspěšném vytvoření tiketu. */
  onCreated?: (ticket: Ticket) => void;
  /** Předvyplněný název — např. dotaz z AI chatu při eskalaci. */
  initialTitle?: string;
  /** Předvyplněný popis — např. dotaz z AI chatu při eskalaci. */
  initialReason?: string;
  target?: TicketTarget;
  // Výchozí volba "Čeho se dotaz týká" (bez zapsaných kurzů vždy obecný dotaz).
  defaultEntityType?: SelectableEntity;
  title?: string;
  description?: string;
}

interface ModuleOption {
  moduleId: number;
  title: string;
}

const FORM_ID = "ticket-create-form";
const ENTITY_CHOICES: SelectableEntity[] = ["module", "course", "general"];
const DEFAULT_CATEGORY: Record<TicketEntityType, TicketCategory> = {
  module: "other",
  course: "course_feedback",
  pub_resource: "content_issue",
  general: "question",
};
// Backend řadí kategorie podle klíče; v UI chceme specifické nahoře a "Jiné" na konci.
const CATEGORY_ORDER = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];

// Backend pustí k jedné entitě a kategorii jen jeden nevyřešený tiket (409).
function blockKey(entityType: TicketEntityType, entityId: number, category: TicketCategory): string {
  return `${entityType}:${entityId}:${category}`;
}

// Modal "Nový dotaz": tiket k modulu, kurzu, materiálu nebo obecný.
export function TicketCreateModal({
  isOpen,
  onClose,
  onCreated,
  initialTitle = "",
  initialReason = "",
  target,
  defaultEntityType = "module",
  title: modalTitle = "Nový dotaz",
  description,
}: TicketCreateModalProps) {
  // Primitiva místo objektu `target`, ať efekty nezávisí na jeho identitě.
  const targetType = target?.entityType;
  const targetId = target?.entityId;
  const initialEntityType: TicketEntityType = targetType ?? defaultEntityType;
  const [enrollments, setEnrollments] = useState<MyEnrollmentExtended[]>([]);
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  // Kategorie povolené pro jednotlivé typy entit (GET /tickets/categories).
  const [categoriesByEntity, setCategoriesByEntity] = useState<
    Partial<Record<TicketEntityType, TicketCategory[]>>
  >({});
  // Entita + kategorie, kde už má uživatel nevyřešený tiket.
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [entityType, setEntityType] = useState<TicketEntityType>(initialEntityType);
  const [courseId, setCourseId] = useState<number | "">("");
  const [moduleId, setModuleId] = useState<number | "">("");
  const [category, setCategory] = useState<TicketCategory>(DEFAULT_CATEGORY[initialEntityType]);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [diagnosticsPreview, setDiagnosticsPreview] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset + načtení kurzů, kategorií a vlastních nevyřešených tiketů při otevření.
  useEffect(() => {
    if (!isOpen) return;
    setEntityType(initialEntityType);
    setCourseId("");
    setModuleId("");
    setCategory(DEFAULT_CATEGORY[initialEntityType]);
    setTitle(initialTitle);
    setReason(initialReason);
    setAttachDiagnostics(true);
    setDiagnosticsPreview(collectDiagnostics());
    setShowDiagnostics(false);
    setError(null);
    setSubmitting(false);
    setBlocked(new Set());
    setEnrollmentsLoaded(false);

    let cancelled = false;
    if (!targetType) {
      getMyEnrollments()
        .then((data) => {
          if (cancelled) return;
          setEnrollments(data);
          setEnrollmentsLoaded(true);
          // Bez zapsaného kurzu jde založit jen obecný dotaz.
          if (data.length === 0) {
            setEntityType("general");
            setCategory(DEFAULT_CATEGORY.general);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Nepodařilo se načíst vaše kurzy.");
        });
    }
    getTicketCategories()
      .then((byEntity) => {
        if (cancelled) return;
        const sorted = Object.fromEntries(
          Object.entries(byEntity).map(([type, list]) => [
            type,
            [...(list ?? [])].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)),
          ]),
        );
        setCategoriesByEntity(sorted);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Typy dotazů se nepodařilo načíst.");
      });
    // Blokace je jen nápověda; když se nenačte, ohlídá duplicitu backend.
    listMyTickets()
      .then((tickets) => {
        if (cancelled) return;
        setBlocked(
          new Set(
            tickets
              .filter((t) => t.entityType != null && t.entityId != null && isTicketUnresolved(t))
              .map((t) => blockKey(t.entityType as TicketEntityType, t.entityId as number, t.category)),
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialTitle, initialReason, targetType, initialEntityType]);

  // Načtení modulů vybraného kurzu.
  useEffect(() => {
    setModules([]);
    setModuleId("");
    if (courseId === "" || entityType !== "module") return;

    let cancelled = false;
    getModules({ courseId })
      .then((moduleData) => {
        if (!cancelled) {
          setModules(moduleData.map((m) => ({ moduleId: m.moduleId, title: m.title })));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Nepodařilo se načíst moduly kurzu.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, entityType]);

  const categories = categoriesByEntity[entityType] ?? [];
  const entityId: number | null = targetId !== undefined
    ? targetId
    : entityType === "module"
      ? moduleId === "" ? null : moduleId
      : entityType === "course"
        ? courseId === "" ? null : courseId
        : null;

  const isBlockedFor = (type: TicketEntityType, id: number | null, c: TicketCategory) =>
    id !== null && blocked.has(blockKey(type, id, c));
  const isBlocked = (c: TicketCategory) => isBlockedFor(entityType, entityId, c);
  const isModuleFullyBlocked = (mId: number) => {
    const moduleCategories = categoriesByEntity.module ?? [];
    return moduleCategories.length > 0 && moduleCategories.every((c) => isBlockedFor("module", mId, c));
  };

  // Vybraná kategorie musí patřit k typu entity a nesmí být blokovaná, jinak první volná.
  useEffect(() => {
    const allowed = categoriesByEntity[entityType] ?? [];
    if (allowed.length === 0) return;
    const free = (c: TicketCategory) =>
      allowed.includes(c) && (entityId === null || !blocked.has(blockKey(entityType, entityId, c)));
    if (free(category)) return;
    const next = [DEFAULT_CATEGORY[entityType], ...allowed].find(free);
    if (next) setCategory(next);
  }, [categoriesByEntity, category, entityType, entityId, blocked]);

  const handleEntityTypeChange = (value: SelectableEntity) => {
    setEntityType(value);
    setCategory(DEFAULT_CATEGORY[value]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedReason = reason.trim();
    if (entityType === "module" && entityId === null) {
      setError("Vyberte kurz a modul, kterého se dotaz týká.");
      return;
    }
    if (entityType === "course" && entityId === null) {
      setError("Vyberte kurz, kterého se dotaz týká.");
      return;
    }
    if (!categories.includes(category) || isBlocked(category)) {
      setError("Vyberte typ dotazu.");
      return;
    }
    if (trimmedTitle.length < 1) {
      setError("Zadejte název dotazu.");
      return;
    }
    if (trimmedReason.length < 1) {
      setError("Popište svůj dotaz.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createTicket({
        entityType,
        entityId,
        category,
        title: trimmedTitle,
        // Údaje o prohlížeči se berou až při odeslání (okno mohlo změnit velikost).
        message: attachDiagnostics
          ? appendDiagnostics(trimmedReason, collectDiagnostics())
          : trimmedReason,
      });
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dotaz se nepodařilo odeslat.");
    } finally {
      setSubmitting(false);
    }
  };

  // Base UI Select potřebuje `items` (placeholder = položka s `value: null`).
  const noEnrollments = enrollmentsLoaded && enrollments.length === 0;
  const entityLabel = (type: SelectableEntity) =>
    type !== "general" && noEnrollments
      ? `${TICKET_ENTITY_LABELS[type]} (nejste zapsáni v kurzu)`
      : TICKET_ENTITY_LABELS[type];
  const entityItems = ENTITY_CHOICES.map((type) => ({ label: entityLabel(type), value: type }));
  const courseItems = [
    { label: "Vyberte kurz…", value: null },
    ...enrollments.map((e) => ({ label: e.course.title, value: e.courseId })),
  ];
  const moduleLabel = (m: ModuleOption) =>
    isModuleFullyBlocked(m.moduleId) ? `${m.title} — máte nevyřešené tikety` : m.title;
  const moduleItems = [
    { label: courseId === "" ? "Nejprve vyberte kurz" : "Vyberte modul…", value: null },
    ...modules.map((m) => ({ label: moduleLabel(m), value: m.moduleId })),
  ];
  const allModulesBlocked =
    modules.length > 0 && modules.every((m) => isModuleFullyBlocked(m.moduleId));
  const categoryLabel = (c: TicketCategory) =>
    isBlocked(c) ? `${TICKET_CATEGORY_LABELS[c]} — máte nevyřešený tiket` : TICKET_CATEGORY_LABELS[c];
  const categoryItems = categories.map((c) => ({ label: categoryLabel(c), value: c }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={modalTitle}
      description={
        description ??
        "Popište, s čím potřebujete pomoci. Dotaz může patřit k modulu, celému kurzu, nebo být obecný."
      }
      maxWidth="max-w-md"
      footer={
        <>
          <Button type="button" variant="outline" size="lg" disabled={submitting} onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" form={FORM_ID} size="lg" disabled={submitting}>
            {submitting ? "Odesílám…" : "Odeslat dotaz"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {target ? (
          <div className="flex flex-col gap-1.5">
            <Label>Týká se</Label>
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
              {TICKET_ENTITY_LABELS[target.entityType]}: {target.label}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-entity">Čeho se dotaz týká</Label>
            <Select
              items={entityItems}
              value={entityType}
              onValueChange={(value) => handleEntityTypeChange(value as SelectableEntity)}
              disabled={submitting}
            >
              <SelectTrigger id="ticket-entity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entityItems.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                    disabled={item.value !== "general" && noEnrollments}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!target && (entityType === "module" || entityType === "course") && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-course">Kurz</Label>
            <Select
              items={courseItems}
              value={courseId === "" ? null : courseId}
              onValueChange={(value) => setCourseId(value == null ? "" : Number(value))}
              disabled={submitting}
            >
              <SelectTrigger id="ticket-course" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enrollments.map((e) => (
                  <SelectItem key={e.courseId} value={e.courseId}>
                    {e.course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!target && entityType === "module" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-module">Modul</Label>
            <Select
              items={moduleItems}
              value={moduleId === "" ? null : moduleId}
              onValueChange={(value) => setModuleId(value == null ? "" : Number(value))}
              disabled={submitting || courseId === ""}
            >
              <SelectTrigger id="ticket-module" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem
                    key={m.moduleId}
                    value={m.moduleId}
                    disabled={isModuleFullyBlocked(m.moduleId)}
                  >
                    {moduleLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allModulesBlocked && (
              <p className="text-xs text-muted-foreground">
                Ke všem modulům tohoto kurzu už máte nevyřešené tikety všech typů. Další založíte,
                až je lektor vyřeší.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-type">Typ dotazu</Label>
          <Select
            items={categoryItems}
            value={categories.includes(category) ? category : null}
            onValueChange={(value) => setCategory(value as TicketCategory)}
            disabled={submitting || categories.length === 0}
          >
            <SelectTrigger id="ticket-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryItems.map((item) => (
                <SelectItem key={item.value} value={item.value} disabled={isBlocked(item.value)}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-title">Název</Label>
          <Input
            id="ticket-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Shrnutí dotazu"
            maxLength={255}
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-reason">Popis</Label>
          <Textarea
            id="ticket-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Popište, s čím potřebujete pomoci…"
            rows={4}
            disabled={submitting}
            className="resize-y"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground select-none">
            <Checkbox
              checked={attachDiagnostics}
              onCheckedChange={(checked) => setAttachDiagnostics(checked === true)}
              disabled={submitting}
            />
            Přiložit technické informace
          </label>
          <p className="text-xs text-muted-foreground">
            Prohlížeč, systém, rozlišení obrazovky a stránka — pomůže to s řešením chyb.{" "}
            <Button
              type="button"
              variant="link"
              size="xs"
              className="h-auto p-0 text-xs"
              onClick={() => setShowDiagnostics((v) => !v)}
              aria-expanded={showDiagnostics}
            >
              {showDiagnostics ? "Skrýt" : "Co se odešle?"}
            </Button>
          </p>
          {showDiagnostics && (
            <ul className="rounded-md bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {diagnosticsPreview.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
