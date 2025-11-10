# app/models.py
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


# ---------- Mixiny ----------


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class SoftDeleteMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ---------- Enums ----------


class ActivityKind(str, enum.Enum):
    learn: str = "learn"
    practice: str = "practice"
    assessment: str = "assessment"


class SubmissionStatus(str, enum.Enum):
    draft: str = "draft"
    submitted: str = "submitted"
    evaluated: str = "evaluated"
    returned: str = "returned"


# ---------- Course / Module ----------


class Course(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "course"
    __table_args__ = (
        Index(
            "ix_course_title_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ),
    )

    course_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    modules: Mapped[list["Module"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="Module.order"
    )


class Module(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "module"
    __table_args__ = (
        UniqueConstraint("course_id", "order", name="uq_module_course_order"),
        Index("ix_module_title", "title"),
    )

    module_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    course: Mapped[Course] = relationship(back_populates="modules")
    activities: Mapped[list["Activity"]] = relationship(
        back_populates="module", cascade="all, delete-orphan", order_by="Activity.order"
    )


# ---------- Activity & Rubric ----------


class Activity(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "activity"
    __table_args__ = (
        UniqueConstraint("module_id", "order", name="uq_activity_module_order"),
        Index("ix_activity_kind", "kind"),
    )

    activity_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[ActivityKind] = mapped_column(
        Enum(ActivityKind, name="activity_kind"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # volný JSON obsah – zadání, materiály, ukázky, instrukce apod.
    content: Mapped[dict | None] = mapped_column(JSONB)

    module: Mapped[Module] = relationship(back_populates="activities")
    # rubric_items: Mapped[list["RubricItem"]] = relationship(
    #     back_populates="activity",
    #     cascade="all, delete-orphan",
    #     order_by="RubricItem.order",
    # )
    # submissions: Mapped[list["Submission"]] = relationship(
    #     back_populates="activity", cascade="all, delete-orphan"
    # )


# class RubricItem(TimestampMixin, Base):
#     __tablename__ = "rubric_item"
#     __table_args__ = (
#         CheckConstraint(
#             "weight >= 0 AND weight <= 1", name="ck_rubric_item_weight_0_1"
#         ),
#         UniqueConstraint("activity_id", "order", name="uq_rubric_item_activity_order"),
#     )

#     rubric_item_id: Mapped[int] = mapped_column(
#         BigInteger, Identity(start=1), primary_key=True
#     )
#     activity_id: Mapped[int] = mapped_column(
#         ForeignKey("activity.activity_id", ondelete="CASCADE"), nullable=False
#     )

#     order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
#     criterion: Mapped[str] = mapped_column(String(300), nullable=False)
#     description: Mapped[str | None] = mapped_column(Text)
#     weight: Mapped[float] = mapped_column(
#         Numeric(4, 3), nullable=False, default=1.0
#     )  # 0.000–1.000
#     scale_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
#     scale_max: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

#     activity: Mapped[Activity] = relationship(back_populates="rubric_items")


# # ---------- Submission & Evaluation ----------


# class Submission(TimestampMixin, SoftDeleteMixin, Base):
#     __tablename__ = "submission"
#     __table_args__ = (
#         Index("ix_submission_status", "status"),
#         UniqueConstraint(
#             "activity_id", "attempt_no", name="uq_submission_unique_attempt"
#         ),
#     )

#     submission_id: Mapped[int] = mapped_column(
#         BigInteger, Identity(start=1), primary_key=True
#     )
#     activity_id: Mapped[int] = mapped_column(
#         ForeignKey("activity.activity_id", ondelete="CASCADE"), nullable=False
#     )

#     attempt_no: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
#     status: Mapped[SubmissionStatus] = mapped_column(
#         Enum(SubmissionStatus, name="submission_status"),
#         nullable=False,
#         default=SubmissionStatus.submitted,
#     )
#     submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
#     payload: Mapped[dict | None] = mapped_column(
#         JSONB
#     )  # odpovědi, odkazy na soubory, metadata
#     score_total: Mapped[float | None] = mapped_column(Numeric(6, 2))

#     activity: Mapped[Activity] = relationship(back_populates="submissions")
#     evaluations: Mapped[list["Evaluation"]] = relationship(
#         back_populates="submission",
#         cascade="all, delete-orphan",
#         order_by="Evaluation.created_at",
#     )


# class Evaluation(TimestampMixin, Base):
#     __tablename__ = "evaluation"
#     __table_args__ = (Index("ix_evaluation_created_at", "created_at"),)

#     evaluation_id: Mapped[int] = mapped_column(
#         BigInteger, Identity(start=1), primary_key=True
#     )
#     submission_id: Mapped[int] = mapped_column(
#         ForeignKey("submission.submission_id", ondelete="CASCADE"), nullable=False
#     )

#     # granularita bodů dle rubriky, např. {rubric_item_id: {"points": 4, "weight": 0.2}}
#     rubric_scores: Mapped[dict | None] = mapped_column(JSONB)
#     total_score: Mapped[float | None] = mapped_column(Numeric(6, 2))
#     feedback: Mapped[str | None] = mapped_column(Text)

#     submission: Mapped[Submission] = relationship(back_populates="evaluations")
