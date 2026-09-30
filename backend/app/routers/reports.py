import csv
import io
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models
from ..database import get_db
from ..compliance import overall_summary, kca_scorecard, gap_analysis, phase_scope, summarize_actions
from ..auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"], dependencies=[Depends(get_current_user)])


@router.get("/management")
def management_report(db: Session = Depends(get_db)):
    overall = overall_summary(db)
    scorecard = kca_scorecard(db)
    gaps = gap_analysis(db)[:5]
    november = phase_scope(db, "TWELVE_MONTH")["summary"]
    may2027 = phase_scope(db, "EIGHTEEN_MONTH")["summary"]

    consent_kca = next((k for k in scorecard if k["kca_code"] == "KCA-04"), None)

    applications = db.scalars(select(models.Application)).all()
    application_status = [{
        "name": a.name,
        "environment": a.environment,
        "consent_integration_status": a.consent_integration_status,
        "dpdp_assessment_status": a.dpdp_assessment_status,
    } for a in applications]

    critical_actions = db.scalars(
        select(models.Action).where(
            models.Action.priority == "CRITICAL",
            models.Action.status.notin_(["COMPLETED", "CANCELLED"]),
        )
    ).all()

    all_actions = db.scalars(select(models.Action)).all()

    return {
        "as_of": datetime.utcnow().isoformat(),
        "overall_compliance": overall,
        "kca_summary": scorecard,
        "action_status_breakdown": summarize_actions(all_actions),
        "top_gaps": gaps,
        "november_2026_readiness": november,
        "may_2027_readiness": may2027,
        "consent_management": consent_kca,
        "critical_actions": [
            {"action_id": a.action_id, "name": a.name, "owner": a.owner.name if a.owner else None,
             "target_date": a.target_date.isoformat() if a.target_date else None, "status": a.status}
            for a in critical_actions
        ],
        "application_status": application_status,
        "disclaimer": (
            "Internal compliance assessment framework. This tool does not constitute "
            "legal advice. Statutory applicability should be validated with the "
            "organisation's legal/compliance function."
        ),
    }


def _csv_response(rows: list[dict], filename: str):
    if not rows:
        output = io.StringIO()
        output.write("")
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _serialize(v):
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


@router.get("/export/requirements.csv")
def export_requirements(db: Session = Depends(get_db)):
    reqs = db.scalars(select(models.LegalRequirement)).all()
    rows = [{
        "requirement_id": r.requirement_id, "title": r.title, "source_type": r.source_type,
        "section_reference": r.section_reference, "kca": r.kca.code if r.kca else "",
        "deadline_phase": r.deadline_phase, "applicability": r.applicability,
        "applicability_reason": r.applicability_reason, "source_url": r.source_url,
    } for r in reqs]
    return _csv_response(rows, "requirements.csv")


@router.get("/export/controls.csv")
def export_controls(db: Session = Depends(get_db)):
    controls = db.scalars(select(models.Control)).all()
    rows = [{
        "control_id": c.control_id, "name": c.name, "kca": c.kca.code if c.kca else "",
        "applicability": c.applicability, "status": c.status, "priority": c.priority,
        "completion_pct": c.completion_pct, "deadline_phase": c.deadline_phase,
        "owner": c.owner.name if c.owner else "", "target_date": _serialize(c.target_date),
        "linked_requirements": "; ".join(r.requirement_id for r in c.requirements),
    } for c in controls]
    return _csv_response(rows, "controls.csv")


@router.get("/export/actions.csv")
def export_actions(db: Session = Depends(get_db)):
    actions = db.scalars(select(models.Action)).all()
    rows = [{
        "action_id": a.action_id, "name": a.name, "kca": a.kca.code if a.kca else "",
        "control": a.control.control_id if a.control else "",
        "application": a.application.name if a.application else "",
        "owner": a.owner.name if a.owner else "", "owner_person": a.owner_person,
        "priority": a.priority, "status": a.status,
        "completion_pct": a.completion_pct, "target_date": _serialize(a.target_date),
        "blocker": a.blocker,
    } for a in actions]
    return _csv_response(rows, "actions.csv")


@router.get("/export/evidence.csv")
def export_evidence(db: Session = Depends(get_db)):
    evidence = db.scalars(select(models.Evidence)).all()
    rows = [{
        "evidence_id": e.evidence_id, "name": e.name, "evidence_type": e.evidence_type,
        "application": e.application.name if e.application else "",
        "verification_status": e.verification_status, "date": _serialize(e.date),
        "owner": e.owner.name if e.owner else "",
        "linked_controls": "; ".join(c.control_id for c in e.controls),
    } for e in evidence]
    return _csv_response(rows, "evidence.csv")


@router.get("/export/gaps.csv")
def export_gaps(db: Session = Depends(get_db)):
    rows = gap_analysis(db)
    rows = [{**r, "affected_applications": "; ".join(r["affected_applications"])} for r in rows]
    return _csv_response(rows, "gap_analysis.csv")
