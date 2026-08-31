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
    """
    Typ kategorie ticketu. Kategorie se liší podle entity_type, ke které je ticket vázán.
    """

    # Kategorie dostupné pro EntityType module
    task_session = "task_session"  # reklamace concept checku
    practice = "practice"  # reklamace practice AI evaluátoru
    # Kategorie dostupné pro EntityType course
    course_feedback = "course_feedback"  # obecná stížnost/dotaz ke kurzu jako celku
    # Kategorie dostupné pro EntityType pub_resource
    content_issue = "content_issue"  # chyba/zastaralost v obsahu veřejného materiálu
    # Univerzální kategorie dostupné pro libovolný entity_type (viz UNIVERSAL_CATEGORIES)
    bug = "bug"  # nahlášení chyby v appce
    question = "question"  # obecný dotaz na podporu
    other = "other"  # cokoliv ostatní


class TicketEntityType(enum.StrEnum):
    """
    Typ entity, ke které se ticket váže (entity_id ukazuje do její tabulky).
    """

    module = "module"
    course = "course"
    pub_resource = "pub_resource"
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
