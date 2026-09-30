import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import constants, models, schemas
from ..database import BASE_DIR, get_db
from ..compliance import evidence_coverage
from ..auth import get_current_user

router = APIRouter(prefix="/api/evidence", tags=["Evidence"], dependencies=[Depends(get_current_user)])

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")


@router.post("/upload")
async def upload_evidence_file(file: UploadFile = File(...)):
    """Save an uploaded evidence file to local disk, return a served URL for
    use as Evidence.file_url. Standalone - does not create an Evidence row."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in constants.EVIDENCE_UPLOAD_EXTENSIONS:
        raise HTTPException(
            400,
            f"File type '{ext or 'unknown'}' is not allowed. "
            f"Allowed: {', '.join(constants.EVIDENCE_UPLOAD_EXTENSIONS)}",
        )

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, safe_name)

    size = 0
    with open(dest_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > constants.EVIDENCE_UPLOAD_MAX_BYTES:
                out.close()
                os.remove(dest_path)
                raise HTTPException(
                    400,
                    f"File exceeds the {constants.EVIDENCE_UPLOAD_MAX_BYTES // (1024 * 1024)}MB limit.",
                )
            out.write(chunk)

    return {"file_url": f"/api/uploads/{safe_name}", "original_name": file.filename}


@router.get("", response_model=list[schemas.EvidenceRead])
def list_evidence(
    db: Session = Depends(get_db),
    application_id: int | None = None,
    evidence_type: str | None = None,
    verification_status: str | None = None,
    control_id: int | None = None,
):
    stmt = select(models.Evidence)
    if application_id:
        stmt = stmt.where(models.Evidence.application_id == application_id)
    if evidence_type:
        stmt = stmt.where(models.Evidence.evidence_type == evidence_type)
    if verification_status:
        stmt = stmt.where(models.Evidence.verification_status == verification_status)
    rows = db.scalars(stmt.order_by(models.Evidence.evidence_id)).all()
    if control_id:
        rows = [e for e in rows if any(c.id == control_id for c in e.controls)]
    return rows


@router.get("/coverage")
def get_evidence_coverage(db: Session = Depends(get_db)):
    return evidence_coverage(db)


def _apply_links(db: Session, evidence: models.Evidence, control_ids, action_ids):
    if control_ids is not None:
        evidence.controls = db.scalars(select(models.Control).where(models.Control.id.in_(control_ids))).all()
    if action_ids is not None:
        evidence.actions = db.scalars(select(models.Action).where(models.Action.id.in_(action_ids))).all()


@router.post("", response_model=schemas.EvidenceRead)
def create_evidence(payload: schemas.EvidenceCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"control_ids", "action_ids"})
    evidence = models.Evidence(**data)
    db.add(evidence)
    db.flush()
    _apply_links(db, evidence, payload.control_ids, payload.action_ids)
    db.commit()
    db.refresh(evidence)
    return evidence


@router.get("/{evidence_id}", response_model=schemas.EvidenceRead)
def get_evidence(evidence_id: int, db: Session = Depends(get_db)):
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(404, "Evidence not found")
    return evidence


@router.put("/{evidence_id}", response_model=schemas.EvidenceRead)
def update_evidence(evidence_id: int, payload: schemas.EvidenceUpdate, db: Session = Depends(get_db)):
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(404, "Evidence not found")
    data = payload.model_dump(exclude_unset=True, exclude={"control_ids", "action_ids"})
    for k, v in data.items():
        setattr(evidence, k, v)
    _apply_links(db, evidence, payload.control_ids, payload.action_ids)
    db.commit()
    db.refresh(evidence)
    return evidence


@router.delete("/{evidence_id}")
def delete_evidence(evidence_id: int, db: Session = Depends(get_db)):
    evidence = db.get(models.Evidence, evidence_id)
    if not evidence:
        raise HTTPException(404, "Evidence not found")
    db.delete(evidence)
    db.commit()
    return {"ok": True}
