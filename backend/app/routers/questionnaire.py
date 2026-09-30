from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from .. import questionnaire_automation as qa
from ..auth import get_current_user

router = APIRouter(prefix="/api/questionnaire", tags=["Questionnaire"], dependencies=[Depends(get_current_user)])


@router.get("/questions", response_model=list[schemas.QuestionnaireQuestionRead])
def list_questions(
    db: Session = Depends(get_db),
    section: str | None = None,
    kca_id: int | None = None,
):
    stmt = select(models.QuestionnaireQuestion)
    if section:
        stmt = stmt.where(models.QuestionnaireQuestion.section == section)
    if kca_id:
        stmt = stmt.where(models.QuestionnaireQuestion.kca_id == kca_id)
    return db.scalars(stmt.order_by(models.QuestionnaireQuestion.sort_order)).all()


@router.get("/questions/{question_id}", response_model=schemas.QuestionnaireQuestionRead)
def get_question(question_id: int, db: Session = Depends(get_db)):
    q = db.get(models.QuestionnaireQuestion, question_id)
    if not q:
        raise HTTPException(404, "Question not found")
    return q


@router.get("/responses", response_model=list[schemas.QuestionnaireResponseRead])
def list_responses(
    db: Session = Depends(get_db),
    question_id: int | None = None,
    section: str | None = None,
):
    stmt = select(models.QuestionnaireResponse)
    if question_id:
        stmt = stmt.where(models.QuestionnaireResponse.question_id == question_id)
    if section:
        stmt = stmt.join(
            models.QuestionnaireQuestion,
            models.QuestionnaireResponse.question_id == models.QuestionnaireQuestion.id,
        ).where(models.QuestionnaireQuestion.section == section)
    return db.scalars(stmt.order_by(models.QuestionnaireResponse.updated_at.desc())).all()


@router.post("/responses", response_model=schemas.QuestionnaireResponseRead)
def create_response(payload: schemas.QuestionnaireResponseCreate, db: Session = Depends(get_db)):
    if not db.get(models.QuestionnaireQuestion, payload.question_id):
        raise HTTPException(404, "Question not found")
    response = models.QuestionnaireResponse(**payload.model_dump())
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


@router.put("/responses/{response_id}", response_model=schemas.QuestionnaireResponseRead)
def update_response(response_id: int, payload: schemas.QuestionnaireResponseUpdate, db: Session = Depends(get_db)):
    response = db.get(models.QuestionnaireResponse, response_id)
    if not response:
        raise HTTPException(404, "Response not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(response, k, v)
    db.commit()
    db.refresh(response)
    return response


@router.delete("/responses/{response_id}")
def delete_response(response_id: int, db: Session = Depends(get_db)):
    response = db.get(models.QuestionnaireResponse, response_id)
    if not response:
        raise HTTPException(404, "Response not found")
    db.delete(response)
    db.commit()
    return {"ok": True}


@router.get("/responses/{response_id}/suggestions", response_model=list[schemas.SuggestionRead])
def get_suggestions(response_id: int, db: Session = Depends(get_db)):
    response = db.get(models.QuestionnaireResponse, response_id)
    if not response:
        raise HTTPException(404, "Response not found")
    return qa.compute_suggestions(db, response)


@router.post("/responses/{response_id}/suggestions/apply", response_model=schemas.ApplySuggestionsResponse)
def apply_suggestions(response_id: int, payload: schemas.ApplySuggestionsRequest, db: Session = Depends(get_db)):
    response = db.get(models.QuestionnaireResponse, response_id)
    if not response:
        raise HTTPException(404, "Response not found")

    results = []
    for item in payload.items:
        try:
            entity_id, message = qa.apply_one(db, response, item)
            db.add(models.QuestionnaireAppliedUpdate(
                response_id=response.id, target_key=item.target_key,
                entity_type=item.entity_type, entity_id=entity_id,
                field_name=item.field_name, applied_value=item.proposed_value,
            ))
            db.commit()
            results.append(schemas.ApplySuggestionResult(
                target_key=item.target_key, success=True, message=message,
                entity_type=item.entity_type, entity_id=entity_id,
            ))
        except HTTPException as e:
            db.rollback()
            results.append(schemas.ApplySuggestionResult(
                target_key=item.target_key, success=False, message=str(e.detail),
                entity_type=item.entity_type, entity_id=None,
            ))
        except ValueError as e:
            db.rollback()
            results.append(schemas.ApplySuggestionResult(
                target_key=item.target_key, success=False, message=str(e),
                entity_type=item.entity_type, entity_id=None,
            ))
    return schemas.ApplySuggestionsResponse(results=results)


@router.get("/progress", response_model=list[schemas.QuestionnaireProgressRow])
def progress(db: Session = Depends(get_db)):
    """Per-section question counts and how many have at least one recorded response."""
    questions = db.scalars(select(models.QuestionnaireQuestion)).all()
    answered_qids = {
        row[0] for row in db.execute(select(models.QuestionnaireResponse.question_id).distinct())
    }
    by_section: dict[str, dict] = {}
    for q in questions:
        row = by_section.setdefault(q.section, {"section": q.section, "kca_id": q.kca_id, "total": 0, "answered": 0})
        row["total"] += 1
        if q.id in answered_qids:
            row["answered"] += 1
    return list(by_section.values())
