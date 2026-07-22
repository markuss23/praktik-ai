"use client";

import { useEffect, useState } from "react";
import { useModalDismiss } from "@/hooks/useModalDismiss";
import { getModules, getMyEnrollments, MyEnrollmentExtended } from "@/lib/api-client";
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

const SELECT_CLASS =
  "w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60";

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

  useModalDismiss(isOpen, () => {
    if (!submitting) onClose();
  });

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-lg font-semibold text-black mb-1">Nový dotaz</h3>
        <p className="text-sm text-gray-500 mb-4">
          Vytvořte dotaz na podporu k modulu, ve kterém jste narazili na problém.
        </p>

        <label className="block text-xs font-medium text-gray-600 mb-1">Kurz</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={submitting}
          className={SELECT_CLASS}
        >
          <option value="">Vyberte kurz…</option>
          {enrollments.map((e) => (
            <option key={e.courseId} value={e.courseId}>
              {e.course.title}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Modul</label>
        <select
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value === "" ? "" : Number(e.target.value))}
          disabled={submitting || courseId === ""}
          className={SELECT_CLASS}
        >
          <option value="">
            {courseId === "" ? "Nejprve vyberte kurz" : "Vyberte modul…"}
          </option>
          {modules.map((m) => (
            <option key={m.moduleId} value={m.moduleId}>
              {m.title}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Typ dotazu</label>
        <select
          value={ticketType}
          onChange={(e) => setTicketType(e.target.value as TicketType)}
          disabled={submitting}
          className={SELECT_CLASS}
        >
          {(Object.keys(TICKET_TYPE_LABELS) as TicketType[]).map((type) => (
            <option key={type} value={type}>
              {TICKET_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Název</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Shrnutí dotazu"
          maxLength={255}
          disabled={submitting}
          className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
        />

        <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">Popis</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Popište, s čím potřebujete pomoci…"
          rows={4}
          disabled={submitting}
          className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 disabled:opacity-60"
        />

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="flex justify-between items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Odesílám…" : "Odeslat dotaz"}
          </button>
        </div>
      </form>
    </div>
  );
}
