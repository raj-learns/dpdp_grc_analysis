from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/controls", tags=["Controls"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.ControlRead])
def list_controls(
    db: Session = Depends(get_db),
    kca_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    applicability: str | None = None,
    deadline_phase: str | None = None,
    owner_id: int | None = None,
):
    stmt = select(models.Control)
    if kca_id:
        stmt = stmt.where(models.Control.kca_id == kca_id)
    if status:
        stmt = stmt.where(models.Control.status == status)
    if priority:
        stmt = stmt.where(models.Control.priority == priority)
    if applicability:
        stmt = stmt.where(models.Control.applicability == applicability)
    if deadline_phase:
        stmt = stmt.where(models.Control.deadline_phase == deadline_phase)
    if owner_id:
        stmt = stmt.where(models.Control.owner_id == owner_id)
    return db.scalars(stmt.order_by(models.Control.control_id)).all()


def _apply_requirement_links(db: Session, control: models.Control, requirement_ids: list[int] | None):
    if requirement_ids is not None:
        reqs = db.scalars(select(models.LegalRequirement).where(models.LegalRequirement.id.in_(requirement_ids))).all()
        control.requirements = reqs


@router.post("", response_model=schemas.ControlRead)
def create_control(payload: schemas.ControlCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"requirement_ids"})
    control = models.Control(**data)
    db.add(control)
    db.flush()
    _apply_requirement_links(db, control, payload.requirement_ids)
    db.commit()
    db.refresh(control)
    return control


@router.get("/{control_id}", response_model=schemas.ControlRead)
def get_control(control_id: int, db: Session = Depends(get_db)):
    control = db.get(models.Control, control_id)
    if not control:
        raise HTTPException(404, "Control not found")
    return control


@router.put("/{control_id}", response_model=schemas.ControlRead)
def update_control(control_id: int, payload: schemas.ControlUpdate, db: Session = Depends(get_db)):
    control = db.get(models.Control, control_id)
    if not control:
        raise HTTPException(404, "Control not found")
    data = payload.model_dump(exclude_unset=True, exclude={"requirement_ids"})
    for k, v in data.items():
        setattr(control, k, v)
    _apply_requirement_links(db, control, payload.requirement_ids)
    db.commit()
    db.refresh(control)
    return control


@router.delete("/{control_id}")
def delete_control(control_id: int, db: Session = Depends(get_db)):
    control = db.get(models.Control, control_id)
    if not control:
        raise HTTPException(404, "Control not found")
    db.delete(control)
    db.commit()
    return {"ok": True}
