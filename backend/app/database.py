"""Database engine/session setup. Postgres (own schema) when DATABASE_URL is set, else SQLite."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, DeclarativeBase

load_dotenv()  # reads .env from the working dir (repo root); real env vars win

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# DATA_DIR still holds uploads (and the SQLite file when DATABASE_URL is unset).
DATA_DIR = os.environ.get("DATA_DIR", BASE_DIR)
os.makedirs(DATA_DIR, exist_ok=True)

# Hosted Postgres when POSTGRES_HOST (or a full DATABASE_URL) is set; SQLite file for local dev.
if os.environ.get("DATABASE_URL"):
    DATABASE_URL = os.environ["DATABASE_URL"]
elif os.environ.get("POSTGRES_HOST"):
    # URL.create escapes special characters in the password.
    DATABASE_URL = URL.create(
        "postgresql+psycopg",
        username=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ["POSTGRES_HOST"],
        port=int(os.environ.get("POSTGRES_PORT", "5432")),
        database=os.environ["POSTGRES_DATABASE"],
    )
else:
    DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'dpdp_grc.db')}"
# Dedicated Postgres schema so we never touch `public`.
DB_SCHEMA = os.environ.get("DB_SCHEMA", "dpdp_grc")

if str(DATABASE_URL).startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"options": f"-csearch_path={DB_SCHEMA}"},
    )
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"'))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
