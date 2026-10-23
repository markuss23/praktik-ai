from __future__ import annotations

import mimetypes
import unicodedata
from urllib.parse import quote

from fastapi import HTTPException
from fastapi.responses import Response
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session
from api import models


def attachment_response(content: bytes, filename: str) -> Response:
    """Vrátí obsah souboru jako přílohu ke stažení.

    Název souboru posíláme dvakrát: ASCII varianta v `filename=` (fallback pro
    staré klienty) a původní název v `filename*=UTF-8''…` podle RFC 5987.
    Hlavičky se kódují do latin-1, takže surová diakritika by skončila 500.
    """
    ascii_name = (
        unicodedata.normalize("NFKD", filename)
        .encode("ascii", "ignore")
        .decode()
        .replace('"', "")
        .strip()
    ) or "soubor"

    return Response(
        content=content,
        media_type=mimetypes.guess_type(filename)[0] or "application/octet-stream",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_name}"; '
                f"filename*=UTF-8''{quote(filename)}"
            ),
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


def get_or_404[T](
    db: Session,
    model: type[T],
    pk_value: int,
    *,
    detail: str | None = None,
    check_active: bool = True,
) -> T:
    """Načte záznam podle primárního klíče, nebo vyhodí 404.

    Args:
        db: SQLAlchemy session
        model: ORM model class
        pk_value: hodnota primárního klíče
        detail: vlastní chybová hláška (výchozí: „{Model} nenalezen/a")
        check_active: přidat podmínku is_active=True (výchozí True)
    """
    pk_col = inspect(model).mapper.primary_key[0]
    stm = select(model).where(pk_col == pk_value)
    if check_active and hasattr(model, "is_active"):
        stm = stm.where(model.is_active.is_(True))
    result = db.scalars(stm).first()
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=detail or f"{model.__name__} nenalezen/a",
        )
    return result


def course_visible_to(db: Session, course: models.Course, user: models.User | None) -> bool:
    """Publikovaný kurz vidí každý. Nepublikovaný (koncept, ve schvalování,
    archivovaný…) jen lektoři a výš — tvorba, schvalování, read-only náhled —
    a studenti, kteří jsou do kurzu zapsaní (zpětný náhled dokončeného kurzu)."""
    from api.dependencies import ROLE_HIERARCHY  # lokálně kvůli cyklickému importu

    if course.is_active and course.is_published:
        return True
    if user is None:
        return False
    if ROLE_HIERARCHY.get(user.role, 0) >= ROLE_HIERARCHY["lector"]:
        return True
    enrolled = db.scalars(
        select(models.Enrollment.enrollment_id)
        .where(
            models.Enrollment.course_id == course.course_id,
            models.Enrollment.user_id == user.user_id,
        )
        .limit(1)
    ).first()
    return course.is_active and enrolled is not None


def ensure_course_visible(db: Session, course_id: int, user: models.User | None) -> None:
    """404 pro kurz, který uživatel nesmí vidět (stejná hláška jako neexistující kurz)."""
    course = get_or_404(db, models.Course, course_id, detail="Kurz nenalezen", check_active=False)
    if not course_visible_to(db, course, user):
        raise HTTPException(status_code=404, detail="Kurz nenalezen")


def assert_course_editable(course: models.Course) -> None:
    """Vyhodí 400 pokud kurz není v editovatelném stavu (draft/generated/edited)."""
    from api.enums import Status

    if course.status not in (Status.draft, Status.generated, Status.edited):
        raise HTTPException(
            status_code=400,
            detail="Editace je povolena pouze pokud je kurz ve stavu 'koncept', 'vygenerovaný' nebo 'editovaný'.",
        )


def check_enrollment(
    db: Session,
    user: models.User,
    course: models.Course,
    *,
    bypass_for_owner: bool = False,
) -> None:
    """Vyhodí 403 pokud uživatel není zapsán v kurzu.

    Args:
        bypass_for_owner: pokud True, vlastník kurzu a superadmin kontrolu přeskočí.
    """
    from api import models as m
    from api.enums import UserRole

    if bypass_for_owner:
        if user.user_id == course.owner_id or user.role == UserRole.superadmin:
            return

    enrollment = db.scalar(
        select(m.Enrollment).where(
            m.Enrollment.user_id == user.user_id,
            m.Enrollment.course_id == course.course_id,
            m.Enrollment.is_active.is_(True),
            m.Enrollment.left_at.is_(None),
        )
    )
    if enrollment is None:
        raise HTTPException(status_code=403, detail="Nejste zapsáni v tomto kurzu")
