"use client";

import { useEffect, useState } from "react";
import { getModules, getMyEnrollments, MyEnrollmentExtended } from "@/lib/api-client";
import {
  Button,
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
import { createTicket } from "./api";
import { Ticket, TICKET_TYPE_LABELS, TicketType } from "./types";

interface TicketCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Zavolá se po úspěšném vytvoření tiketu. */
  onCreated?: (ticket: Ticket) => void;
}

interface ModuleOption {
  moduleId: number;
  title: string;
}

const FORM_ID = "ticket-create-form";

/** Modal „Nový dotaz" — vytvoření tiketu k modulu zapsaného kurzu. */
export function TicketCreateModal({ isOpen, onClose, onCreated }: TicketCreateModalProps) {
  const [enrollments, setEnrollments] = useState<MyEnrollmentExtended[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [courseId, setCourseId] = useState<number | "">("");
  const [moduleId, setModuleId] = useState<number | "">("");
  const [ticketType, setTicketType] = useState<TicketType>("other");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset + načtení kurzů při otevření.
  useEffect(() => {
    if (!isOpen) return;
    setCourseId("");
    setModuleId("");
    setTicketType("other");
    setTitle("");
    setReason("");
    setError(null);
    setSubmitting(false);

    let cancelled = false;
    getMyEnrollments()
      .then((data) => {
        if (!cancelled) setEnrollments(data);
      })
      .catch(() => {
        if (!cancelled) setError("Nepodařilo se načíst vaše kurzy.");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Načtení modulů vybraného kurzu.
  useEffect(() => {
    setModules([]);
    setModuleId("");
    if (courseId === "") return;

    let cancelled = false;
    getModules({ courseId })
      .then((data) => {
        if (!cancelled) {
          setModules(data.map((m) => ({ moduleId: m.moduleId, title: m.title })));
        }
      })
      .catch(() => {
        if (!cancelled) setError("Nepodařilo se načíst moduly kurzu.");
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedReason = reason.trim();
    if (moduleId === "") {
      setError("Vyberte kurz a modul, kterého se dotaz týká.");
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
        moduleId,
        ticketType,
        title: trimmedTitle,
        reason: trimmedReason,
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
  const courseItems = [
    { label: "Vyberte kurz…", value: null },
    ...enrollments.map((e) => ({ label: e.course.title, value: e.courseId })),
  ];
  const moduleItems = [
    { label: courseId === "" ? "Nejprve vyberte kurz" : "Vyberte modul…", value: null },
    ...modules.map((m) => ({ label: m.title, value: m.moduleId })),
  ];
  const typeItems = (Object.keys(TICKET_TYPE_LABELS) as TicketType[]).map((type) => ({
    label: TICKET_TYPE_LABELS[type],
    value: type,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Nový dotaz"
      description="Vytvořte dotaz na podporu k modulu, ve kterém jste narazili na problém."
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
                <SelectItem key={m.moduleId} value={m.moduleId}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-type">Typ dotazu</Label>
          <Select
            items={typeItems}
            value={ticketType}
            onValueChange={(value) => setTicketType(value as TicketType)}
            disabled={submitting}
          >
            <SelectTrigger id="ticket-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
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

        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
