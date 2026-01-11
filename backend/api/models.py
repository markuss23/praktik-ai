# app/models.py
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase

from api.enums import AuditAction, QuestionType, Status


class Base(DeclarativeBase):
    pass


# ---------- Mixiny ----------


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class SoftDeleteMixin:
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    _soft_delete_cascade: list[str] = []

    def soft_delete(self):
        """Kaskádová deaktivace"""
        # 1. Deaktivuj sebe
        self.is_active = False

        # 2. Projdi definované relace
        for relation_name in self._soft_delete_cascade:
            # Získej objekt/seznam objektů z relace
            related_obj = getattr(self, relation_name, None)

            if not related_obj:
                continue

            # Pokud je to seznam (One-to-Many), projdeme položky
            if isinstance(related_obj, list):
                for item in related_obj:
                    # Rekurzivní volání
                    if hasattr(item, "soft_delete") and item.is_active:
                        item.soft_delete()

            # Pokud je to jeden objekt (One-to-One)
            elif hasattr(related_obj, "soft_delete") and related_obj.is_active:
                related_obj.soft_delete()


# ---------- Audit Log ----------


class AuditLog(Base):
    """
    Jedna audit tabulka pro celý systém.
    Plní se v aplikaci (SQLAlchemy before_flush) => máš actor_id.
    """

    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_log_table_changed_at", "table_name", "changed_at"),
        Index("ix_audit_log_actor_changed_at", "actor_id", "changed_at"),
        Index("ix_audit_log_row_pk_gin", "row_pk", postgresql_using="gin"),
    )

    audit_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )

    table_name: Mapped[str] = mapped_column(String(200), nullable=False)
    row_pk: Mapped[dict] = mapped_column(JSONB, nullable=False)
    action: Mapped[AuditAction] = mapped_column(
        Enum(AuditAction, name="audit_action"), nullable=False
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    actor_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # diff: { "field": {"old": ..., "new": ...}, ... }
    diff: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


# ---------- Course / Module ----------


class Course(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "course"
    __table_args__ = (
        Index(
            "uq_course_title_active",
            "title",
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )

    course_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    modules_count: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    status: Mapped[Status] = mapped_column(
        Enum(Status, name="course_status"), nullable=False, default=Status.draft
    )

    summary: Mapped[str | None] = mapped_column(Text)

    modules: Mapped[list[Module]] = relationship(
        back_populates="course",
        order_by="Module.position",
    )
    files: Mapped[list[CourseFile]] = relationship(
        back_populates="course",
    )
    references: Mapped[list[CourseLink]] = relationship(
        back_populates="course",
    )

    _soft_delete_cascade: list[str] = ["modules", "files", "references"]


class Module(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "module"
    __table_args__ = (
        # unikátní pořadí jen pro aktivní řádky (Postgres partial unique index)
        Index(
            "uq_module_course_position_active",
            "course_id",
            "position",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index(
            "uq_module_course_title_active",
            "course_id",
            "title",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_module_title", "title"),
        Index("ix_module_course_id", "course_id"),
    )

    module_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)

    position: Mapped[int] = mapped_column(Integer, nullable=False)

    course: Mapped[Course] = relationship(back_populates="modules")

    learn_blocks: Mapped[list[LearnBlock]] = relationship(
        back_populates="module",
        order_by="LearnBlock.position",
    )

    practices: Mapped[list[Practice]] = relationship(
        back_populates="module",
        order_by="Practice.position",
    )

    _soft_delete_cascade = ["learn_blocks", "practices"]


class CourseFile(TimestampMixin, SoftDeleteMixin, Base):
    """Soubory/metadata přiřazené ke kurzu (historicky držíme)."""

    __tablename__ = "course_file"
    __table_args__ = (
        Index("ix_course_file_course_id", "course_id"),
        Index(
            "ix_course_file_course_active",
            "course_id",
            postgresql_where=text("is_active"),
        ),
    )

    file_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)

    course: Mapped[Course] = relationship(back_populates="files")


class CourseLink(TimestampMixin, SoftDeleteMixin, Base):
    """Odkazy na externí zdroje spojené s kurzem (historicky držíme)."""

    __tablename__ = "course_link"
    __table_args__ = (
        Index("ix_course_link_course_id", "course_id"),
        Index(
            "ix_course_link_course_active",
            "course_id",
            postgresql_where=text("is_active"),
        ),
    )

    link_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)

    course: Mapped[Course] = relationship(back_populates="references")


# ---------- Activity ----------


class LearnBlock(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "learn_block"
    __table_args__ = (
        Index(
            "uq_learnblock_module_position_active",
            "module_id",
            "position",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_learnblock_module_id", "module_id"),
    )

    learn_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    module: Mapped[Module] = relationship(back_populates="learn_blocks")


class Practice(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice"
    __table_args__ = (
        Index(
            "uq_practice_module_position_active",
            "module_id",
            "position",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_practice_module_id", "module_id"),
    )

    practice_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    module: Mapped[Module] = relationship(back_populates="practices")
    questions: Mapped[list[PracticeQuestion]] = relationship(
        back_populates="practice",
        order_by="PracticeQuestion.position",
    )

    _soft_delete_cascade = ["questions"]


class PracticeQuestion(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice_question"
    __table_args__ = (
        Index(
            "uq_question_practice_position_active",
            "practice_id",
            "position",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_question_practice_id", "practice_id"),
        CheckConstraint(
            """
            (
              question_type = 'closed'
              AND correct_answer IS NOT NULL
              AND example_answer IS NULL
            )
            OR
            (
              question_type = 'open'
              AND correct_answer IS NULL
            )
            """,
            name="ck_practice_question_open_closed",
        ),
    )

    question_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    practice_id: Mapped[int] = mapped_column(
        ForeignKey("practice.practice_id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="question_type"), nullable=False
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)

    # --- “detail” sloupce podle typu ---
    correct_answer: Mapped[str | None] = mapped_column(String(255))  # jen pro closed
    example_answer: Mapped[str | None] = mapped_column(Text)  # jen pro open (volitelně)

    practice: Mapped[Practice] = relationship(back_populates="questions")

    closed_options: Mapped[list[PracticeOption]] = relationship(
        back_populates="question",
        order_by="PracticeOption.position",
    )
    open_keywords: Mapped[list[QuestionKeyword]] = relationship(
        back_populates="question",
    )
    _soft_delete_cascade = ["closed_options", "open_keywords"]


class PracticeOption(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice_option"
    __table_args__ = (
        Index(
            "uq_option_question_position_active",
            "question_id",
            "position",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_option_question_id", "question_id"),
    )

    option_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("practice_question.question_id"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    question: Mapped[PracticeQuestion] = relationship(back_populates="closed_options")


class QuestionKeyword(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "question_keyword"
    __table_args__ = (
        Index(
            "uq_keyword_question_keyword_active",
            "question_id",
            "keyword",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_keyword_question_id", "question_id"),
    )

    keyword_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("practice_question.question_id"),
        nullable=False,
    )
    keyword: Mapped[str] = mapped_column(String(200), nullable=False)

    question: Mapped[PracticeQuestion] = relationship(back_populates="open_keywords")
