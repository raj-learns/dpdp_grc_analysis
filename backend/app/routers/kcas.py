from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/api/kcas", tags=["KCAs"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.KCARead])
def list_kcas(db: Session = Depends(get_db)):
    return db.scalars(select(models.KCA).order_by(models.KCA.sort_order)).all()


@router.post("", response_model=schemas.KCARead)
def create_kca(payload: schemas.KCACreate, db: Session = Depends(get_db)):
    kca = models.KCA(**payload.model_dump())
    db.add(kca)
    db.commit()
    db.refresh(kca)
    return kca


@router.get("/{kca_id}", response_model=schemas.KCARead)
def get_kca(kca_id: int, db: Session = Depends(get_db)):
    kca = db.get(models.KCA, kca_id)
    if not kca:
        raise HTTPException(404, "KCA not found")
    return kca


@router.put("/{kca_id}", response_model=schemas.KCARead)
def update_kca(kca_id: int, payload: schemas.KCAUpdate, db: Session = Depends(get_db)):
    kca = db.get(models.KCA, kca_id)
    if not kca:
        raise HTTPException(404, "KCA not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(kca, k, v)
    db.commit()
    db.refresh(kca)
    return kca


@router.delete("/{kca_id}")
def delete_kca(kca_id: int, db: Session = Depends(get_db)):
    kca = db.get(models.KCA, kca_id)
    if not kca:
        raise HTTPException(404, "KCA not found")
    if kca.requirements or kca.controls or kca.actions:
        raise HTTPException(400, "Cannot delete a KCA that still has linked requirements, controls or actions")
    db.delete(kca)
    db.commit()
    return {"ok": True}
