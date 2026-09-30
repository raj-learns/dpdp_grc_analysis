from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..compliance import _requirement_row
from ..auth import get_current_user

router = APIRouter(prefix="/api/requirements", tags=["Requirements"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.LegalRequirementRead])
def list_requirements(
    db: Session = Depends(get_db),
    kca_id: int | None = None,
    source_type: str | None = None,
    deadline_phase: str | None = None,
    applicability: str | None = None,
    q: str | None = Query(None, description="Search title/description/section reference"),
):
    stmt = select(models.LegalRequirement)
    if kca_id:
        stmt = stmt.where(models.LegalRequirement.kca_id == kca_id)
    if source_type:
        stmt = stmt.where(models.LegalRequirement.source_type == source_type)
    if deadline_phase:
        stmt = stmt.where(models.LegalRequirement.deadline_phase == deadline_phase)
    if applicability:
        stmt = stmt.where(models.LegalRequirement.applicability == applicability)
    rows = db.scalars(stmt.order_by(models.LegalRequirement.requirement_id)).all()
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in r.title.lower() or ql in r.description.lower() or ql in r.section_reference.lower()]
    return rows


@router.post("", response_model=schemas.LegalRequirementRead)
def create_requirement(payload: schemas.LegalRequirementCreate, db: Session = Depends(get_db)):
    req = models.LegalRequirement(**payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.get("/{req_id}")
def get_requirement_detail(req_id: int, db: Session = Depends(get_db)):
    """Full downward traceability: requirement -> controls -> actions -> evidence."""
    req = db.get(models.LegalRequirement, req_id)
    if not req:
        raise HTTPException(404, "Requirement not found")

    controls_out = []
    for c in req.controls:
        controls_out.append({
            "control": schemas.ControlRead.model_validate(c),
            "actions": [schemas.ActionRead.model_validate(a) for a in c.actions],
            "evidence": [schemas.EvidenceRead.model_validate(e) for e in c.evidence],
        })

    return {
        "requirement": schemas.LegalRequirementRead.model_validate(req),
        "summary_row": _requirement_row(req),
        "controls": controls_out,
        "direct_evidence": [schemas.EvidenceRead.model_validate(e) for e in req.evidence],
    }


@router.put("/{req_id}", response_model=schemas.LegalRequirementRead)
def update_requirement(req_id: int, payload: schemas.LegalRequirementUpdate, db: Session = Depends(get_db)):
    req = db.get(models.LegalRequirement, req_id)
    if not req:
        raise HTTPException(404, "Requirement not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(req, k, v)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/{req_id}")
def delete_requirement(req_id: int, db: Session = Depends(get_db)):
    req = db.get(models.LegalRequirement, req_id)
    if not req:
        raise HTTPException(404, "Requirement not found")
    db.delete(req)
    db.commit()
    return {"ok": True}
