"""Pydantic request/response schemas."""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, model_validator


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# KCA
# ---------------------------------------------------------------------------

class KCABase(ORMBase):
    code: str
    name: str
    description: str = ""
    sort_order: int = 0


class KCACreate(KCABase):
    pass


class KCAUpdate(ORMBase):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


class KCARead(KCABase):
    id: int


# ---------------------------------------------------------------------------
# Owner
# ---------------------------------------------------------------------------

class OwnerBase(ORMBase):
    name: str
    role: str = ""
    email: str = ""


class OwnerCreate(OwnerBase):
    pass


class OwnerUpdate(ORMBase):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None


class OwnerRead(OwnerBase):
    id: int


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

class ApplicationBase(ORMBase):
    name: str
    environment: str = ""
    business_owner: str = ""
    technical_owner: str = ""
    personal_data_processed: str = ""
    processing_purposes: str = ""
    consent_integration_status: str = "NOT_STARTED"
    dpdp_assessment_status: str = "NOT_STARTED"
    notes: str = ""


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(ORMBase):
    name: Optional[str] = None
    environment: Optional[str] = None
    business_owner: Optional[str] = None
    technical_owner: Optional[str] = None
    personal_data_processed: Optional[str] = None
    processing_purposes: Optional[str] = None
    consent_integration_status: Optional[str] = None
    dpdp_assessment_status: Optional[str] = None
    notes: Optional[str] = None


class ApplicationRead(ApplicationBase):
    id: int
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Legal Requirement
# ---------------------------------------------------------------------------

class LegalRequirementBase(ORMBase):
    requirement_id: str
    title: str
    description: str = ""
    source_type: str
    section_reference: str = ""
    source_url: str = ""
    kca_id: int
    effective_date: Optional[date] = None
    deadline_phase: str
    applicability: str = "TO_BE_DETERMINED"
    applicability_reason: str = ""
    notes: str = ""


class LegalRequirementCreate(LegalRequirementBase):
    pass


class LegalRequirementUpdate(ORMBase):
    requirement_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[str] = None
    section_reference: Optional[str] = None
    source_url: Optional[str] = None
    kca_id: Optional[int] = None
    effective_date: Optional[date] = None
    deadline_phase: Optional[str] = None
    applicability: Optional[str] = None
    applicability_reason: Optional[str] = None
    notes: Optional[str] = None


class LegalRequirementRead(LegalRequirementBase):
    id: int
    kca: Optional[KCARead] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Control
# ---------------------------------------------------------------------------

class ControlBase(ORMBase):
    control_id: str
    name: str
    description: str = ""
    kca_id: int
    applicability: str = "APPLICABLE"
    owner_id: Optional[int] = None
    status: str = "NOT_STARTED"
    priority: str = "MEDIUM"
    effective_date: Optional[date] = None
    target_date: Optional[date] = None
    deadline_phase: str = "ONGOING"
    completion_pct: int = 0
    evidence_required: bool = True
    notes: str = ""


class ControlCreate(ControlBase):
    requirement_ids: list[int] = []


class ControlUpdate(ORMBase):
    control_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    kca_id: Optional[int] = None
    applicability: Optional[str] = None
    owner_id: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    effective_date: Optional[date] = None
    target_date: Optional[date] = None
    deadline_phase: Optional[str] = None
    completion_pct: Optional[int] = None
    evidence_required: Optional[bool] = None
    notes: Optional[str] = None
    requirement_ids: Optional[list[int]] = None


class ControlRead(ControlBase):
    id: int
    kca: Optional[KCARead] = None
    owner: Optional[OwnerRead] = None
    requirements: list[LegalRequirementRead] = []
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Action
# ---------------------------------------------------------------------------

class ActionBase(ORMBase):
    action_id: str
    name: str
    description: str = ""
    control_id: Optional[int] = None
    kca_id: int
    application_id: Optional[int] = None
    owner_id: Optional[int] = None  # owning department/team (Owner record)
    owner_person: str = ""  # named individual actually doing the work
    priority: str = "MEDIUM"
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    status: str = "NOT_STARTED"
    completion_pct: int = 0
    notes: str = ""
    blocker: str = ""
    dependency: str = ""


class ActionCreate(ActionBase):
    owner_id: int
    target_date: date


class ActionUpdate(ORMBase):
    action_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    control_id: Optional[int] = None
    kca_id: Optional[int] = None
    application_id: Optional[int] = None
    owner_id: Optional[int] = None
    owner_person: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    status: Optional[str] = None
    completion_pct: Optional[int] = None
    notes: Optional[str] = None
    blocker: Optional[str] = None
    dependency: Optional[str] = None

    @model_validator(mode="after")
    def _reject_explicit_nulls(self):
        set_fields = self.model_fields_set
        if "owner_id" in set_fields and self.owner_id is None:
            raise ValueError("owner_id cannot be cleared - every action needs an owning department/team")
        if "target_date" in set_fields and self.target_date is None:
            raise ValueError("target_date cannot be cleared - every action needs a target date")
        return self


class EvidenceSummary(ORMBase):
    """Minimal evidence shape for embedding in ActionRead - avoids the
    Action<->Evidence circular reference that a full EvidenceRead (which
    itself embeds actions) would create."""
    id: int
    evidence_id: str
    name: str
    evidence_type: str = "OTHER"
    verification_status: str = "UNVERIFIED"
    file_url: str = ""


class ActionRead(ActionBase):
    id: int
    kca: Optional[KCARead] = None
    application: Optional[ApplicationRead] = None
    owner: Optional[OwnerRead] = None
    evidence: list[EvidenceSummary] = []
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

class EvidenceBase(ORMBase):
    evidence_id: str
    name: str
    evidence_type: str = "OTHER"
    requirement_id: Optional[int] = None
    application_id: Optional[int] = None
    date: Optional[date] = None
    owner_id: Optional[int] = None
    description: str = ""
    file_url: str = ""
    verification_status: str = "UNVERIFIED"
    notes: str = ""


class EvidenceCreate(EvidenceBase):
    control_ids: list[int] = []
    action_ids: list[int] = []


class EvidenceUpdate(ORMBase):
    evidence_id: Optional[str] = None
    name: Optional[str] = None
    evidence_type: Optional[str] = None
    requirement_id: Optional[int] = None
    application_id: Optional[int] = None
    date: Optional[date] = None
    owner_id: Optional[int] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None
    control_ids: Optional[list[int]] = None
    action_ids: Optional[list[int]] = None


class EvidenceRead(EvidenceBase):
    id: int
    application: Optional[ApplicationRead] = None
    owner: Optional[OwnerRead] = None
    controls: list[ControlRead] = []
    actions: list[ActionRead] = []
    created_at: datetime


# ---------------------------------------------------------------------------
# Questionnaire
# ---------------------------------------------------------------------------

class QuestionnaireQuestionRead(ORMBase):
    id: int
    question_id: str
    section: str
    kca_id: Optional[int] = None
    kca: Optional[KCARead] = None
    topic: str
    question_text: str
    why: str
    answer_type: str
    options: str
    evidence_hint: str
    who_should_answer: str
    grc_fields: str
    followup: str
    notes: str
    repeatable: bool
    sort_order: int


class QuestionnaireResponseBase(ORMBase):
    question_id: int
    instance_label: str = ""
    respondent_name: str = ""
    respondent_department: str = ""
    answer_text: str = ""
    evidence_note: str = ""
    confidence: str = ""
    answered_date: Optional[date] = None
    notes: str = ""


class QuestionnaireResponseCreate(QuestionnaireResponseBase):
    pass


class QuestionnaireResponseUpdate(ORMBase):
    instance_label: Optional[str] = None
    respondent_name: Optional[str] = None
    respondent_department: Optional[str] = None
    answer_text: Optional[str] = None
    evidence_note: Optional[str] = None
    confidence: Optional[str] = None
    answered_date: Optional[date] = None
    notes: Optional[str] = None


class QuestionnaireResponseRead(QuestionnaireResponseBase):
    id: int
    question: Optional[QuestionnaireQuestionRead] = None
    created_at: datetime
    updated_at: datetime


class QuestionnaireProgressRow(ORMBase):
    section: str
    kca_id: Optional[int] = None
    total: int
    answered: int


# ---------------------------------------------------------------------------
# Questionnaire automation - suggested GRC updates derived from a response
# ---------------------------------------------------------------------------

class SuggestionRead(BaseModel):
    target_key: str
    entity_type: str
    entity_code: Optional[str] = None
    field_name: str
    current_value: Optional[str] = None
    proposed_value: str
    source_clause: str
    already_applied: bool = False
    already_applied_value: Optional[str] = None
    already_applied_at: Optional[datetime] = None
    requires_extra_input: bool = False


class ApplySuggestionItem(BaseModel):
    target_key: str
    entity_type: str
    entity_code: Optional[str] = None
    field_name: str
    proposed_value: str
    # only used for a gap-capture "new Action" suggestion (requires_extra_input)
    owner_id: Optional[int] = None
    target_date: Optional[date] = None


class ApplySuggestionsRequest(BaseModel):
    items: list[ApplySuggestionItem]


class ApplySuggestionResult(BaseModel):
    target_key: str
    success: bool
    message: str
    entity_type: str
    entity_id: Optional[int] = None


class ApplySuggestionsResponse(BaseModel):
    results: list[ApplySuggestionResult]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str


class UserRead(ORMBase):
    """Never include password_hash here - this is what the frontend sees."""
    id: int
    username: str
    is_active: bool
    created_at: datetime
    