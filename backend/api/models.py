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

from api.enums import (
    AuditAction,
    QuestionType,
    Status,
    TicketType,
    UserRole,
    ModuleTaskSessionStatus,
    AttemptStatus,
    TicketStatus,
)


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
        self.is_active = False

        for relation_name in self._soft_delete_cascade:
            related_obj = getattr(self, relation_name, None)

            if not related_obj:
                continue

            if isinstance(related_obj, list):
                for item in related_obj:
                    if hasattr(item, "soft_delete") and item.is_active:
                        item.soft_delete()
            elif hasattr(related_obj, "soft_delete") and related_obj.is_active:
                related_obj.soft_delete()


# ---------- System ----------


class SystemSetting(TimestampMixin, SoftDeleteMixin, Base):
    """
    Dynamické systémové nastavení spravované Super Adminem.
    Ukládají se sem verze LLM modelů, globální prompty pro generování kurzů,
    evaluaci odpovědí atd.
    """

    __tablename__ = "system_setting"
    __table_args__ = (
        Index(
            "uq_system_setting_key",
            "key",
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )

    setting_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


# ---------- User ----------


class User(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "user"
    __table_args__ = (
        Index("uq_user_sub", "sub", unique=True),
        Index("uq_user_email", "email", unique=True),
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    sub: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.user
    )
    ai_tone: Mapped[str] = mapped_column(
        String(100), nullable=False, default="profesionální a neutrální"
    )
    ai_expression_level: Mapped[str] = mapped_column(
        String(100), nullable=False, default="standardní srozumitelný jazyk"
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    courses: Mapped[list[Course]] = relationship(
        back_populates="owner",
        primaryjoin="User.user_id == Course.owner_id",
    )
    enrollments: Mapped[list[Enrollment]] = relationship(
        back_populates="user",
    )
    task_sessions: Mapped[list[ModuleTaskSession]] = relationship(
        back_populates="user",
    )
    practice_questions: Mapped[list[UserPracticeQuestion]] = relationship(
        back_populates="user",
    )
    mentor_logs: Mapped[list[MentorInteractionLog]] = relationship(
        back_populates="user",
    )


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
    actor_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    diff: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)


# ---------- Číselníky ----------


class CourseBlock(TimestampMixin, SoftDeleteMixin, Base):
    """
    Tématické bloky pro kurzy:
    A - Kontext a Transformace (AI principy, redesign výuky)
    B - Aplikace
    C - Oborové kurzy
    """

    __tablename__ = "course_block"
    __table_args__ = (
        Index(
            "uq_course_block_code_active",
            "code",
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )

    block_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)

    courses: Mapped[list[Course]] = relationship(back_populates="course_block")


class CourseTarget(TimestampMixin, SoftDeleteMixin, Base):
    """
    Cílové skupiny kurzů:
    akademik - Vysokoškolský pedagog
    student - Student učitelství / teacher trainee
    mentor - Fakultní učitel / mentor praxe
    host - Externí účastník
    """

    __tablename__ = "course_target"
    __table_args__ = (
        Index(
            "uq_course_target_code_active",
            "code",
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )

    target_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)

    courses: Mapped[list[Course]] = relationship(back_populates="course_target")


# class CourseLevel(TimestampMixin, SoftDeleteMixin, Base):
#     """
#     Úrovně kurzů (Cxx číslování):
#     C01 - Základní seznámení s AI pro začátečníky
#     C02 - Praktické využití AI pro pokročilé
#     """

#     __tablename__ = "course_level"
#     __table_args__ = (
#         Index(
#             "uq_course_level_code_active",
#             "code",
#             unique=True,
#             postgresql_where=text("is_active"),
#         ),
#     )

#     level_id: Mapped[int] = mapped_column(
#         BigInteger, Identity(start=1), primary_key=True
#     )
#     code: Mapped[str] = mapped_column(String(10), nullable=False)
#     name: Mapped[str] = mapped_column(String(200), nullable=False)

#     courses: Mapped[list[Course]] = relationship(back_populates="course_level")

#     _soft_delete_cascade: list[str] = ["courses"]


class CourseSubject(TimestampMixin, SoftDeleteMixin, Base):
    """
    Číselník oborů/aprobací:
    01 - Český jazyk a literatura
    02 - Cizí jazyky - obecné
    """

    __tablename__ = "course_subject"
    __table_args__ = (
        Index(
            "uq_course_subject_code_active",
            "code",
            unique=True,
            postgresql_where=text("is_active"),
        ),
    )

    subject_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    courses: Mapped[list[Course]] = relationship(back_populates="course_subject")


# class CourseType(TimestampMixin, SoftDeleteMixin, Base):
#     """
#     Číselník typů kurzů:
#     type.base  - Základní gramotnost
#     type.met   - Metodický
#     type.obor  - Oborový
#     type.all   - Průřezový
#     type.spec  - Specializovaný
#     """

#     __tablename__ = "course_type"
#     __table_args__ = (
#         Index(
#             "uq_course_type_code_active",
#             "code",
#             unique=True,
#             postgresql_where=text("is_active"),
#         ),
#     )

#     type_id: Mapped[int] = mapped_column(
#         BigInteger, Identity(start=1), primary_key=True
#     )
#     code: Mapped[str] = mapped_column(String(10), nullable=False)
#     name: Mapped[str] = mapped_column(String(200), nullable=False)
#     description: Mapped[str] = mapped_column(String(255), nullable=False)

#     courses: Mapped[list[Course]] = relationship(back_populates="course_type")

#     _soft_delete_cascade: list[str] = ["courses"]


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
        Index("ix_course_owner_id", "owner_id"),
        CheckConstraint(
            "approved_by_id IS NULL OR approved_by_id <> owner_id",
            name="ck_course_owner_not_approver",
        ),
    )

    course_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)

    owner_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)

    # Vyplní se při přechodu do stavu approved
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("user.user_id"), nullable=True
    )

    modules_count_ai_generated: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3
    )
    min_modules_to_open_final_exam: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    duration_minutes: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    status: Mapped[Status] = mapped_column(
        Enum(Status, name="course_status"), nullable=False, default=Status.draft
    )
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    course_block_id: Mapped[int] = mapped_column(
        ForeignKey("course_block.block_id"), nullable=False
    )
    course_target_id: Mapped[int] = mapped_column(
        ForeignKey("course_target.target_id"), nullable=False
    )
    course_subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("course_subject.subject_id"), nullable=True
    )
    # course_level_id: Mapped[int] = mapped_column(
    #     ForeignKey("course_level.level_id"), nullable=False
    # )
    # course_type_id: Mapped[int] = mapped_column(
    #     ForeignKey("course_type.type_id"), nullable=False
    # )

    owner: Mapped[User] = relationship(
        back_populates="courses",
        foreign_keys=[owner_id],
    )
    approved_by: Mapped[User | None] = relationship(
        foreign_keys=[approved_by_id],
    )

    modules: Mapped[list[Module]] = relationship(
        back_populates="course",
        primaryjoin="and_(Course.course_id==Module.course_id, Module.is_active==True)",
    )
    files: Mapped[list[CourseFile]] = relationship(
        back_populates="course",
        primaryjoin="and_(Course.course_id==CourseFile.course_id, CourseFile.is_active==True)",
    )
    links: Mapped[list[CourseLink]] = relationship(
        back_populates="course",
        primaryjoin="and_(Course.course_id==CourseLink.course_id, CourseLink.is_active==True)",
    )
    enrollments: Mapped[list[Enrollment]] = relationship(back_populates="course")

    course_block: Mapped[CourseBlock] = relationship(back_populates="courses")
    course_target: Mapped[CourseTarget] = relationship(back_populates="courses")
    course_subject: Mapped[CourseSubject] = relationship(back_populates="courses")
    # course_level: Mapped[CourseLevel] = relationship(back_populates="courses")
    # course_type: Mapped[CourseType] = relationship(back_populates="courses")

    _soft_delete_cascade: list[str] = ["modules", "files", "links"]

    def get_owner_id(self) -> int:
        return self.owner_id


class CourseFeedback(TimestampMixin, SoftDeleteMixin, Base):
    """
    Komentář garanta ke kurzu + případná odpověď autora kurzu.
    Autor odpovědi je vždy owner kurzu, dohledatelný přes course.owner_id.
    """

    __tablename__ = "course_feedback"

    feedback_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    # Garant který napsal komentář
    author_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)
    # Kontextové informace – ke kterému modulu/bloku/otázce se komentář váže
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    content_type: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )  # "learn_block" | "practice"
    content_ref: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # identifikátor bloku/otázky (např. číslo stránky nebo index otázky)
    # Komentář garanta
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    # Vyjádření autora kurzu (nullable dokud autor neodpoví)
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Označení jako vyřešené autorem kurzu
    is_resolved: Mapped[bool] = mapped_column(default=False, nullable=False)

    author: Mapped[User] = relationship(foreign_keys=[author_id])
    module: Mapped[Module] = relationship(foreign_keys=[module_id])


class Module(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "module"
    __table_args__ = (
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
    max_task_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    passing_score: Mapped[int] = mapped_column(Integer, nullable=False, default=75)

    course: Mapped[Course] = relationship(back_populates="modules")

    learn_blocks: Mapped[list[LearnBlock]] = relationship(
        back_populates="module",
        primaryjoin="and_(Module.module_id==LearnBlock.module_id, LearnBlock.is_active==True)",
    )
    practice_questions: Mapped[list[PracticeQuestion]] = relationship(
        back_populates="module",
        primaryjoin="and_(Module.module_id==PracticeQuestion.module_id, PracticeQuestion.is_active==True)",
    )
    task_sessions: Mapped[list[ModuleTaskSession]] = relationship(
        back_populates="module", cascade="all, delete-orphan"
    )
    user_practice_questions: Mapped[list[UserPracticeQuestion]] = relationship(
        back_populates="module",
    )

    _soft_delete_cascade = ["learn_blocks", "practice_questions"]

    def get_owner_id(self) -> int:
        return self.course.owner_id


class CourseFile(TimestampMixin, SoftDeleteMixin, Base):
    """Soubory/metadata přiřazené ke kurzu."""

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

    def get_owner_id(self) -> int:
        return self.course.owner_id


class CourseLink(TimestampMixin, SoftDeleteMixin, Base):
    """Odkazy na externí zdroje spojené s kurzem."""

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
    url: Mapped[str] = mapped_column(String(500), nullable=False)

    course: Mapped[Course] = relationship(back_populates="links")

    def get_owner_id(self) -> int:
        return self.course.owner_id


# ---------- Activity ----------


class LearnBlock(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "learn_block"
    __table_args__ = (
        Index(
            "uq_learnblock_module_active",
            "module_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index(
            "uq_learnblock_module_title_active",
            "module_id",
            "title",
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
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    module: Mapped[Module] = relationship(back_populates="learn_blocks")

    mentor_logs: Mapped[list[MentorInteractionLog]] = relationship(
        back_populates="learn_block",
    )

    def get_owner_id(self) -> int:
        return self.module.course.owner_id


# ---------- Practice (sdílené) ----------


class PracticeQuestion(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice_question"
    __table_args__ = (
        Index(
            "uq_question_module_text_active",
            "module_id",
            "question",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_question_module_id", "module_id"),
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
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="question_type"), nullable=False
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str | None] = mapped_column(String(255))
    example_answer: Mapped[str | None] = mapped_column(Text)

    module: Mapped[Module] = relationship(back_populates="practice_questions")
    closed_options: Mapped[list[PracticeOption]] = relationship(
        back_populates="question",
        primaryjoin="and_(PracticeQuestion.question_id==PracticeOption.question_id, PracticeOption.is_active==True)",
    )
    open_keywords: Mapped[list[QuestionKeyword]] = relationship(
        back_populates="question",
        primaryjoin="and_(PracticeQuestion.question_id==QuestionKeyword.question_id, QuestionKeyword.is_active==True)",
    )

    _soft_delete_cascade = ["closed_options", "open_keywords"]

    def get_owner_id(self) -> int:
        return self.module.course.owner_id


class PracticeOption(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "practice_option"
    __table_args__ = (
        Index(
            "uq_option_question_text_active",
            "question_id",
            "text",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_option_question_id", "question_id"),
    )

    option_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("practice_question.question_id"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)

    question: Mapped[PracticeQuestion] = relationship(back_populates="closed_options")

    def get_owner_id(self) -> int:
        return self.question.module.course.owner_id


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
        ForeignKey("practice_question.question_id"), nullable=False
    )
    keyword: Mapped[str] = mapped_column(String(200), nullable=False)

    question: Mapped[PracticeQuestion] = relationship(back_populates="open_keywords")

    def get_owner_id(self) -> int:
        return self.question.module.course.owner_id


# ---------- Practice (personalizované) ----------


class UserPracticeQuestion(TimestampMixin, SoftDeleteMixin, Base):
    """
    Personalizovaná otázka dogenerovaná pro konkrétního uživatele a modul.
    Nová otázka = nový řádek. Opakování odpovědí řeší UserPracticeAttempt.
    """

    __tablename__ = "user_practice_question"
    __table_args__ = (
        Index("ix_user_practice_question_user_module", "user_id", "module_id"),
    )

    user_question_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="question_type"), nullable=False
    )
    user_input: Mapped[str] = mapped_column(Text, nullable=False)
    generated_question: Mapped[str] = mapped_column(Text, nullable=False)
    # Snapshot možností pro closed otázky: [{"text": "..."}, ...]
    options: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    user: Mapped[User] = relationship(back_populates="practice_questions")
    module: Mapped[Module] = relationship(back_populates="user_practice_questions")
    attempts: Mapped[list[UserPracticeAttempt]] = relationship(
        back_populates="question",
        order_by="UserPracticeAttempt.created_at",
    )


class UserPracticeAttempt(TimestampMixin, SoftDeleteMixin, Base):
    """
    Jeden pokus uživatele na personalizovanou otázku.
    Dokud is_correct = False, může uživatel přidat další pokus.
    """

    __tablename__ = "user_practice_attempt"
    __table_args__ = (
        Index("ix_user_practice_attempt_question_id", "user_question_id"),
    )

    attempt_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    user_question_id: Mapped[int] = mapped_column(
        ForeignKey("user_practice_question.user_question_id"), nullable=False
    )
    user_input: Mapped[str] = mapped_column(Text, nullable=False)
    ai_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    question: Mapped[UserPracticeQuestion] = relationship(back_populates="attempts")


# ---------- Enrollment ----------


class Enrollment(TimestampMixin, SoftDeleteMixin, Base):
    """
    Zápis uživatele do kurzu.
    Unikátní kombinace (user_id, course_id) — jeden zápis na kurz.
    """

    __tablename__ = "enrollment"
    __table_args__ = (
        Index(
            "uq_enrollment_user_course_active",
            "user_id",
            "course_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_enrollment_course_id", "course_id"),
    )

    enrollment_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id"), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    left_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[User] = relationship(back_populates="enrollments")
    course: Mapped[Course] = relationship(back_populates="enrollments")


# ---------- AI Session / Test ----------


class ModuleTaskSession(TimestampMixin, SoftDeleteMixin, Base):
    """
    Záznam pro závěrečný AI test modulu.
    Je navázán na Usera (uchování dat nezávisle na Enrollmentu).
    Oprávnění ke spuštění se řeší v Python aplikaci.
    """

    __tablename__ = "module_task_session"
    __table_args__ = (
        Index(
            "uq_module_task_session_user_active",
            "user_id",
            "module_id",
            unique=True,
            postgresql_where=text("status IN ('in_progress', 'passed')"),
        ),
        Index("ix_module_task_session_user_id", "user_id"),
        Index("ix_module_task_session_module_id", "module_id"),
    )

    session_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    status: Mapped[ModuleTaskSessionStatus] = mapped_column(
        Enum(ModuleTaskSessionStatus, name="module_task_session_status"),
        nullable=False,
        default=ModuleTaskSessionStatus.in_progress,
    )
    generated_task: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[User] = relationship(back_populates="task_sessions")
    module: Mapped[Module] = relationship(back_populates="task_sessions")
    attempts: Mapped[list[TaskAttempt]] = relationship(
        back_populates="session",
        order_by="TaskAttempt.created_at",
    )


class TaskAttempt(TimestampMixin, SoftDeleteMixin, Base):
    """Konkrétní pokus uživatele o splnění AI úkolu."""

    __tablename__ = "task_attempt"
    __table_args__ = (Index("ix_task_attempt_session_id", "session_id"),)

    attempt_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    session_id: Mapped[int] = mapped_column(
        ForeignKey("module_task_session.session_id"), nullable=False
    )
    user_response: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status"),
        nullable=False,
        default=AttemptStatus.pending,
    )
    ai_feedback: Mapped[str | None] = mapped_column(Text)
    ai_score: Mapped[int | None] = mapped_column(Integer)
    is_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    session: Mapped[ModuleTaskSession] = relationship(back_populates="attempts")


# ---------- Ticket ----------


class ModuleTicket(TimestampMixin, SoftDeleteMixin, Base):
    """
    Reklamace studenta k AI hodnocení na úrovni modulu.
    Typ reklamace určuje ticket_type (concept check, practice evaluátor nebo ostatní).
    Manuálně řeší autor kurzu.
    """

    __tablename__ = "module_ticket"
    __table_args__ = (
        # Jeden otevřený ticket na uživatele, modul a typ
        Index(
            "uq_ticket_user_module_type",
            "user_id",
            "module_id",
            "ticket_type",
            unique=True,
            postgresql_where=text("status = 'open'"),
        ),
        Index(
            "uq_title_ticket_type_module_active",
            "title",
            "ticket_type",
            "module_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index("ix_ticket_user_id", "user_id"),
        Index("ix_ticket_module_id", "module_id"),
        Index("ix_ticket_course_id", "course_id"),
    )

    ticket_id: Mapped[int] = mapped_column(
        BigInteger, Identity(start=1), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)
    module_id: Mapped[int] = mapped_column(
        ForeignKey("module.module_id"), nullable=False
    )
    # Denormalizováno pro rychlý přístup bez joinu (dashboard autora kurzu)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.course_id"), nullable=False
    )
    ticket_type: Mapped[TicketType] = mapped_column(
        Enum(TicketType, name="ticket_type"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"),
        nullable=False,
        default=TicketStatus.open,
    )

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    module: Mapped[Module] = relationship()
    course: Mapped[Course] = relationship()


# ---------- Mentor Interaction Log ----------


class MentorInteractionLog(TimestampMixin, SoftDeleteMixin, Base):
    """
    Log konverzace uživatele s AI mentorem v rámci konkrétního LearnBlock.
    Jeden řádek = jedna otázka + odpověď.
    """

    __tablename__ = "mentor_interaction_log"
    __table_args__ = (
        Index("ix_mentor_log_user_id", "user_id"),
        Index("ix_mentor_log_learn_id", "learn_id"),
        Index("ix_mentor_log_user_learn", "user_id", "learn_id"),
    )

    log_id: Mapped[int] = mapped_column(BigInteger, Identity(start=1), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.user_id"), nullable=False)
    learn_id: Mapped[int] = mapped_column(
        ForeignKey("learn_block.learn_id"), nullable=False
    )
    user_message: Mapped[str] = mapped_column(Text, nullable=False)
    ai_response: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[User] = relationship(back_populates="mentor_logs")
    learn_block: Mapped[LearnBlock] = relationship(back_populates="mentor_logs")
