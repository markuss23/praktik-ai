"""Diagnostika kompetencí KRAUU ze skóre dokončených testů.

Session se mapuje na kompetence modulu, a když modul žádné nemá (nebo jde
o course_final), na kompetence kurzu. Vstup = první dokončený pretest,
výstup = poslední dokončený assessment / course_final (na konfiguraci).
Practice se do vstupu ani výstupu nepočítá, je jen v historii.
"""

from collections import defaultdict
from statistics import fmean
from typing import NamedTuple

from sqlalchemy import Row, func, select
from sqlalchemy.orm import Session

from api import models
from api.enums import AssessmentContext, AssessmentSessionStatus, AssessmentTurnRole
from api.src.competences.schemas import (
    CompetenceStatsItem,
    CompetenceStatsSource,
    MyCompetenceHistoryItem,
    MyCompetenceItem,
    MyCompetenceSource,
)

AS = models.AssessmentSession
CA = models.CourseAssessment
OUTCOME = {AssessmentContext.assessment, AssessmentContext.course_final}


class _Hit(NamedTuple):
    """Jedna dokončená session přiřazená jedné kompetenci."""

    s: Row
    krauu_id: int
    from_course: bool
    # Session je ta, která se počítá do vstupu/výstupu (první pretest, poslední test)
    counted: bool


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 1)


def _mean(values: list[float]) -> float | None:
    return fmean(values) if values else None


def _links(db: Session, model, key_col, keys: set[int]) -> dict[int, list[int]]:
    out: dict[int, list[int]] = defaultdict(list)
    if keys:
        stm = select(key_col, model.krauu_id).where(
            model.is_active.is_(True), key_col.in_(keys)
        )
        for key, krauu_id in db.execute(stm):
            out[key].append(krauu_id)
    return out


def _collect(
    db: Session, user_id: int | None, course_id: int | None
) -> tuple[dict[int, models.KrauuCompetence], list[_Hit]]:
    stm = (
        select(
            AS.session_id,
            AS.user_id,
            AS.course_assessment_id,
            AS.score,
            AS.finished_at,
            CA.context,
            CA.course_id,
            CA.module_id,
            models.Course.title.label("course_title"),
            models.Module.title.label("module_title"),
        )
        .join(CA, CA.course_assessment_id == AS.course_assessment_id)
        .join(models.Course, models.Course.course_id == CA.course_id)
        .outerjoin(models.Module, models.Module.module_id == CA.module_id)
        .where(
            AS.is_active.is_(True),
            models.Course.is_active.is_(True),
            AS.finished_at.is_not(None),
            AS.score.is_not(None),
            AS.status != AssessmentSessionStatus.abandoned,
        )
        .order_by(AS.finished_at)
    )
    if user_id is not None:
        stm = stm.where(AS.user_id == user_id)
    if course_id is not None:
        stm = stm.where(CA.course_id == course_id)
    sessions = db.execute(stm).all()

    comps = {
        c.krauu_id: c
        for c in db.scalars(
            select(models.KrauuCompetence).where(
                models.KrauuCompetence.is_active.is_(True)
            )
        )
    }
    mkc, ckc = models.ModuleKrauuCompetence, models.CourseKrauuCompetence
    module_krauu = _links(
        db, mkc, mkc.module_id, {s.module_id for s in sessions if s.module_id}
    )
    course_krauu = _links(db, ckc, ckc.course_id, {s.course_id for s in sessions})

    # Seřazeno podle finished_at: pretest drží první pokus, test přepisuje na poslední
    picked: dict[tuple[int, int], int] = {}
    for s in sessions:
        key = (s.user_id, s.course_assessment_id)
        if s.context == AssessmentContext.pretest:
            picked.setdefault(key, s.session_id)
        elif s.context in OUTCOME:
            picked[key] = s.session_id
    counted = set(picked.values())

    hits = []
    for s in sessions:
        module_ids = module_krauu.get(s.module_id)
        for krauu_id in module_ids or course_krauu.get(s.course_id, []):
            if krauu_id in comps:
                hits.append(_Hit(s, krauu_id, not module_ids, s.session_id in counted))
    return comps, hits


def _group(hits: list[_Hit]):
    """krauu -> (course_id, module_id) -> user -> {"pre": [...], "out": [...]}
    a meta (krauu, zdroj) -> _Hit pro názvy a krauu_from_course."""
    tree = defaultdict(
        lambda: defaultdict(lambda: defaultdict(lambda: {"pre": [], "out": []}))
    )
    meta: dict[tuple[int, tuple[int, int | None]], _Hit] = {}
    for h in hits:
        src = (h.s.course_id, h.s.module_id)
        meta[h.krauu_id, src] = h
        bucket = tree[h.krauu_id][src][h.s.user_id]
        if h.counted:
            kind = "pre" if h.s.context == AssessmentContext.pretest else "out"
            bucket[kind].append(h.s.score)
    return tree, meta


def _user_scores(sources: dict) -> dict[int, dict[str, float | None]]:
    """Na uživatele: průměr přes zdroje (každý zdroj nejdřív zprůměrovaný zvlášť)."""
    per_user: dict[int, dict[str, list[float]]] = defaultdict(
        lambda: {"pre": [], "out": []}
    )
    for users in sources.values():
        for uid, bucket in users.items():
            for kind in ("pre", "out"):
                per_user[uid][kind].extend(
                    [fmean(bucket[kind])] if bucket[kind] else []
                )
    return {
        uid: {kind: _mean(vals) for kind, vals in d.items()}
        for uid, d in per_user.items()
    }


def _turn_stats(
    db: Session, session_ids: set[int]
) -> dict[int, tuple[int, int | None, float | None]]:
    """session_id -> (počet odpovědí, správných, průměrný čas na odpověď v s).

    Socratic dialog hodnotí až na konci (is_correct je v průběhu vždy True),
    proto u něj `správných` = None.
    """
    if not session_ids:
        return {}
    at = models.AssessmentTurn
    stm = (
        select(
            at.session_id,
            CA.assessment_type_code,
            func.count(),
            func.count().filter(at.payload["is_correct"].as_boolean()),
            func.avg(at.payload["elapsed_s"].as_float()),
        )
        .join(AS, AS.session_id == at.session_id)
        .join(CA, CA.course_assessment_id == AS.course_assessment_id)
        .where(at.role == AssessmentTurnRole.student, at.session_id.in_(session_ids))
        .group_by(at.session_id, CA.assessment_type_code)
    )
    return {
        sid: (n, None if code == "socratic_dialog_ai" else ok, avg)
        for sid, code, n, ok, avg in db.execute(stm)
    }


def _base(comps: dict[int, models.KrauuCompetence], krauu_id: int) -> dict:
    c = comps[krauu_id]
    area = comps.get(c.parent_id)
    return {
        "krauu_id": c.krauu_id,
        "code": c.code,
        "name": c.name,
        "area_id": c.parent_id,
        "area_code": area.code if area else None,
        "area_name": area.name if area else None,
    }


def _source(h: _Hit) -> dict:
    return {
        "course_id": h.s.course_id,
        "course_title": h.s.course_title,
        "module_id": h.s.module_id,
        "module_title": h.s.module_title,
        "krauu_from_course": h.from_course,
    }


def _history(h: _Hit, turns: dict) -> MyCompetenceHistoryItem:
    answers, correct, avg_elapsed = turns.get(h.s.session_id, (None, None, None))
    return MyCompetenceHistoryItem(
        session_id=h.s.session_id,
        context=h.s.context,
        course_id=h.s.course_id,
        module_id=h.s.module_id,
        score=h.s.score,
        finished_at=h.s.finished_at,
        answers=answers,
        correct=correct,
        avg_elapsed_s=_round(avg_elapsed),
    )


def get_my_competence_profile(db: Session, user: models.User) -> list[MyCompetenceItem]:
    comps, hits = _collect(db, user.user_id, None)
    tree, meta = _group(hits)
    turns = _turn_stats(db, {h.s.session_id for h in hits})

    items = []
    for krauu_id in sorted(tree, key=lambda k: comps[k].code):
        me = _user_scores(tree[krauu_id]).get(user.user_id, {})
        pre, out = me.get("pre"), me.get("out")
        items.append(
            MyCompetenceItem(
                **_base(comps, krauu_id),
                pretest_score=_round(pre),
                outcome_score=_round(out),
                delta=_round(out - pre)
                if pre is not None and out is not None
                else None,
                sources=[
                    MyCompetenceSource(
                        **_source(meta[krauu_id, src]),
                        pretest_score=_round(_mean(bucket["pre"])),
                        outcome_score=_round(_mean(bucket["out"])),
                    )
                    for src, users in tree[krauu_id].items()
                    for bucket in users.values()
                ],
                history=[_history(h, turns) for h in hits if h.krauu_id == krauu_id],
            )
        )
    return items


def get_competence_stats(
    db: Session, course_id: int | None = None
) -> list[CompetenceStatsItem]:
    comps, hits = _collect(db, None, course_id)
    tree, meta = _group(hits)
    turns = _turn_stats(db, {h.s.session_id for h in hits})

    items = []
    for krauu_id in sorted(tree, key=lambda k: comps[k].code):
        users = _user_scores(tree[krauu_id]).values()
        pre = [u["pre"] for u in users if u["pre"] is not None]
        out = [u["out"] for u in users if u["out"] is not None]
        paired = [
            u["out"] - u["pre"]
            for u in users
            if u["pre"] is not None and u["out"] is not None
        ]
        session_ids = {h.s.session_id for h in hits if h.krauu_id == krauu_id}
        graded = [
            turns[sid]
            for sid in session_ids
            if turns.get(sid, (0, None))[1] is not None
        ]
        answers = sum(n for n, _, _ in graded)
        correct = sum(ok or 0 for _, ok, _ in graded)

        sources = []
        for src, by_user in tree[krauu_id].items():
            src_pre = [fmean(b["pre"]) for b in by_user.values() if b["pre"]]
            src_out = [fmean(b["out"]) for b in by_user.values() if b["out"]]
            sources.append(
                CompetenceStatsSource(
                    **_source(meta[krauu_id, src]),
                    pretest_users=len(src_pre),
                    pretest_avg=_round(_mean(src_pre)),
                    outcome_users=len(src_out),
                    outcome_avg=_round(_mean(src_out)),
                )
            )

        items.append(
            CompetenceStatsItem(
                **_base(comps, krauu_id),
                users=len(users),
                pretest_users=len(pre),
                pretest_avg=_round(_mean(pre)),
                outcome_users=len(out),
                outcome_avg=_round(_mean(out)),
                paired_users=len(paired),
                paired_delta=_round(_mean(paired)),
                answer_accuracy=round(correct / answers, 3) if answers else None,
                sources=sources,
            )
        )
    return items
