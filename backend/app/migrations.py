"""
Lightweight, idempotent schema patches for the existing SQLite file.

`Base.metadata.create_all` (called on every startup, see main.py) only creates
missing *tables* - it never alters an existing table to add a new column. This
app has no Alembic (overkill for a single-file internal SQLite tool with one
developer), so any new column on an existing table needs a small guarded
`ALTER TABLE` here instead. Run this BEFORE `create_all` on every startup;
each patch checks whether it's already applied before doing anything, so
re-running is always safe.

Add new patches to `run_lightweight_migrations` following the same pattern.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _has_column(engine: Engine, table: str, column: str) -> bool:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return True  # table doesn't exist yet - create_all will create it with the column already present
    return column in {c["name"] for c in inspector.get_columns(table)}


def run_lightweight_migrations(engine: Engine) -> None:
    if not _has_column(engine, "actions", "owner_person"):
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE actions ADD COLUMN owner_person VARCHAR(200) DEFAULT ''"))
