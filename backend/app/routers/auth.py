import os
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from .. import models, schemas
from ..database import get_db
from ..auth import verify_password, create_session, get_current_user, SESSION_COOKIE_NAME, SESSION_TTL

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=schemas.UserRead)
def login(payload: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.scalars(select(models.User).where(models.User.username == payload.username)).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")

    session = create_session(db, user)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session.id,
        httponly=True,
        secure=os.environ.get("COOKIE_SECURE", "false").lower() == "true",
        samesite="lax",
        max_age=int(SESSION_TTL.total_seconds()),
        path="/",
    )
    return user


@router.post("/logout")
def logout(
    response: Response,
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    # Read from the same cookie get_current_user checks - logout should still
    # succeed (idempotently) even if the session was already invalid/missing.
    if session_id:
        existing = db.get(models.Session, session_id)
        if existing:
            db.delete(existing)
            db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=schemas.UserRead)
def me(user: models.User = Depends(get_current_user)):
    return user
