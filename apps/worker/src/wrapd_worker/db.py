"""Postgres connection helpers."""

from contextlib import contextmanager
from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine

from wrapd_worker.config import settings

_engine: Engine | None = None


def engine() -> Engine:
    """Lazy engine singleton. Reuses a single pool across the process."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.postgres_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
    return _engine


@contextmanager
def transaction() -> Iterator[Connection]:
    """Yield a connection inside a BEGIN/COMMIT transaction. Rolls back on error."""
    with engine().begin() as conn:
        yield conn


def fetch_one(sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
    with engine().connect() as conn:
        row = conn.execute(text(sql), params or {}).mappings().first()
        return dict(row) if row else None


def fetch_all(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    with engine().connect() as conn:
        rows = conn.execute(text(sql), params or {}).mappings().all()
        return [dict(r) for r in rows]


def execute(sql: str, params: dict[str, Any] | None = None) -> None:
    with engine().begin() as conn:
        conn.execute(text(sql), params or {})
