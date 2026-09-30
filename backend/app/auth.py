import secrets
from datetime import datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from . import models
from .database import get_db

ph = PasswordHasher()

SESSION_COOKIE_NAME = "session_id"
SESSION_TTL = timedelta(days=7)


def hash_password(password: str) -> str:
    """Hashing of password using Argon2 algorithm."""
    return ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify the password against the hash using Argon2 algorithm."""
    try:
        return ph.verify(password_hash, password)
    except VerificationError:
        return False


def create_session(db: DBSession, user: models.User) -> models.Session:
    """Create and persist a new server-side session for a just-authenticated user."""
    session = models.Session(
        id=secrets.token_urlsafe(32),
        user_id=user.id,
        expires_at=datetime.utcnow() + SESSION_TTL,
    )
    db.add(session)
    db.commit()
    return session


def get_current_user(
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: DBSession = Depends(get_db),
) -> models.User:
    """FastAPI dependency - add to any router (or route) to require a valid,
    unexpired session cookie. Raises 401 otherwise. Use exactly like the
    existing Depends(get_db) pattern used everywhere else in this app."""
    if not session_id:
        raise HTTPException(401, "Not authenticated")
    session = db.get(models.Session, session_id)
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(401, "Session expired or invalid")
    user = db.get(models.User, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Not authenticated")
    return user