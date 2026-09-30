from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..compliance import november_readiness, may2027_readiness
from ..auth import get_current_user

router = APIRouter(tags=["Phase Readiness"], dependencies=[Depends(get_current_user)])


@router.get("/api/november-2026")
def get_november_readiness(db: Session = Depends(get_db)):
    return november_readiness(db)


@router.get("/api/may-2027")
def get_may2027_readiness(db: Session = Depends(get_db)):
    return may2027_readiness(db)
