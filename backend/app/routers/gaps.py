from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..compliance import gap_analysis
from ..auth import get_current_user

router = APIRouter(prefix="/api/gaps", tags=["Gap Analysis"], dependencies=[Depends(get_current_user)])


@router.get("")
def get_gaps(db: Session = Depends(get_db)):
    return gap_analysis(db)
