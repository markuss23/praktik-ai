from __future__ import annotations

import enum
from contextvars import ContextVar
from datetime import datetime

from sqlalchemy import event, inspect as sa_inspect
from sqlalchemy.orm import Session

from api.enums import AuditAction
from api.models import AuditLog

# Nastavuje se v dependencies.py po ověření usera
audit_actor: ContextVar[int | None] = ContextVar("audit_actor", default=None)

_SKIP_COLS: frozenset[str] = frozenset({"created_at", "updated_at"})


def _should_audit(obj: object) -> bool:
    return getattr(type(obj), "__audited__", False)


def _serialize(val: object) -> object:
    if isinstance(val, enum.Enum):
        return val.value
    if isinstance(val, datetime):
        return val.isoformat()
    return val


def _pk(obj: object) -> dict:
    mapper = sa_inspect(type(obj))
    return {c.key: _serialize(getattr(obj, c.key)) for c in mapper.primary_key}


def _col_diff(obj: object) -> tuple[dict, dict]:
    """Vrátí (before, after) pouze pro změněné sloupce."""
    before: dict = {}
    after: dict = {}
    insp = sa_inspect(obj)
    for attr in insp.mapper.column_attrs:
        if attr.key in _SKIP_COLS:
            continue
        hist = insp.attrs[attr.key].history
        if hist.has_changes():
            before[attr.key] = _serialize(hist.deleted[0] if hist.deleted else None)
            after[attr.key] = _serialize(hist.added[0] if hist.added else None)
    return before, after


def _insert_snapshot(obj: object) -> dict:
    return {
        attr.key: _serialize(getattr(obj, attr.key))
        for attr in sa_inspect(type(obj)).column_attrs
        if attr.key not in _SKIP_COLS
    }


def _detect_action(after: dict) -> AuditAction:
    if "is_active" in after:
        return AuditAction.soft_delete if after["is_active"] is False else AuditAction.restore
    return AuditAction.update


def register(session_factory) -> None:
    """Zaregistruje audit listenery na sessionmaker."""

    @event.listens_for(session_factory, "before_flush")
    def _before_flush(session: Session, flush_ctx, instances):
        pending: list[AuditLog] = []
        new_refs: list = []

        for obj in session.dirty:
            if not _should_audit(obj):
                continue
            before, after = _col_diff(obj)
            if not before:
                continue
            pending.append(
                AuditLog(
                    table_name=obj.__tablename__,
                    row_pk=_pk(obj),
                    action=_detect_action(after),
                    actor_id=audit_actor.get(),
                    diff={"before": before, "after": after},
                )
            )

        for obj in session.new:
            if _should_audit(obj):
                new_refs.append(obj)

        session.info["_audit_pending"] = pending
        session.info["_audit_new"] = new_refs

    @event.listens_for(session_factory, "after_flush_postexec")
    def _after_flush(session: Session, flush_ctx):
        pending: list[AuditLog] = session.info.pop("_audit_pending", [])
        new_refs: list = session.info.pop("_audit_new", [])

        # PK je teď přiřazené z DB — bezpečné zapsat
        for obj in new_refs:
            pending.append(
                AuditLog(
                    table_name=obj.__tablename__,
                    row_pk=_pk(obj),
                    action=AuditAction.insert,
                    actor_id=audit_actor.get(),
                    diff={"after": _insert_snapshot(obj)},
                )
            )

        for entry in pending:
            session.add(entry)
