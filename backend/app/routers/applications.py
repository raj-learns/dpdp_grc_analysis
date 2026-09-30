from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..compliance import summarize_actions
from ..auth import get_current_user

router = APIRouter(prefix="/api/applications", tags=["Applications"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.ApplicationRead])
def list_applications(db: Session = Depends(get_db)):
    return db.scalars(select(models.Application).order_by(models.Application.name)).all()


@router.post("", response_model=schemas.ApplicationRead)
def create_application(payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    app_ = models.Application(**payload.model_dump())
    db.add(app_)
    db.commit()
    db.refresh(app_)
    return app_


@router.get("/{app_id}")
def get_application_detail(app_id: int, db: Session = Depends(get_db)):
    """Application drill-down: its actions, evidence, and a per-KCA action-completion
    breakdown. (Applications link to actions/evidence directly; controls are shared
    across applications so application-level *control* compliance is intentionally
    not asserted here - only the actions/evidence actually scoped to this app.)"""
    app_ = db.get(models.Application, app_id)
    if not app_:
        raise HTTPException(404, "Application not found")

    actions = db.scalars(select(models.Action).where(models.Action.application_id == app_id)).all()
    evidence = db.scalars(select(models.Evidence).where(models.Evidence.application_id == app_id)).all()

    by_kca: dict[int, list[models.Action]] = {}
    for a in actions:
        by_kca.setdefault(a.kca_id, []).append(a)

    kca_breakdown = []
    for kca_id, kactions in by_kca.items():
        kca = db.get(models.KCA, kca_id)
        kca_breakdown.append({
            "kca_code": kca.code,
            "kca_name": kca.name,
            **summarize_actions(kactions),
        })
    kca_breakdown.sort(key=lambda r: r["kca_code"])

    return {
        "application": schemas.ApplicationRead.model_validate(app_),
        "actions": [schemas.ActionRead.model_validate(a) for a in actions],
        "evidence": [schemas.EvidenceRead.model_validate(e) for e in evidence],
        "action_summary": summarize_actions(actions),
        "kca_breakdown": kca_breakdown,
    }


@router.put("/{app_id}", response_model=schemas.ApplicationRead)
def update_application(app_id: int, payload: schemas.ApplicationUpdate, db: Session = Depends(get_db)):
    app_ = db.get(models.Application, app_id)
    if not app_:
        raise HTTPException(404, "Application not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(app_, k, v)
    db.commit()
    db.refresh(app_)
    return app_


@router.delete("/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    app_ = db.get(models.Application, app_id)
    if not app_:
        raise HTTPException(404, "Application not found")
    db.delete(app_)
    db.commit()
    return {"ok": True}
