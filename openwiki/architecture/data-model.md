---
type: architecture
title: Data Model & Persistence
description: Reference for the SQLAlchemy ORM schema backing courses, modules, learning activities, enrollments, users, and catalog tables, including the soft-delete cascade and audit-log mechanisms shared across the schema.
tags: [data-model, sqlalchemy, postgresql, orm, persistence, audit-log, soft-delete]
verified:
  - by: openwiki/0.6.1
    at: 2026-09-30T09:28:35.455Z
sources:
  - id: openwiki-source-b080334d87f0e07d3f4773f1
    resource: repo://backend/api/authorization.py
  - id: openwiki-source-4921b4d820a9e1d59e9934eb
    resource: repo://backend/api/database.py
  - id: openwiki-source-07b76eb6cb824e8c4d7f1e69
    resource: repo://backend/api/dependencies.py
  - id: openwiki-source-c93e29fa2ae28c1658ea2c03
    resource: repo://backend/api/enums.py
  - id: openwiki-source-2abfe090d711490350c8283b
    resource: repo://backend/api/main.py
  - id: openwiki-source-de6e84718ed0cd1791eb7f81
    resource: repo://backend/api/models.py
  - id: openwiki-source-545539fbe1e4ebe780f3df28
    resource: repo://backend/api/seed.py
generated: { by: "openwiki/0.6.1", at: "2026-09-30T09:28:35.455Z" }
---

## Overview

The backend persists everything through a single SQLAlchemy `DeclarativeBase` (`Base` in [`backend/api/models.py`](../../backend/api/models.py)), backed by PostgreSQL. `backend/api/database.py` owns the engine, the request-scoped `Session` factory, and one-time schema/extension bootstrap; `backend/api/enums.py` defines every `StrEnum` used as a column type; `backend/api/models.py` defines all ~50 mapped classes; `backend/api/seed.py` populates the read-mostly catalog ("číselník") tables and default `SystemSetting` rows on startup.

Two mixins recur across nearly every table and shape how the whole schema behaves:

- **`TimestampMixin`** adds `created_at`/`updated_at` columns with `server_default=func.now()` (and `onupdate=func.now()` for `updated_at`), so timestamps are stamped by the database itself rather than application code.
- **`SoftDeleteMixin`** adds an `is_active: bool` column (default `True`) plus a `soft_delete()` method and cascade mechanism, described below.

Model docstrings and inline comments throughout `models.py` are written in **Czech** (the product's primary language); enum *names* and *values* (e.g. `Status`, `AttemptStatus`, `TicketStatus`, `PubResourceStatus`, `ReviewVerdict`) stay in English and define the state machines referenced by the workflow-oriented pages in this wiki (course/module lifecycle, task attempts, tickets, public resource review).

## Persistence bootstrap (`database.py`)

- `engine` is a single module-level `Engine` created from `settings.postgres.get_connection_string()`.
- `SessionLocal` is a `sessionmaker` with `autocommit=False, autoflush=False`.
- `get_sql()` is the FastAPI dependency (`SessionSqlSessionDependency`) that yields one `Session` per request and always closes it in a `finally` block — routers depend on this instead of managing sessions themselves.
- `init_db()` creates the `pg_trgm` extension (used for trigram search indexes such as `ix_course_title_trgm`) and calls `Base.metadata.create_all()`. It is invoked once at application start in `backend/api/main.py`, immediately followed by `seed_db()`, so every boot both ensures the schema exists and repopulates catalog rows.

## Soft delete instead of row deletion

`SoftDeleteMixin` (`backend/api/models.py`) intentionally never issues a SQL `DELETE`. Calling `instance.soft_delete()` just sets `is_active = False` on that row and then walks `_soft_delete_cascade`, a per-model list of relationship attribute names, deactivating every related object the same way:

```python
def soft_delete(self):
    """Kaskádová deaktivace"""
    self.is_active = False
    for relation_name in self._soft_delete_cascade:
        related_obj = getattr(self, relation_name, None)
        ...
        if isinstance(related_obj, list):
            for item in related_obj:
                if hasattr(item, "soft_delete") and item.is_active:
                    item.soft_delete()
        elif hasattr(related_obj, "soft_delete") and related_obj.is_active:
            related_obj.soft_delete()
```

Records are deactivated rather than deleted for two reasons visible in the schema: (1) most FKs (e.g. `Course.owner_id`, `Module.course_id`, `ModuleTicket.user_id/module_id/course_id`) have no `ON DELETE CASCADE`, so a hard delete of a `Course` would either violate referential integrity or require destroying grading history, enrollments, and audit trails; (2) downstream records such as `Enrollment`, `TaskAttempt`, `ModuleTicket`, and `AuditLog` are historical/legal records that must remain queryable even after their parent is retired. `soft_delete()` therefore performs a cascading deactivation walk instead:

- `Course._soft_delete_cascade` deactivates `modules`, `files`, `links`, `krauu_competences`, `bloom_levels`, `cross_subjects`.
- `Module._soft_delete_cascade` deactivates `learn_blocks`, `practice_questions`, `neuro_principles`, `krauu_competences`, `bloom_levels`.
- `PracticeQuestion._soft_delete_cascade` deactivates `closed_options`, `open_keywords`.
- `PubResource._soft_delete_cascade` deactivates `files`, `ratings`, `reviews`, `comments`.
- `PubCollection._soft_delete_cascade` deactivates `items`.

Every "active" relationship elsewhere in the schema (e.g. `Course.modules`, `Module.learn_blocks`, `PubResource.files`) is declared with an explicit `primaryjoin` that adds `...is_active==True`, so soft-deleted children simply stop appearing through normal ORM navigation without needing extra query filters. Several unique indexes are also scoped with `postgresql_where=text("is_active")`, so a code/title/slug can be reused once the earlier active row is deactivated (e.g. `uq_course_title_active`, `uq_module_course_title_active`, `uq_system_setting_key`). `ModuleTaskSession` is the one FK that *does* use `cascade="all, delete-orphan"` on `Module.task_sessions`, but that only governs ORM-side session cleanup, not row-level SQL deletes triggered by `soft_delete()`.

## Audit log

`AuditLog` (`backend/api/models.py`) is one system-wide table, not per-entity tables:

```python
class AuditLog(Base):
    """
    Jedna audit tabulka pro celý systém.
    Plní se v aplikaci (SQLAlchemy before_flush) => máš actor_id.
    """
    __tablename__ = "audit_log"
    ...
    table_name: Mapped[str]
    row_pk: Mapped[dict]        # JSONB — polymorphic primary key of the changed row
    action: Mapped[AuditAction] # insert | update | soft_delete | restore
    changed_at: Mapped[datetime]
    actor_id: Mapped[str | None]
    diff: Mapped[dict]          # JSONB
```

By design (per the model's own docstring) the table is populated from a SQLAlchemy `before_flush` session listener rather than database triggers, specifically so the write can carry `actor_id`: a trigger running inside PostgreSQL has no notion of "which HTTP user is making this request," but an in-application `before_flush` hook runs inside the same request/session and can read the identity resolved by `Auth.get_current_user` (`backend/api/dependencies.py`) — the `User` row attached to the request via `CurrentUser = Annotated[User, Depends(auth.get_current_user)]`. `table_name` + `row_pk` (JSONB, GIN-indexed via `ix_audit_log_row_pk_gin`) let one table describe changes to any other table polymorphically, `action` records which `AuditAction` state transition occurred (`insert`, `update`, `soft_delete`, `restore`), and `diff` stores the changed fields. Composite indexes `ix_audit_log_table_changed_at` and `ix_audit_log_actor_changed_at` support the two common queries: "history of this row" and "everything this actor did."

## Enums as state machines

`backend/api/enums.py` defines all column-backing enums as `enum.StrEnum`, so values serialize as plain strings both in Postgres `ENUM` types and in API payloads. The ones that matter most for cross-cutting workflows:

- **`Status`** (`draft → generated → edited → in_review → approved → archived`, plus `failed`) — the `Course.status` lifecycle used across course-authoring and review pages.
- **`AttemptStatus`** (`pending → evaluated`, or `error`) — `TaskAttempt.status`; an `error` explicitly does *not* consume one of a student's limited attempts, since it reflects an AI API failure rather than a graded response.
- **`ModuleTaskSessionStatus`** (`in_progress`, `passed`, `failed`) — `ModuleTaskSession.status`; a partial-unique index (`uq_module_task_session_user_active`) allows only one `in_progress`/`passed` session per `(user_id, module_id)`, so a `failed` session can be superseded by a fresh attempt.
- **`TicketStatus`** (`open`, `resolved`) and **`TicketType`** (`task_session`, `practice`, `other`) — `ModuleTicket`, the student-facing dispute/appeal workflow against AI grading.
- **`PubResourceStatus`** (`draft → pending_review → approved`, or `rejected`) and **`ReviewVerdict`** (`approved`, `rejected`, `needs_revision`) — the public resource library's submission/review workflow (`PubResource.status` vs. the per-review `PubResourceReview.verdict`).
- **`UserRole`** (`user < lector < guarantor < superadmin`) drives both `User.role` and the ownership/elevated-role checks in `backend/api/authorization.py`.
- **`AuditAction`** (`insert`, `update`, `soft_delete`, `restore`) — see Audit log above.

See [Auth & RBAC](auth-and-rbac.md) for how `UserRole` and `get_owner_id()`-based ownership checks gate access, and [Learning Model](../concepts/learning-model.md) for how `Status`, `AttemptStatus`, and `ModuleTaskSessionStatus` drive the course/module/task lifecycle.

## Ownership pattern

Most mutable, non-catalog models expose a `get_owner_id() -> int` method (e.g. `Course.get_owner_id`, `Module.get_owner_id` delegating to `self.course.owner_id`, `PubResource.get_owner_id` returning `author_id`). `backend/api/authorization.py` uses this `OwnedResource` protocol uniformly in `validate_ownership`/`validate_owner_or_superadmin` to authorize writes without each router re-deriving the owning user by hand.

## Core schema

```mermaid
erDiagram
    User ||--o{ Course : owns
    User ||--o{ Enrollment : enrolls
    User ||--o{ ModuleTaskSession : attempts
    Course ||--o{ Module : contains
    Course }o--|| CourseTarget : targets
    Module ||--o{ LearnBlock : "has content"
    Module ||--o{ PracticeQuestion : "has practice"
    Module ||--o{ ModuleTaskSession : "final test for"
    Course ||--o{ Enrollment : "enrolled via"
    ModuleTaskSession ||--o{ TaskAttempt : "graded attempts"
    Course }o--o{ KrauuCompetence : "tagged via CourseKrauuCompetence"
    Module }o--o{ KrauuCompetence : "tagged via ModuleKrauuCompetence"
    Course }o--o{ BloomLevel : "tagged via CourseBloomLevel"
    Module }o--o{ BloomLevel : "tagged via ModuleBloomLevel"
    Module }o--o{ NeuroPrinciple : "tagged via ModuleNeuroPrinciple"
    Course }o--|| CourseBlock : "categorized by"
    AuditLog ..> User : "actor_id (no FK, request-scoped)"
    AuditLog ..> Course : "table_name+row_pk (polymorphic)"
```
This diagram shows the course/module authoring core plus the four catalog tables it tags through many-to-many link tables. `AuditLog` is drawn with dashed relations because it references other rows polymorphically through `table_name`/`row_pk` JSONB, not real foreign keys, and its `actor_id` is a plain string captured from the request-scoped current user rather than an FK to `User`.

## Catalog ("číselník") tables

`CourseBlock`, `CourseTarget`, `CourseEqfLevel`, `CourseRequirement`, `CourseSubject`, `CourseType`, `NeuroPrinciple`, `KrauuCompetence`, `BloomLevel`, and `CrossSubject` are all small, mostly-static reference tables. They share a common shape: `TimestampMixin` + `SoftDeleteMixin`, a short `code`, a `name`, and a `description`, with a partial unique index on `code` scoped to `is_active` rows (e.g. `uq_neuro_principle_code_active`). `backend/api/seed.py` is the source of truth for their seed data (run at every app startup via `seed_db()`) and documents the domain meaning of each code, e.g.:

- `CourseBlock`: `blok.a` (Context), `blok.b` (Transformation), `blok.c` (Application) — the three thematic groupings of courses.
- `CourseTarget`: `a`/`s`/`m`/`h` — academic staff, teacher trainee, mentor, external guest.
- `NeuroPrinciple`: 20 rows (`NP-01`..`NP-20`), one per neuroscience-of-learning principle; a module can cite several via `ModuleNeuroPrinciple` (M2M).
- `KrauuCompetence`: the MŠMT 2023 KRAUU competence framework, modeled as a self-referencing tree (`parent_id`) — area rows (`x.0`) have no parent, competence rows (`x.y`) point to their area; only competence rows (not areas) are attached to `Course`/`Module` via the `*KrauuCompetence` link tables.
- `BloomLevel`: the 6 levels of Bloom's taxonomy, used to tag the cognitive level of course/module goals via `CourseBloomLevel`/`ModuleBloomLevel`.
- `CrossSubject`: cross-cutting subject codes (`O001`-`O020`) that only apply to Block A/B courses.

All of the M2M link tables (`CourseKrauuCompetence`, `ModuleKrauuCompetence`, `CourseBloomLevel`, `ModuleBloomLevel`, `ModuleNeuroPrinciple`, `CourseCrossSubject`) follow the same shape: a surrogate `id`, the two FKs, a unique composite index preventing duplicate links, `added_at`, `SoftDeleteMixin` (so a tag can be removed without deleting history), and a `get_owner_id()` delegating up to the owning course/module.

## Course, Module, and learning activities

- **`Course`** is the top-level authored unit: owned by a `User` (`owner_id`), optionally approved by a different `User` (`approved_by_id`; a `CheckConstraint` forbids the owner approving their own course), classified along `course_block`/`course_target`/`course_subject`/`course_requirement`/`course_eqf_level`/`course_type`, and driven by `Status` + `is_published`. `modules_count_ai_generated` and `min_modules_to_open_final_exam` are authoring/gating knobs consumed by the course generation and exam-unlock flow documented in [Learning Model](../concepts/learning-model.md).
- **`Module`** belongs to exactly one `Course` and owns `LearnBlock` content, `PracticeQuestion`s, and tag links (`neuro_principles`, `krauu_competences`, `bloom_levels`). `max_task_attempts` and `passing_score` configure the final AI task for the module.
- **`LearnBlock`** is the actual learning content/activity unit inside a module (one active block per module per the `uq_learnblock_module_active` partial index in the current schema) and is the anchor for `MentorInteractionLog` (AI mentor Q&A tied to that block).
- **`PracticeQuestion`** (+ `PracticeOption` for closed questions, `QuestionKeyword` for open questions) are module-level practice content; a `CheckConstraint` enforces that closed questions have `correct_answer` set and no `example_answer`, and vice versa for open questions. `UserPracticeQuestion`/`UserPracticeAttempt` hold the personalized, per-user regenerated variants and repeated attempts.
- **`Enrollment`** links a `User` to a `Course` (unique active pair via `uq_enrollment_user_course_active`), tracking `completed_at`, `left_at`, and last-visited module/activity for resuming progress.
- **`ModuleTaskSession`** is the record of a module's final AI-graded task for a given user; **`TaskAttempt`** rows are the individual graded attempts within that session, carrying `AttemptStatus`, `ai_feedback`, `ai_score`, and `is_passed`.
- **`ModuleTicket`** is the student dispute/appeal workflow against an AI grading decision (`ticket_type` distinguishes final-task vs. practice disputes), authorization-checked and resolved manually by the course author.

## Public resource library tables

`PubResource` and its satellites (`PubResourceFile`, `PubResourceRating`, `PubResourceReview`, `PubResourceComment`, `PubResourceFork`, `PubCollection`, `PubCollectionResource`) form a separate, loosely-coupled subsystem for community-shared materials, following the same `TimestampMixin`/`SoftDeleteMixin`/`get_owner_id()` conventions as the course schema and reusing the `CourseSubject`, `CourseTarget`, `CourseEqfLevel`, and `CourseType` catalogs for classification. `PubResource.status` (`PubResourceStatus`) and `PubResourceReview.verdict` (`ReviewVerdict`) are the two enums that drive its submit → review → publish workflow; see [Public Resource Library](../concepts/public-resource-library.md) for the full workflow.

## Practical implications for extending the schema

- New mutable models should inherit `TimestampMixin, SoftDeleteMixin, Base` unless there is a specific reason not to (pure link/join tables sometimes only need `SoftDeleteMixin`, e.g. `PubResourceFork`, `PubResourceReview`).
- If a new model owns children that must disappear when it is soft-deleted, add the relevant relationship name(s) to that model's `_soft_delete_cascade` list — the base `soft_delete()` walk is generic and requires no other wiring, but forgetting to list a new child relationship silently leaves orphaned "active" rows visible after the parent is deactivated.
- Any "active" collection relationship should filter `...is_active==True` in its `primaryjoin` (as all existing `back_populates` collections do) so soft-deleted rows do not leak back into normal navigation.
- Any code/title uniqueness constraint on a soft-deletable model should be a partial unique index scoped to `is_active`, not a plain unique constraint, or the code/title cannot be reused after deactivation.
- New enums should be `enum.StrEnum` subclasses in `backend/api/enums.py`, mapped via `Enum(MyEnum, name="...")`, matching the existing convention so values serialize as strings and the Postgres `ENUM` type name is explicit and stable.
