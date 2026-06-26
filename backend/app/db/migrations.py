"""Lightweight schema patches for dev databases (create_all does not alter existing tables)."""
import logging
from sqlalchemy import text

from app.db.database import engine

logger = logging.getLogger("migrations")

_PATCHES = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_subject VARCHAR",
    "CREATE INDEX IF NOT EXISTS ix_users_oauth_subject ON users (oauth_subject)",
]


def apply_schema_patches() -> None:
    with engine.begin() as conn:
        for sql in _PATCHES:
            try:
                conn.execute(text(sql))
            except Exception as e:
                logger.warning("Schema patch skipped (%s): %s", sql[:40], e)
