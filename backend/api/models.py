# app/models.py
from __future__ import annotations

import enum
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
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase


class Base(DeclarativeBase):
    pass


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

    status: Mapped[Status] = mapped_column(
        Enum(Status, name="course_status"), nullable=False, default=Status.draft
    )

    summary: Mapped[str | None] = mapped_column(Text)

    modules: Mapped[list[Module]] = relationship(
        back_populates="course", cascade="all, delete-orphan", order_by="Module.order"
    )
    files: Mapped[list[CourseFile]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
    references: Mapped[list[CourseLink]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
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
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    course: Mapped[Course] = relationship(back_populates="modules")

    learn_blocks: Mapped[list[LearnBlock]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="LearnBlock.order",
    )

    practices: Mapped[list[Practice]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Practice.order",
    )


class CourseFile(TimestampMixin, Base):
    """Soubory/metadata přiřazené ke kurzu"""

    __tablename__ = "course_file"
    __table_args__ = (Index("ix_course_file_course_id", "course_id"),)

    file_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)

    course: Mapped[Course] = relationship(back_populates="files")


class CourseLink(TimestampMixin, Base):
    """Odkazy na externí zdroje spojené s kurzem"""

    __tablename__ = "course_link"
    __table_args__ = (Index("ix_course_link_course_id", "course_id"),)

    link_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)

    course: Mapped[Course] = relationship(back_populates="references")


# ---------- Activity ----------


class LearnBlock(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "learn_block"
    __table_args__ = (
        UniqueConstraint("module_id", "order", name="uq_learnblock_module_order"),
        Index("ix_learnblock_module_id", "module_id"),
    )

    learn_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    module: Mapped[Module] = relationship(back_populates="learn_blocks")


class Practice(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice"
    __table_args__ = (
        UniqueConstraint("module_id", "order", name="uq_practice_module_order"),
        Index("ix_practice_module_id", "module_id"),
    )

    practice_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    module: Mapped[Module] = relationship(back_populates="practices")
    questions: Mapped[list[PracticeQuestion]] = relationship(
        back_populates="practice",
        cascade="all, delete-orphan",
        order_by="PracticeQuestion.order",
    )


class PracticeQuestion(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice_question"
    __table_args__ = (
        UniqueConstraint("practice_id", "order", name="uq_question_practice_order"),
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
        ForeignKey("practice.practice_id", ondelete="CASCADE"), nullable=False
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

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
        cascade="all, delete-orphan",
        order_by="PracticeOption.order",
    )
    open_keywords: Mapped[list[QuestionKeyword]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )


class PracticeOption(Base):
    __tablename__ = "practice_option"
    __table_args__ = (
        UniqueConstraint("question_id", "order", name="uq_option_question_order"),
        Index("ix_option_question_id", "question_id"),
    )

    option_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("practice_question.question_id", ondelete="CASCADE"),
        nullable=False,
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    question: Mapped[PracticeQuestion] = relationship(back_populates="closed_options")


class QuestionKeyword(Base):
    __tablename__ = "question_keyword"
    __table_args__ = (
        UniqueConstraint("question_id", "keyword", name="uq_keyword_question_keyword"),
        Index("ix_keyword_question_id", "question_id"),
    )

    keyword_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("practice_question.question_id", ondelete="CASCADE"),
        nullable=False,
    )
    keyword: Mapped[str] = mapped_column(String(200), nullable=False)

    question: Mapped[PracticeQuestion] = relationship(back_populates="open_keywords")
