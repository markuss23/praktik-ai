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


class Difficulty(enum.StrEnum):
    """Doporučená obtížnost kurzu — zobrazuje se na kartě v katalogu."""

    complete_beginner: str = "complete_beginner"
    beginner: str = "beginner"
    slightly_advanced: str = "slightly_advanced"
    intermediate: str = "intermediate"
    advanced: str = "advanced"
    expert: str = "expert"


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
    open = "open"  # nový, nikdo si ho ještě nevzal
    in_progress = "in_progress"  # staff si ticket přiřadil (assignee_id), řeší se
    pending = (
        "pending"  # nepoužito v aktuálním flow, zachováno kvůli DB enum kompatibilitě
    )
    resolved = "resolved"
    closed = "closed"


class TicketType(enum.StrEnum):
    task_session = "task_session"  # reklamace concept checku
    practice = "practice"  # reklamace practice AI evaluátoru
    bug = "bug"  # nahlášení chyby v appce, bez vazby na konkrétní entitu
    question = "question"  # obecný dotaz na podporu, bez vazby na konkrétní entitu
    other = "other"  # ostatní


class TicketEntityType(enum.StrEnum):
    """Typ entity, ke které se ticket váže (entity_id ukazuje do její tabulky).
    'general' = obecný ticket bez vazby na entitu (bug/dotaz) — entity_id se
    pro něj nevyplňuje."""

    module = "module"
    general = "general"


class EduLevel(enum.StrEnum):
    primary = "primary"
    secondary = "secondary"
    higher = "higher"


class PubResourceStatus(enum.StrEnum):
    draft = "draft"
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"


class AttachType(enum.StrEnum):
    pdf = "pdf"
    docx = "docx"
    pptx = "pptx"
    image = "image"
    video = "video"
    other = "other"


class ReviewVerdict(enum.StrEnum):
    approved = "approved"
    rejected = "rejected"
    needs_revision = "needs_revision"
