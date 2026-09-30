from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/actions", tags=["Actions"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.ActionRead])
def list_actions(
    db: Session = Depends(get_db),
    kca_id: int | None = None,
    control_id: int | None = None,
    application_id: int | None = None,
    owner_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    due: str | None = None,  # "overdue" | "7" | "30"
):
    stmt = select(models.Action)
    if kca_id:
        stmt = stmt.where(models.Action.kca_id == kca_id)
    if control_id:
        stmt = stmt.where(models.Action.control_id == control_id)
    if application_id:
        stmt = stmt.where(models.Action.application_id == application_id)
    if owner_id:
        stmt = stmt.where(models.Action.owner_id == owner_id)
    if status:
        stmt = stmt.where(models.Action.status == status)
    if priority:
        stmt = stmt.where(models.Action.priority == priority)

    rows = db.scalars(stmt.order_by(models.Action.action_id)).all()

    if due:
        today = date.today()
        if due == "overdue":
            rows = [a for a in rows if a.target_date and a.target_date < today and a.status not in ("COMPLETED", "CANCELLED")]
        elif due == "7":
            horizon = today + timedelta(days=7)
            rows = [a for a in rows if a.target_date and today <= a.target_date <= horizon and a.status not in ("COMPLETED", "CANCELLED")]
        elif due == "30":
            horizon = today + timedelta(days=30)
            rows = [a for a in rows if a.target_date and today <= a.target_date <= horizon and a.status not in ("COMPLETED", "CANCELLED")]
    return rows


@router.post("", response_model=schemas.ActionRead)
def create_action(payload: schemas.ActionCreate, db: Session = Depends(get_db)):
    if payload.status == "COMPLETED":
        raise HTTPException(400, "Cannot create an action as COMPLETED without at least one linked Evidence record - link evidence first.")
    action = models.Action(**payload.model_dump())
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.get("/{action_id}", response_model=schemas.ActionRead)
def get_action(action_id: int, db: Session = Depends(get_db)):
    action = db.get(models.Action, action_id)
    if not action:
        raise HTTPException(404, "Action not found")
    return action


@router.put("/{action_id}", response_model=schemas.ActionRead)
def update_action(action_id: int, payload: schemas.ActionUpdate, db: Session = Depends(get_db)):
    action = db.get(models.Action, action_id)
    if not action:
        raise HTTPException(404, "Action not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("status") == "COMPLETED" and action.status != "COMPLETED" and not action.evidence:
        raise HTTPException(400, "Cannot mark this action COMPLETED without at least one linked Evidence record - link evidence first.")
    for k, v in data.items():
        setattr(action, k, v)
    db.commit()
    db.refresh(action)
    return action


@router.delete("/{action_id}")
def delete_action(action_id: int, db: Session = Depends(get_db)):
    action = db.get(models.Action, action_id)
    if not action:
        raise HTTPException(404, "Action not found")
    db.delete(action)
    db.commit()
    return {"ok": True}
