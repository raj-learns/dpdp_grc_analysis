from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import constants, seed_data
from ..auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["Settings"], dependencies=[Depends(get_current_user)])


@router.get("/options")
def get_options():
    """All fixed vocabularies the frontend needs for dropdowns/filters/legends."""
    return {
        "source_types": constants.SOURCE_TYPES,
        "deadline_phases": constants.DEADLINE_PHASES,
        "applicability": constants.APPLICABILITY,
        "control_statuses": constants.CONTROL_STATUSES,
        "control_complete_statuses": constants.CONTROL_COMPLETE_STATUSES,
        "action_statuses": constants.ACTION_STATUSES,
        "priorities": constants.PRIORITIES,
        "evidence_types": constants.EVIDENCE_TYPES,
        "verification_statuses": constants.VERIFICATION_STATUSES,
        "consent_integration_statuses": constants.CONSENT_INTEGRATION_STATUSES,
        "application_assessment_statuses": constants.APPLICATION_ASSESSMENT_STATUSES,
        "environments": constants.ENVIRONMENTS,
        "questionnaire_sections": constants.QUESTIONNAIRE_SECTIONS,
        "response_confidence": constants.RESPONSE_CONFIDENCE,
        "gazette_date": constants.GAZETTE_DATE,
        "twelve_month_date": constants.TWELVE_MONTH_DATE,
        "eighteen_month_date": constants.EIGHTEEN_MONTH_DATE,
    }


@router.post("/reset-demo-data")
def reset_demo_data(confirm: bool = False, db: Session = Depends(get_db)):
    """Wipes ALL data and reseeds the reference/demo dataset. Requires ?confirm=true."""
    if not confirm:
        return {"ok": False, "message": "Pass ?confirm=true to actually wipe and reseed all data."}
    seed_data.wipe_all(db)
    seed_data.seed(db, force=True)
    seed_data.seed_questionnaire(db, force=True)
    return {"ok": True, "message": "Demo data reset."}
