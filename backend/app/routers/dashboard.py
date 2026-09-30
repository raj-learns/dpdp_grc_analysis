from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models
from ..database import get_db
from ..compliance import overall_summary, kca_scorecard, summarize_controls, summarize_actions
from ..constants import DEADLINE_PHASES, GAZETTE_DATE, TWELVE_MONTH_DATE, EIGHTEEN_MONTH_DATE
from ..auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_user)])


@router.get("")
def get_dashboard(db: Session = Depends(get_db)):
    controls = db.scalars(select(models.Control)).all()
    actions = db.scalars(select(models.Action)).all()
    applications = db.scalars(select(models.Application)).all()

    by_phase = []
    for phase in DEADLINE_PHASES:
        phase_controls = [c for c in controls if c.deadline_phase == phase]
        if not phase_controls:
            continue
        by_phase.append({"phase": phase, **summarize_controls(phase_controls)})

    by_application = []
    for app_ in applications:
        app_actions = [a for a in actions if a.application_id == app_.id]
        by_application.append({
            "application": app_.name,
            "consent_integration_status": app_.consent_integration_status,
            "dpdp_assessment_status": app_.dpdp_assessment_status,
            **summarize_actions(app_actions),
        })

    today = date.today()
    horizon = today + timedelta(days=30)
    upcoming = sorted(
        [a for a in actions if a.target_date and today <= a.target_date <= horizon and a.status not in ("COMPLETED", "CANCELLED")],
        key=lambda a: a.target_date,
    )
    overdue = sorted(
        [a for a in actions if a.target_date and a.target_date < today and a.status not in ("COMPLETED", "CANCELLED")],
        key=lambda a: a.target_date,
    )

    def _action_brief(a):
        return {
            "action_id": a.action_id, "name": a.name, "target_date": a.target_date.isoformat() if a.target_date else None,
            "status": a.status, "priority": a.priority, "owner": a.owner.name if a.owner else None,
        }

    action_status_breakdown = summarize_actions(actions)

    return {
        "overall": overall_summary(db),
        "kca_scorecard": kca_scorecard(db),
        "action_status_breakdown": action_status_breakdown,
        "compliance_by_deadline_phase": by_phase,
        "compliance_by_application": by_application,
        "overdue_actions": [_action_brief(a) for a in overdue],
        "upcoming_deadlines": [_action_brief(a) for a in upcoming],
        "readiness_timeline": {
            "gazette_date": GAZETTE_DATE,
            "twelve_month_date": TWELVE_MONTH_DATE,
            "eighteen_month_date": EIGHTEEN_MONTH_DATE,
        },
        "last_updated": db.scalar(select(models.Control.updated_at).order_by(models.Control.updated_at.desc())),
    }
