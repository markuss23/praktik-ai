import enum


class ActivityKind(enum.StrEnum):
    learn = "learn"
    practice = "practice"
    assessment = "assessment"


class QuestionType(enum.StrEnum):
    closed = "closed"
    open = "open"


class Status(enum.StrEnum):
    draft: str = "draft"
    generated: str = "generated"
    approved: str = "approved"
    published: str = "published"
    archived: str = "archived"


class AuditAction(enum.StrEnum):
    insert = "insert"
    update = "update"
    soft_delete = "soft_delete"
    restore = "restore"
