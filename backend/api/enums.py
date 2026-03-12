import enum


class QuestionType(enum.StrEnum):
    closed = "closed"
    open = "open"


class Status(enum.StrEnum):
    draft: str = "draft"
    generated: str = "generated"
    edited: str = "edited"
    in_review: str = "in_review"
    approved: str = "approved"
    archived: str = "archived"
    failed: str = "failed"


class AuditAction(enum.StrEnum):
    insert = "insert"
    update = "update"
    soft_delete = "soft_delete"
    restore = "restore"


class UserRole(enum.StrEnum):
    user = "user"
    lector = "lector"
    guarantor = "guarantor"
    superadmin = "superadmin"


class ModuleTaskSessionStatus(enum.StrEnum):
    in_progress = "in_progress"
    passed = "passed"
    failed = "failed"


class AttemptStatus(enum.StrEnum):
    pending = "pending"  # Uživatel odeslal, čeká se na odpověď od AI API
    evaluated = "evaluated"  # AI úspěšně vyhodnotilo
    error = "error"  # API spadlo (nepočítá se jako vyčerpaný pokus!)


class TicketStatus(enum.StrEnum):
    open = "open"
    resolved = "resolved"


class TicketType(enum.StrEnum):
    task_session = "task_session"  # reklamace concept checku
    practice = "practice"  # reklamace practice AI evaluátoru
    other = "other"  # ostatní
