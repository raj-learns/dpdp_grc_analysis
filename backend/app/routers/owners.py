from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/owners", tags=["Owners"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.OwnerRead])
def list_owners(db: Session = Depends(get_db)):
    return db.scalars(select(models.Owner).order_by(models.Owner.name)).all()


@router.post("", response_model=schemas.OwnerRead)
def create_owner(payload: schemas.OwnerCreate, db: Session = Depends(get_db)):
    owner = models.Owner(**payload.model_dump())
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


@router.put("/{owner_id}", response_model=schemas.OwnerRead)
def update_owner(owner_id: int, payload: schemas.OwnerUpdate, db: Session = Depends(get_db)):
    owner = db.get(models.Owner, owner_id)
    if not owner:
        raise HTTPException(404, "Owner not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(owner, k, v)
    db.commit()
    db.refresh(owner)
    return owner


@router.delete("/{owner_id}")
def delete_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = db.get(models.Owner, owner_id)
    if not owner:
        raise HTTPException(404, "Owner not found")
    db.delete(owner)
    db.commit()
    return {"ok": True}
