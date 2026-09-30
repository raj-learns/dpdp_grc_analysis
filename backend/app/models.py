"""
Core data model for the DPDP GRC Analysis tool.

Hierarchy:
    LegalRequirement -> KCA (reporting grouping)
    LegalRequirement <--many-to-many--> Control
    Control -> Action (one-to-many)
    Control / Action <--many-to-many--> Evidence

All "status", "priority", "applicability" etc. fields are plain strings
(not DB enums) so they can be extended from Settings without a migration.
Canonical allowed values live in app/constants.py and are enforced at the
API/schema layer, not the DB layer - this keeps the tracker easy to extend.
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, ForeignKey, Table, Boolean
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .database import Base


def now_utc():
    return datetime.utcnow()


# ---------------------------------------------------------------------------
# Association (many-to-many) tables
# ---------------------------------------------------------------------------

control_requirement_link = Table(
    "control_requirement_link",
    Base.metadata,
    Column("control_id", Integer, ForeignKey("controls.id", ondelete="CASCADE"), primary_key=True),
    Column("requirement_id", Integer, ForeignKey("legal_requirements.id", ondelete="CASCADE"), primary_key=True),
)

evidence_control_link = Table(
    "evidence_control_link",
    Base.metadata,
    Column("evidence_id", Integer, ForeignKey("evidence.id", ondelete="CASCADE"), primary_key=True),
    Column("control_id", Integer, ForeignKey("controls.id", ondelete="CASCADE"), primary_key=True),
)

evidence_action_link = Table(
    "evidence_action_link",
    Base.metadata,
    Column("evidence_id", Integer, ForeignKey("evidence.id", ondelete="CASCADE"), primary_key=True),
    Column("action_id", Integer, ForeignKey("actions.id", ondelete="CASCADE"), primary_key=True),
)


# ---------------------------------------------------------------------------
# Reference / lookup entities
# ---------------------------------------------------------------------------

class KCA(Base):
    """Internal DPDP Compliance Assessment Domain (KCA).

    NOTE: this is an INTERNAL reporting grouping invented for this tracker.
    It is not an official statutory classification under the DPDP Act/Rules.
    """
    __tablename__ = "kcas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)   # e.g. "KCA-04"
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    requirements = relationship("LegalRequirement", back_populates="kca")
    controls = relationship("Control", back_populates="kca")
    actions = relationship("Action", back_populates="kca")


class Owner(Base):
    """A person/role who can own controls or actions."""
    __tablename__ = "owners"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    role: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(200), default="")


class Application(Base):
    """An application / system that processes personal data."""
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    environment: Mapped[str] = mapped_column(String(100), default="")  # Production / Pre-Production / Staging / Dev
    business_owner: Mapped[str] = mapped_column(String(200), default="")
    technical_owner: Mapped[str] = mapped_column(String(200), default="")
    personal_data_processed: Mapped[str] = mapped_column(Text, default="")
    processing_purposes: Mapped[str] = mapped_column(Text, default="")
    consent_integration_status: Mapped[str] = mapped_column(String(50), default="NOT_STARTED")
    dpdp_assessment_status: Mapped[str] = mapped_column(String(50), default="NOT_STARTED")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    actions = relationship("Action", back_populates="application")
    evidence = relationship("Evidence", back_populates="application")


# ---------------------------------------------------------------------------
# Core traceability chain
# ---------------------------------------------------------------------------

class LegalRequirement(Base):
    """A discrete statutory requirement traceable to the Act/Rules/Schedule."""
    __tablename__ = "legal_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    requirement_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g. REQ-ACT-S6-9
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")

    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # DPDP_ACT / DPDP_RULES / SCHEDULE / OTHER_GUIDANCE / INTERNAL
    section_reference: Mapped[str] = mapped_column(String(200), default="")  # e.g. "Section 6(9)" / "Rule 4"
    source_url: Mapped[str] = mapped_column(String(500), default="")

    kca_id: Mapped[int] = mapped_column(Integer, ForeignKey("kcas.id"))

    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline_phase: Mapped[str] = mapped_column(String(50), nullable=False)  # ALREADY_EFFECTIVE / TWELVE_MONTH / EIGHTEEN_MONTH / ONGOING / CONDITIONAL

    applicability: Mapped[str] = mapped_column(String(30), default="TO_BE_DETERMINED")  # APPLICABLE / NOT_APPLICABLE / TO_BE_DETERMINED
    applicability_reason: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    kca = relationship("KCA", back_populates="requirements")
    controls = relationship("Control", secondary=control_requirement_link, back_populates="requirements")
    evidence = relationship("Evidence", back_populates="requirement")


class Control(Base):
    """An internal control implementing one or more legal requirements."""
    __tablename__ = "controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    control_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g. CTL-CM-01
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")

    kca_id: Mapped[int] = mapped_column(Integer, ForeignKey("kcas.id"))

    applicability: Mapped[str] = mapped_column(String(30), default="APPLICABLE")  # APPLICABLE / NOT_APPLICABLE / TO_BE_DETERMINED
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("owners.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="NOT_STARTED")
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")

    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deadline_phase: Mapped[str] = mapped_column(String(50), default="ONGOING")  # denormalised from linked requirement(s) for fast scoping

    completion_pct: Mapped[int] = mapped_column(Integer, default=0)
    evidence_required: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    kca = relationship("KCA", back_populates="controls")
    owner = relationship("Owner")
    requirements = relationship("LegalRequirement", secondary=control_requirement_link, back_populates="controls")
    actions = relationship("Action", back_populates="control", cascade="all, delete-orphan")
    evidence = relationship("Evidence", secondary=evidence_control_link, back_populates="controls")


class Action(Base):
    """A concrete, assignable unit of work implementing a control."""
    __tablename__ = "actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    action_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g. ACT-CM-004
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")

    control_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("controls.id"), nullable=True)
    kca_id: Mapped[int] = mapped_column(Integer, ForeignKey("kcas.id"))
    application_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("applications.id"), nullable=True)

    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("owners.id"), nullable=True)  # owning department/team
    owner_person: Mapped[str] = mapped_column(String(200), default="")  # named individual actually doing the work
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="NOT_STARTED")  # NOT_STARTED / IN_PROGRESS / BLOCKED / COMPLETED / CANCELLED
    completion_pct: Mapped[int] = mapped_column(Integer, default=0)

    notes: Mapped[str] = mapped_column(Text, default="")
    blocker: Mapped[str] = mapped_column(Text, default="")
    dependency: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    control = relationship("Control", back_populates="actions")
    kca = relationship("KCA", back_populates="actions")
    application = relationship("Application", back_populates="actions")
    owner = relationship("Owner")
    evidence = relationship("Evidence", secondary=evidence_action_link, back_populates="actions")


class Evidence(Base):
    """Proof that a control/action has actually been carried out."""
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # e.g. EVD-CM-001
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(50), default="OTHER")

    requirement_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("legal_requirements.id"), nullable=True)
    application_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("applications.id"), nullable=True)

    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    owner_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("owners.id"), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    file_url: Mapped[str] = mapped_column(String(500), default="")  # URL / path reference (no binary upload in v1)
    verification_status: Mapped[str] = mapped_column(String(30), default="UNVERIFIED")  # UNVERIFIED / VERIFIED / REJECTED
    notes: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    requirement = relationship("LegalRequirement", back_populates="evidence")
    application = relationship("Application", back_populates="evidence")
    owner = relationship("Owner")
    controls = relationship("Control", secondary=evidence_control_link, back_populates="evidence")
    actions = relationship("Action", secondary=evidence_action_link, back_populates="evidence")


# ---------------------------------------------------------------------------
# Stakeholder data-collection questionnaire
# ---------------------------------------------------------------------------

class QuestionnaireQuestion(Base):
    """A reference item from the DPDP stakeholder data-collection questionnaire.

    Seeded reference content (see questionnaire_seed_data.py), transcribed
    from docs/DPDP_Compliance_Questionnaire.docx - not edited via the UI,
    same treatment as LegalRequirement text. `section` is either
    "ENTERPRISE", a KCA code ("KCA-04"), or one of the six repeatable
    generic templates ("APPLICATION", "VENDOR", "DATAFLOW", "CONTROL",
    "ACTION", "EVIDENCE") meant to be answered once per application/vendor/
    flow/control/action/evidence item a respondent is describing.
    """
    __tablename__ = "questionnaire_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)  # e.g. "GOV-001"
    section: Mapped[str] = mapped_column(String(20), nullable=False)
    kca_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("kcas.id"), nullable=True)

    topic: Mapped[str] = mapped_column(String(300), default="")
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    why: Mapped[str] = mapped_column(Text, default="")
    answer_type: Mapped[str] = mapped_column(String(300), default="")
    options: Mapped[str] = mapped_column(Text, default="")
    evidence_hint: Mapped[str] = mapped_column(Text, default="")
    who_should_answer: Mapped[str] = mapped_column(String(300), default="")
    grc_fields: Mapped[str] = mapped_column(Text, default="")
    followup: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    repeatable: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    kca = relationship("KCA")
    responses = relationship("QuestionnaireResponse", back_populates="question", cascade="all, delete-orphan")


class QuestionnaireResponse(Base):
    """A recorded answer to a QuestionnaireQuestion, captured from a stakeholder interview."""
    __tablename__ = "questionnaire_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questionnaire_questions.id", ondelete="CASCADE"), nullable=False)

    instance_label: Mapped[str] = mapped_column(String(200), default="")  # which application/vendor/control this answers, for repeatable questions
    respondent_name: Mapped[str] = mapped_column(String(200), default="")
    respondent_department: Mapped[str] = mapped_column(String(200), default="")
    answer_text: Mapped[str] = mapped_column(Text, default="")
    evidence_note: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[str] = mapped_column(String(30), default="")
    answered_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc, onupdate=now_utc)

    question = relationship("QuestionnaireQuestion", back_populates="responses")
    applied_updates = relationship("QuestionnaireAppliedUpdate", back_populates="response", cascade="all, delete-orphan")


class QuestionnaireAppliedUpdate(Base):
    """Audit/idempotency journal: one row per GRC-record write applied from a
    questionnaire response's suggested updates. Lets re-opening the
    suggestions panel know a target was already actioned (and with what
    value), and lets a second apply of a gap-capture "new Action" suggestion
    update the same Action instead of creating a duplicate.
    """
    __tablename__ = "questionnaire_applied_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    response_id: Mapped[int] = mapped_column(Integer, ForeignKey("questionnaire_responses.id", ondelete="CASCADE"), nullable=False)

    target_key: Mapped[str] = mapped_column(String(200), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    field_name: Mapped[str] = mapped_column(String(50), nullable=False)
    applied_value: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    response = relationship("QuestionnaireResponse", back_populates="applied_updates")
    
class User(Base):
    """A user of the DPDP GRC Analysis tool."""
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    
class Session(Base):
    """A sesssion for a logged in user"""
    __tablename__ =  "sessions"
    id: Mapped[str] = mapped_column(String(128), primary_key = True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable = False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable = False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    
