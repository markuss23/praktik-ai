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
