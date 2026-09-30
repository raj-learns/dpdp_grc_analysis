"""
Compliance calculation engine.

This is the single source of truth for every percentage shown in the UI.
Nothing here is hardcoded - every number is derived from Control /
Action / Evidence rows read from the database at request time.

Golden rule (per spec):
    KCA / Overall compliance % = applicable controls with status
    IMPLEMENTED or EVIDENCE_VERIFIED / total APPLICABLE controls.
    NOT_APPLICABLE and TO_BE_DETERMINED controls are never counted in
    the denominator - they are reported separately.
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import select
from . import models
from .constants import CONTROL_COMPLETE_STATUSES, TWELVE_MONTH_DATE, EIGHTEEN_MONTH_DATE


def _pct(numerator: int, denominator: int) -> float | None:
    if denominator == 0:
        return None
    return round(numerator * 100.0 / denominator, 1)


def summarize_controls(controls: list[models.Control]) -> dict:
    """Roll up a list of Control rows into the standard scorecard shape."""
    applicable = [c for c in controls if c.applicability == "APPLICABLE"]
    not_applicable = [c for c in controls if c.applicability == "NOT_APPLICABLE"]
    tbd = [c for c in controls if c.applicability == "TO_BE_DETERMINED"]

    implemented = [c for c in applicable if c.status in CONTROL_COMPLETE_STATUSES]
    in_progress = [c for c in applicable if c.status == "IN_PROGRESS"]
    not_started = [c for c in applicable if c.status in ("NOT_STARTED", "GAP_IDENTIFIED")]
    gap_identified = [c for c in applicable if c.status == "GAP_IDENTIFIED"]

    return {
        "total_controls": len(controls),
        "applicable_controls": len(applicable),
        "implemented": len(implemented),
        "in_progress": len(in_progress),
        "not_started": len(not_started),
        "gap_identified": len(gap_identified),
        "not_applicable": len(not_applicable),
        "to_be_determined": len(tbd),
        "compliance_pct": _pct(len(implemented), len(applicable)),
    }


def summarize_actions(actions: list[models.Action]) -> dict:
    active = [a for a in actions if a.status != "CANCELLED"]
    completed = [a for a in active if a.status == "COMPLETED"]
    in_progress = [a for a in active if a.status == "IN_PROGRESS"]
    blocked = [a for a in active if a.status == "BLOCKED"]
    not_started = [a for a in active if a.status == "NOT_STARTED"]
    today = date.today()
    overdue = [a for a in active if a.target_date and a.target_date < today and a.status != "COMPLETED"]
    return {
        "total_actions": len(active),
        "completed": len(completed),
        "in_progress": len(in_progress),
        "blocked": len(blocked),
        "not_started": len(not_started),
        "overdue": len(overdue),
        "completion_pct": _pct(len(completed), len(active)),
    }


def kca_scorecard(db: Session) -> list[dict]:
    kcas = db.scalars(select(models.KCA).order_by(models.KCA.sort_order)).all()
    rows = []
    for kca in kcas:
        controls = db.scalars(select(models.Control).where(models.Control.kca_id == kca.id)).all()
        summary = summarize_controls(controls)
        critical_open_actions = db.scalars(
            select(models.Action).where(
                models.Action.kca_id == kca.id,
                models.Action.priority == "CRITICAL",
                models.Action.status.in_(["NOT_STARTED", "IN_PROGRESS", "BLOCKED"]),
            )
        ).all()
        rows.append({
            "kca_id": kca.id,
            "kca_code": kca.code,
            "kca_name": kca.name,
            **summary,
            "critical_open_actions": len(critical_open_actions),
        })
    return rows


def overall_summary(db: Session) -> dict:
    controls = db.scalars(select(models.Control)).all()
    actions = db.scalars(select(models.Action)).all()
    summary = summarize_controls(controls)
    action_summary = summarize_actions(actions)

    today = date.today()
    overdue_actions = [
        a for a in actions
        if a.target_date and a.target_date < today and a.status not in ("COMPLETED", "CANCELLED")
    ]
    critical_actions = [
        a for a in actions
        if a.priority == "CRITICAL" and a.status not in ("COMPLETED", "CANCELLED")
    ]
    open_gaps = [
        c for c in controls
        if c.applicability == "APPLICABLE" and c.status in ("NOT_STARTED", "GAP_IDENTIFIED")
    ]

    nov_controls = [c for c in controls if c.deadline_phase == "TWELVE_MONTH"]
    may_controls = [c for c in controls if c.deadline_phase == "EIGHTEEN_MONTH"]

    return {
        **summary,
        "action_completion_pct": action_summary["completion_pct"],
        "actions_completed": action_summary["completed"],
        "actions_total": action_summary["total_actions"],
        "open_gaps": len(open_gaps),
        "critical_actions": len(critical_actions),
        "overdue_actions": len(overdue_actions),
        "november_2026_scope_pct": summarize_controls(nov_controls)["compliance_pct"],
        "may_2027_scope_pct": summarize_controls(may_controls)["compliance_pct"],
    }


def evidence_coverage(db: Session) -> dict:
    controls = db.scalars(select(models.Control)).all()
    implemented = [c for c in controls if c.status in CONTROL_COMPLETE_STATUSES]
    with_verified_evidence = [
        c for c in implemented
        if any(e.verification_status == "VERIFIED" for e in c.evidence)
    ]
    return {
        "implemented_controls": len(implemented),
        "controls_with_verified_evidence": len(with_verified_evidence),
        "coverage_pct": _pct(len(with_verified_evidence), len(implemented)),
    }


def _requirement_row(req: models.LegalRequirement) -> dict:
    controls = req.controls
    summary = summarize_controls(controls)
    all_actions = [a for c in controls for a in c.actions]
    evidence_count = sum(len(c.evidence) for c in controls) + len(req.evidence)
    return {
        "requirement_id": req.requirement_id,
        "title": req.title,
        "section_reference": req.section_reference,
        "source_type": req.source_type,
        "source_url": req.source_url,
        "kca_code": req.kca.code if req.kca else None,
        "kca_name": req.kca.name if req.kca else None,
        "applicability": req.applicability,
        "applicability_reason": req.applicability_reason,
        "deadline_phase": req.deadline_phase,
        "controls_count": len(controls),
        "control_ids": [c.control_id for c in controls],
        "actions_count": len(all_actions),
        "evidence_count": evidence_count,
        "compliance_pct": summary["compliance_pct"],
        "status_breakdown": summary,
    }


def phase_scope(db: Session, phase: str) -> dict:
    """Statutory scope (Section A style) for a given deadline_phase."""
    requirements = db.scalars(
        select(models.LegalRequirement).where(models.LegalRequirement.deadline_phase == phase)
    ).all()

    applicable_reqs = [r for r in requirements if r.applicability == "APPLICABLE"]
    tbd_reqs = [r for r in requirements if r.applicability == "TO_BE_DETERMINED"]
    not_applicable_reqs = [r for r in requirements if r.applicability == "NOT_APPLICABLE"]

    controls_involved = {c.id: c for r in applicable_reqs for c in r.controls}
    summary = summarize_controls(list(controls_involved.values()))

    by_kca: dict[int, list[dict]] = {}
    for r in applicable_reqs:
        by_kca.setdefault(r.kca_id, []).append(_requirement_row(r))

    kca_groups = []
    for kca_id, rows in by_kca.items():
        kca = db.get(models.KCA, kca_id)
        kca_controls = {c.id: c for row_req in [r for r in applicable_reqs if r.kca_id == kca_id] for c in row_req.controls}
        kca_groups.append({
            "kca_code": kca.code,
            "kca_name": kca.name,
            "requirements": rows,
            "summary": summarize_controls(list(kca_controls.values())),
        })
    kca_groups.sort(key=lambda g: g["kca_code"])

    return {
        "phase": phase,
        "applicable_requirements": [_requirement_row(r) for r in applicable_reqs],
        "to_be_determined_requirements": [_requirement_row(r) for r in tbd_reqs],
        "not_applicable_requirements": [_requirement_row(r) for r in not_applicable_reqs],
        "kca_groups": kca_groups,
        "summary": summary,
    }


def november_readiness(db: Session) -> dict:
    scope = phase_scope(db, "TWELVE_MONTH")

    # Section B: internal readiness actions targeted before the 12-month date,
    # regardless of whether they trace to a strictly-statutory Nov control.
    # This is an internal operational view, not a statutory one.
    target = date.fromisoformat(TWELVE_MONTH_DATE)
    all_actions = db.scalars(select(models.Action)).all()
    readiness_actions = [a for a in all_actions if a.target_date and a.target_date <= target]
    action_summary = summarize_actions(readiness_actions)

    scope["internal_readiness_actions"] = [
        {
            "action_id": a.action_id,
            "name": a.name,
            "kca_code": a.kca.code if a.kca else None,
            "application": a.application.name if a.application else None,
            "owner": a.owner.name if a.owner else None,
            "status": a.status,
            "completion_pct": a.completion_pct,
            "target_date": a.target_date.isoformat() if a.target_date else None,
        }
        for a in readiness_actions
    ]
    scope["internal_readiness_summary"] = action_summary
    scope["statutory_date"] = TWELVE_MONTH_DATE
    return scope


def may2027_readiness(db: Session) -> dict:
    scope = phase_scope(db, "EIGHTEEN_MONTH")
    scope["statutory_date"] = EIGHTEEN_MONTH_DATE
    return scope


_PRIORITY_RANK = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
_PHASE_RANK = {"TWELVE_MONTH": 0, "ALREADY_EFFECTIVE": 1, "EIGHTEEN_MONTH": 2, "CONDITIONAL": 3, "ONGOING": 4}


def gap_analysis(db: Session) -> list[dict]:
    controls = db.scalars(
        select(models.Control).where(
            models.Control.applicability == "APPLICABLE",
            models.Control.status.in_(["GAP_IDENTIFIED", "NOT_STARTED"]),
        )
    ).all()

    rows = []
    for c in controls:
        affected_apps = sorted({a.application.name for a in c.actions if a.application})
        legal_refs = sorted({r.section_reference for r in c.requirements if r.section_reference})
        rows.append({
            "control_id": c.control_id,
            "gap": c.name,
            "kca_code": c.kca.code if c.kca else None,
            "kca_name": c.kca.name if c.kca else None,
            "legal_reference": ", ".join(legal_refs) if legal_refs else "Internal control (no direct statutory link)",
            "affected_applications": affected_apps,
            "severity": c.priority,
            "owner": c.owner.name if c.owner else "Unassigned",
            "target_date": c.target_date.isoformat() if c.target_date else None,
            "status": c.status,
            "deadline_phase": c.deadline_phase,
        })

    rows.sort(key=lambda r: (
        _PRIORITY_RANK.get(r["severity"], 9),
        _PHASE_RANK.get(r["deadline_phase"], 9),
        r["target_date"] or "9999-12-31",
    ))
    return rows
