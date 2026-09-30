"""
Derives suggested GRC-record updates from a stakeholder questionnaire
response, for review-then-apply by a human (never silently auto-written).

Pipeline: parse_grc_fields() turns a QuestionnaireQuestion.grc_fields string
(free text, authored in questionnaire_seed_data.py) into structured
ParsedTarget objects -> resolve_targets() maps each to real DB rows (or a
"create a new Action" marker for gap-capture questions) -> compute_suggestions()
derives a proposed value per target from the response's answer_text (a
direct copy for plain text fields, or a keyword-classified enum value for
status/applicability fields - never a guess when not confident) and diffs
against the current value and the QuestionnaireAppliedUpdate audit journal
-> apply_one() writes an accepted suggestion by calling the existing,
already-validated router update/create functions directly (so e.g. the
evidence-required-before-COMPLETED check in routers/actions.py applies for
free, without duplicating it here).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models, schemas
from .routers import actions as actions_router
from .routers import applications as applications_router
from .routers import controls as controls_router
from .routers import owners as owners_router
from .routers import requirements as requirements_router


# ---------------------------------------------------------------------------
# Parsing grc_fields -> structured targets
# ---------------------------------------------------------------------------

CODE_RE = re.compile(r"\b(?:REQ|CTL|ACT|EVD)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b")
KCA_RE = re.compile(r"\bKCA-\d+\b")

ENTITY_FIELDS: dict[str, set[str]] = {
    "LegalRequirement": {"applicability", "applicability_reason", "notes"},
    "Control": {
        "applicability", "status", "notes", "owner_id", "completion_pct",
        "target_date", "priority", "name", "description",
    },
    "Action": {
        "status", "notes", "blocker", "description", "target_date",
        "owner_id", "owner_person", "completion_pct", "priority",
        "dependency", "start_date", "application_id", "name",
    },
    "Application": {
        "personal_data_processed", "processing_purposes", "notes",
        "environment", "business_owner", "technical_owner",
        "consent_integration_status", "dpdp_assessment_status", "name",
    },
    "Owner": {"name", "role", "email"},
}

# (entity_type, field_name) -> which classifier to use. Every other field in
# ENTITY_FIELDS is either a direct text copy, or handled specially below
# (owner_id / completion_pct / target_date).
ENUM_CLASSIFIERS = {
    ("LegalRequirement", "applicability"): "applicability",
    ("Control", "applicability"): "applicability",
    ("Control", "status"): "control_status",
    ("Action", "status"): "action_status",
}

CODE_MODEL_FIELD = {
    "REQ": (models.LegalRequirement, "requirement_id", "LegalRequirement"),
    "CTL": (models.Control, "control_id", "Control"),
    "ACT": (models.Action, "action_id", "Action"),
}

ENTITY_MODEL = {
    "LegalRequirement": models.LegalRequirement,
    "Control": models.Control,
    "Action": models.Action,
    "Application": models.Application,
    "Owner": models.Owner,
}

ENTITY_NAME_FIELD = {
    "Control": "name",
    "Action": "name",
    "Application": "name",
    "Owner": "name",
}


@dataclass
class ParsedTarget:
    entity_type: str
    field_names: list[str] = field(default_factory=list)
    codes: list[str] = field(default_factory=list)
    new_action_kca_code: str | None = None
    raw_clause: str = ""


@dataclass
class Suggestion:
    target_key: str
    entity_type: str
    entity_code: str | None
    field_name: str
    current_value: str | None
    proposed_value: str
    source_clause: str
    already_applied: bool = False
    already_applied_value: str | None = None
    already_applied_at: object | None = None
    requires_extra_input: bool = False


def _expand_codes(raw: str) -> list[str]:
    """Extract entity codes from a clause, expanding CTL-CHD-01/02 style
    suffix lists and "ACT-CHD-003 through 008" style ranges."""
    codes: list[str] = []
    for m in CODE_RE.finditer(raw):
        codes.append(m.group(0))
        tail = raw[m.end():]

        # slash-separated suffix siblings: CTL-CHD-01/02/03
        suffix_m = re.match(r"^((?:/\d+)+)", tail)
        if suffix_m:
            base_prefix = re.sub(r"\d+$", "", m.group(0))
            width = len(re.search(r"\d+$", m.group(0)).group(0))
            for suffix in re.findall(r"/(\d+)", suffix_m.group(1)):
                codes.append(f"{base_prefix}{suffix.zfill(width)}")

        # "CODE-003 through 008" style inclusive ranges
        through_m = re.match(r"^\s*through\s+(\d+)", tail, re.IGNORECASE)
        if through_m:
            num_m = re.search(r"\d+$", m.group(0))
            if num_m:
                base_prefix = m.group(0)[: num_m.start()]
                width = len(num_m.group(0))
                start = int(num_m.group(0))
                end = int(through_m.group(1))
                codes.extend(f"{base_prefix}{n:0{width}d}" for n in range(start, end + 1))
    # de-dupe, preserve order
    seen: set[str] = set()
    out = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def _entity_type_for_code(code: str) -> str | None:
    prefix = code.split("-", 1)[0]
    entry = CODE_MODEL_FIELD.get(prefix)
    return entry[2] if entry else None


def _split_fields(raw: str, entity_type: str) -> list[str]:
    # normalise "Action.description / Action.blocker" -> drop repeated "Entity."
    raw = re.sub(rf"\b{entity_type}\.", "", raw)
    tokens = re.split(r"[/+]", raw)
    known = ENTITY_FIELDS.get(entity_type, set())
    out = []
    for tok in tokens:
        tok = tok.strip().strip(".")
        if tok in known and tok not in out:
            out.append(tok)
    return out


FIELD_HEAD_RE = re.compile(
    r"^(?P<entity>LegalRequirement|Control|Action|Application|Owner)\."
    r"(?P<fields>[A-Za-z_.\s/+]+?)"
    r"(?:\s*\([^)]*\))?"
    r"(?:\s+for\s+(?P<rest>.+))?$",
    re.IGNORECASE,
)


def parse_grc_fields(grc_fields: str, question: models.QuestionnaireQuestion) -> list[ParsedTarget]:
    targets: list[ParsedTarget] = []
    if not grc_fields:
        return targets

    for raw_clause in grc_fields.split(";"):
        clause = raw_clause.strip()
        if not clause:
            continue

        if re.match(r"^(feeds\s+)?evidence\b", clause, re.IGNORECASE):
            continue
        if re.match(r"^new (application|control|owner) record", clause, re.IGNORECASE):
            continue

        has_code = bool(CODE_RE.search(clause))
        mentions_action = bool(re.match(r"^(action\.|new action\b)", clause, re.IGNORECASE))
        mentions_kca = bool(KCA_RE.search(clause))

        if not has_code and mentions_action and (mentions_kca or "new or existing" in clause.lower() or clause.lower().startswith("new action")):
            m = FIELD_HEAD_RE.match(clause)
            field_names = _split_fields(m.group("fields"), "Action") if m and m.group("fields") else []
            if not field_names:
                field_names = ["blocker"]
            targets.append(ParsedTarget(
                entity_type="Action", field_names=field_names, codes=[],
                new_action_kca_code=question.kca.code if question.kca else None,
                raw_clause=clause,
            ))
            continue

        m = FIELD_HEAD_RE.match(clause)
        if not m:
            continue
        entity_type = m.group("entity")
        # normalise capitalisation (regex is case-insensitive, dict keys are exact-case)
        entity_type = next((e for e in ENTITY_FIELDS if e.lower() == entity_type.lower()), None)
        if not entity_type:
            continue
        field_names = _split_fields(m.group("fields"), entity_type)
        if not field_names:
            continue
        codes = _expand_codes(m.group("rest")) if m.group("rest") else []
        targets.append(ParsedTarget(entity_type=entity_type, field_names=field_names, codes=codes, raw_clause=clause))

    return targets


# ---------------------------------------------------------------------------
# Resolving targets to real rows
# ---------------------------------------------------------------------------

def resolve_targets(db: Session, target: ParsedTarget, question: models.QuestionnaireQuestion,
                     response: models.QuestionnaireResponse) -> list[tuple[str | None, object | None]]:
    """Returns a list of (entity_code_or_None, orm_instance_or_None)."""
    if target.codes:
        out = []
        for code in target.codes:
            code_entity = _entity_type_for_code(code)
            if code_entity != target.entity_type:
                continue
            model, id_field, _ = CODE_MODEL_FIELD[code.split("-", 1)[0]]
            row = db.scalars(select(model).where(getattr(model, id_field) == code)).first()
            if row is not None:
                out.append((code, row))
        return out

    if question.repeatable and response.instance_label:
        model = ENTITY_MODEL.get(target.entity_type)
        name_field = ENTITY_NAME_FIELD.get(target.entity_type)
        if model is None or name_field is None:
            return []
        label = response.instance_label.strip()
        code_field = {"Control": "control_id", "Action": "action_id"}.get(target.entity_type)
        rows = []
        if code_field:
            rows = db.scalars(select(model).where(getattr(model, code_field) == label)).all()
        if not rows:
            rows = db.scalars(select(model).where(getattr(model, name_field).ilike(f"%{label}%"))).all()
        if len(rows) == 1:
            row = rows[0]
            code_val = getattr(row, code_field, None) if code_field else None
            return [(code_val, row)]
        return []  # zero or ambiguous - never guess which row

    return []


# ---------------------------------------------------------------------------
# Deriving a proposed value from the answer text
# ---------------------------------------------------------------------------

NEG_RE = r"(?:not|n['’]t|no|never|nowhere|hasn['’]t|isn['’]t|doesn['’]t|haven['’]t|don['’]t|without|nobody)"


def _clause_before(text: str, start: int, window: int = 40) -> str:
    """Text immediately preceding a match, cut at the last clause boundary
    so negation from an earlier, unrelated sentence doesn't leak in."""
    preceding = text[max(0, start - window):start]
    return re.split(r"[.;]", preceding)[-1]


def _has_unnegated(text: str, pattern: str) -> bool:
    """True if `pattern` matches somewhere in `text` and that match is NOT
    preceded (within its clause) by a negation word - guards against e.g.
    "published" firing on "not published anywhere"."""
    for m in re.finditer(pattern, text):
        if not re.search(rf"\b{NEG_RE}\b", _clause_before(text, m.start())):
            return True
    return False


def _has_negated(text: str, pattern: str) -> bool:
    """True if `pattern` matches and IS preceded by a negation word."""
    for m in re.finditer(pattern, text):
        if re.search(rf"\b{NEG_RE}\b", _clause_before(text, m.start())):
            return True
    return False


def classify_applicability(text: str) -> str | None:
    t = text.lower()
    if re.search(r"\bnot applicable\b|\bn/?a\b|\bdoes(?:n't| not) apply\b", t):
        return "NOT_APPLICABLE"
    if re.search(r"\bunsure\b|\bunknown\b|\bnot sure\b|\bneeds? investigation\b|\bto be determined\b|\btbd\b|\bunclear\b|\bnot yet (assessed|determined)\b|\bdon'?t know\b|\bexpect(?:ing|s)? to be\b", t):
        return "TO_BE_DETERMINED"
    if re.match(r"^\s*yes\b", t) or re.match(r"^\s*notified\b", t):
        return "APPLICABLE"
    if re.match(r"^\s*no\b", t) or re.match(r"^\s*not notified\b", t):
        return "NOT_APPLICABLE"
    return None


_CONTROL_POSITIVE_RE = r"live|in production|implemented|in place|published|reviewed,?\s*consistent|done"
_CONTROL_VERIFIED_RE = r"verified|tested,?\s*passed|audited"


def classify_control_status(text: str) -> str | None:
    t = text.lower()
    if re.search(r"\bnot applicable\b|\bn/?a\b|\bnot an sdf\b", t):
        return "NOT_APPLICABLE"
    if re.search(r"\bgap identified\b|\bconfirmed\b.{0,15}\bgap\b|\breal gap\b|\bgap exists\b|\bmismatch(es)? found\b|\bissues found\b|\binconsistenc", t):
        return "GAP_IDENTIFIED"
    # negated implementation phrases ("not published", "hasn't been reviewed") mean
    # nothing's actually done - must be checked before the positive-keyword buckets
    # below, or e.g. "published" inside "not published anywhere" would misfire.
    if _has_negated(t, _CONTROL_POSITIVE_RE) or re.search(r"\bnot yet (reviewed|tested|validated)\b", t):
        return "NOT_STARTED"
    if _has_unnegated(t, _CONTROL_VERIFIED_RE):
        return "EVIDENCE_VERIFIED"
    if re.search(r"\bin progress\b|\bunderway\b|\bpartially\b|\bpartial\b|\bin draft\b|\bworking on\b|\bscheduled\b", t):
        return "IN_PROGRESS"
    if re.search(r"\bnot (yet )?started\b|\bnothing.{0,15}(done|started)\b|\bno defined\b|\bno plan\b", t):
        return "NOT_STARTED"
    if _has_unnegated(t, _CONTROL_POSITIVE_RE) or re.match(r"^\s*yes\b", t):
        return "IMPLEMENTED"
    return None


_ACTION_DONE_RE = r"completed|done|finished|verified|tested,?\s*passed|live|in production"


def classify_action_status(text: str) -> str | None:
    t = text.lower()
    if re.search(r"\bcancel+ed\b|\bno longer (needed|planned|relevant)\b|\babandoned\b", t):
        return "CANCELLED"
    if _has_negated(t, _ACTION_DONE_RE):
        return "NOT_STARTED"
    if _has_unnegated(t, _ACTION_DONE_RE):
        return "COMPLETED"
    if re.search(r"\bblock(ed|er)\b|\bstuck\b|\bcan'?t\b|\bcannot\b|\bunable to\b|\bwaiting on\b|\bissues found\b", t):
        return "BLOCKED"
    if re.search(r"\bin progress\b|\bunderway\b|\bpartially\b|\bpartial\b|\bin draft\b|\bworking on\b|\bscheduled\b", t):
        return "IN_PROGRESS"
    if re.search(r"\bnot (yet )?started\b|\bnothing.{0,15}(done|started)\b|\bnever\b", t):
        return "NOT_STARTED"
    return None


CLASSIFIERS = {
    "applicability": classify_applicability,
    "control_status": classify_control_status,
    "action_status": classify_action_status,
}


def _resolve_owner_by_name(db: Session, text: str) -> models.Owner | None:
    text = text.strip()
    if not text:
        return None
    owners = db.scalars(select(models.Owner)).all()
    matches = [o for o in owners if o.name.lower() in text.lower() or text.lower() in o.name.lower()]
    return matches[0] if len(matches) == 1 else None


def _parse_percentage(text: str) -> int | None:
    m = re.search(r"(\d{1,3})\s*%", text)
    if not m:
        return None
    val = int(m.group(1))
    return val if 0 <= val <= 100 else None


def _parse_iso_date(text: str) -> str | None:
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    return m.group(1) if m else None


def _derive_field_value(db: Session, entity_type: str, field_name: str, answer_text: str,
                         row: object | None) -> str | None:
    key = (entity_type, field_name)
    if key in ENUM_CLASSIFIERS:
        return CLASSIFIERS[ENUM_CLASSIFIERS[key]](answer_text)

    if field_name == "owner_id":
        owner = _resolve_owner_by_name(db, answer_text)
        return str(owner.id) if owner else None

    if field_name == "completion_pct":
        pct = _parse_percentage(answer_text)
        return str(pct) if pct is not None else None

    if field_name in ("target_date", "start_date"):
        return _parse_iso_date(answer_text)

    # everything else in ENTITY_FIELDS is a direct plain-text copy
    value = answer_text.strip()
    return value or None


NOTE_APPEND_FIELDS = {"notes", "blocker", "description", "applicability_reason"}


def _derive_notes_style_value(row: object | None, field_name: str, question: models.QuestionnaireQuestion,
                               answer_text: str) -> tuple[str | None, str | None]:
    """Returns (current_value, proposed_value) for an append-style text field.
    Appends a dated, demarcated block rather than overwriting, and is
    idempotent - skips (returns None proposed) if that exact block is
    already present."""
    answer_text = answer_text.strip()
    if not answer_text:
        return None, None
    current = getattr(row, field_name, "") if row else ""
    tag = f"[From questionnaire {question.question_id}, {date.today().isoformat()}]"
    block = f"{tag}: {answer_text}"
    if block in (current or ""):
        return current, None
    proposed = f"{current}\n\n{block}".strip() if current else block
    return (current or None), proposed


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def _target_key(entity_type: str, code: str | None, field_name: str, question_id: int, kca_code: str | None = None) -> str:
    if code is None and kca_code:
        return f"NEW_ACTION:{question_id}:{kca_code}:{field_name}"
    return f"{entity_type}:{code}:{field_name}"


def compute_suggestions(db: Session, response: models.QuestionnaireResponse) -> list[Suggestion]:
    question = response.question
    if question is None:
        question = db.get(models.QuestionnaireQuestion, response.question_id)
    if question is None or not response.answer_text.strip():
        return []

    applied_rows = db.scalars(
        select(models.QuestionnaireAppliedUpdate)
        .where(models.QuestionnaireAppliedUpdate.response_id == response.id)
        .order_by(models.QuestionnaireAppliedUpdate.created_at.desc())
    ).all()
    applied_by_key: dict[str, models.QuestionnaireAppliedUpdate] = {}
    for row in applied_rows:
        applied_by_key.setdefault(row.target_key, row)

    suggestions: list[Suggestion] = []
    for target in parse_grc_fields(question.grc_fields, question):
        if target.new_action_kca_code:
            field_name = target.field_names[0] if target.field_names else "blocker"
            answer = response.answer_text.strip()
            if not answer:
                continue
            value = f"{question.topic}: {answer}" if question.topic else answer
            key = _target_key("Action", None, field_name, question.id, target.new_action_kca_code)
            applied = applied_by_key.get(key)
            already_applied = bool(applied and applied.applied_value == value)
            suggestions.append(Suggestion(
                target_key=key, entity_type="Action", entity_code=None, field_name=field_name,
                current_value=None, proposed_value=value, source_clause=target.raw_clause,
                already_applied=already_applied,
                already_applied_value=applied.applied_value if applied else None,
                already_applied_at=applied.created_at if applied else None,
                requires_extra_input=True,
            ))
            continue

        for code, row in resolve_targets(db, target, question, response):
            for field_name in target.field_names:
                if field_name in NOTE_APPEND_FIELDS and row is not None:
                    current, proposed = _derive_notes_style_value(row, field_name, question, response.answer_text)
                else:
                    proposed = _derive_field_value(db, target.entity_type, field_name, response.answer_text, row)
                    current = str(getattr(row, field_name, "")) if row is not None and getattr(row, field_name, None) is not None else None
                if proposed is None:
                    continue
                if row is not None and current == proposed:
                    continue

                key = _target_key(target.entity_type, code, field_name, question.id)
                applied = applied_by_key.get(key)
                already_applied = bool(applied and applied.applied_value == proposed)
                suggestions.append(Suggestion(
                    target_key=key, entity_type=target.entity_type, entity_code=code,
                    field_name=field_name, current_value=current, proposed_value=proposed,
                    source_clause=target.raw_clause, already_applied=already_applied,
                    already_applied_value=applied.applied_value if applied else None,
                    already_applied_at=applied.created_at if applied else None,
                ))

    return suggestions


def _next_action_code(db: Session, kca: models.KCA) -> str:
    existing = db.scalars(select(models.Action.action_id).where(models.Action.kca_id == kca.id)).all()
    prefix_counts: dict[str, int] = {}
    max_num: dict[str, int] = {}
    for aid in existing:
        m = re.match(r"^ACT-([A-Z]+)-(\d+)$", aid)
        if m:
            prefix, num = m.group(1), int(m.group(2))
            prefix_counts[prefix] = prefix_counts.get(prefix, 0) + 1
            max_num[prefix] = max(max_num.get(prefix, 0), num)
    if prefix_counts:
        prefix = max(prefix_counts, key=lambda p: prefix_counts[p])
        next_num = max_num[prefix] + 1
    else:
        prefix = kca.code.replace("KCA-", "K")
        next_num = 1
    return f"ACT-{prefix}-{next_num:03d}"


def apply_one(db: Session, response: models.QuestionnaireResponse, item: schemas.ApplySuggestionItem) -> tuple[int, str]:
    if item.entity_type == "Control":
        control = db.scalars(select(models.Control).where(models.Control.control_id == item.entity_code)).first()
        if not control:
            raise ValueError(f"Control {item.entity_code} not found")
        updated = controls_router.update_control(control.id, schemas.ControlUpdate(**{item.field_name: item.proposed_value}), db)
        return updated.id, f"Updated Control {item.entity_code}.{item.field_name}"

    if item.entity_type == "Action":
        if item.entity_code is None:
            if item.owner_id is None or item.target_date is None:
                raise ValueError("Owner and target date are required to create a new Action.")
            kca_code = item.target_key.split(":")[2]
            kca = db.scalars(select(models.KCA).where(models.KCA.code == kca_code)).first()
            if not kca:
                raise ValueError(f"KCA {kca_code} not found")

            existing_journal = db.scalars(
                select(models.QuestionnaireAppliedUpdate)
                .where(models.QuestionnaireAppliedUpdate.target_key == item.target_key,
                       models.QuestionnaireAppliedUpdate.entity_id.is_not(None))
            ).first()
            if existing_journal:
                action = db.get(models.Action, existing_journal.entity_id)
                if action:
                    updated = actions_router.update_action(action.id, schemas.ActionUpdate(**{item.field_name: item.proposed_value}), db)
                    return updated.id, f"Updated existing Action {updated.action_id}"

            action_id_code = _next_action_code(db, kca)
            payload = schemas.ActionCreate(
                action_id=action_id_code,
                name=f"Gap from questionnaire {response.question.question_id if response.question else ''}: {kca_code}",
                kca_id=kca.id, owner_id=item.owner_id, target_date=item.target_date,
                **{item.field_name: item.proposed_value},
            )
            created = actions_router.create_action(payload, db)
            return created.id, f"Created new Action {created.action_id}"

        action = db.scalars(select(models.Action).where(models.Action.action_id == item.entity_code)).first()
        if not action:
            raise ValueError(f"Action {item.entity_code} not found")
        updated = actions_router.update_action(action.id, schemas.ActionUpdate(**{item.field_name: item.proposed_value}), db)
        return updated.id, f"Updated Action {item.entity_code}.{item.field_name}"

    if item.entity_type == "LegalRequirement":
        req = db.scalars(select(models.LegalRequirement).where(models.LegalRequirement.requirement_id == item.entity_code)).first()
        if not req:
            raise ValueError(f"Requirement {item.entity_code} not found")
        updated = requirements_router.update_requirement(req.id, schemas.LegalRequirementUpdate(**{item.field_name: item.proposed_value}), db)
        return updated.id, f"Updated Requirement {item.entity_code}.{item.field_name}"

    if item.entity_type == "Owner":
        owner = db.get(models.Owner, int(item.entity_code)) if item.entity_code else None
        if not owner:
            raise ValueError("Owner not found")
        updated = owners_router.update_owner(owner.id, schemas.OwnerUpdate(**{item.field_name: item.proposed_value}), db)
        return updated.id, f"Updated Owner.{item.field_name}"

    if item.entity_type == "Application":
        app_ = db.get(models.Application, int(item.entity_code)) if item.entity_code else None
        if not app_:
            raise ValueError("Application not found")
        updated = applications_router.update_application(app_.id, schemas.ApplicationUpdate(**{item.field_name: item.proposed_value}), db)
        return updated.id, f"Updated Application.{item.field_name}"

    raise ValueError(f"Unsupported entity_type: {item.entity_type}")
