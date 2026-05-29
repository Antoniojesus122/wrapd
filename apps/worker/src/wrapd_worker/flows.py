"""Prefect flows para orquestar la ingesta.

Uso manual:
    python -m wrapd_worker.flows                  → ingesta plays · todos los users
    python -m wrapd_worker.flows --user <id>      → plays · solo un usuario
    python -m wrapd_worker.flows --tops           → top tracks/artists + audio features
    python -m wrapd_worker.flows --tops --user X  → tops para un usuario
    python -m wrapd_worker.flows --serve          → deployment con schedule

En producción:
    Plays cada ~10 min. Tops + audio una vez al día.
"""

import argparse
import sys
from typing import Any

from loguru import logger
from prefect import flow, task

from wrapd_worker.db import fetch_all
from wrapd_worker.ingest import ingest_all_users, ingest_tops, ingest_user


@task(retries=3, retry_delay_seconds=30, log_prints=True)
def ingest_user_task(user_id: str) -> dict[str, Any]:
    return ingest_user(user_id)


@task(retries=2, retry_delay_seconds=30, log_prints=True)
def ingest_all_task() -> dict[str, Any]:
    return ingest_all_users()


@task(retries=2, retry_delay_seconds=30, log_prints=True)
def ingest_tops_task(user_id: str) -> dict[str, Any]:
    return ingest_tops(user_id)


@flow(name="wrapd-ingest-user", log_prints=True)
def wrapd_user_flow(user_id: str) -> dict[str, Any]:
    return ingest_user_task(user_id)


@flow(name="wrapd-ingest-all", log_prints=True)
def wrapd_all_flow() -> dict[str, Any]:
    return ingest_all_task()


@flow(name="wrapd-ingest-tops", log_prints=True)
def wrapd_tops_flow(user_id: str | None = None) -> dict[str, Any]:
    """Ingesta tops + audio features. Si user_id es None, hace todos."""
    if user_id:
        return ingest_tops_task(user_id)
    users = fetch_all("SELECT user_id FROM raw.tokens")
    results: dict[str, Any] = {"users": len(users), "per_user": {}}
    for u in users:
        try:
            results["per_user"][u["user_id"]] = ingest_tops_task(u["user_id"])
        except Exception as e:
            logger.error(f"[wrapd_tops_flow] user={u['user_id']} failed: {e}")
            results["per_user"][u["user_id"]] = {"error": str(e)[:300]}
    return results


def _main() -> int:
    parser = argparse.ArgumentParser(description="Wrapd ingest CLI")
    parser.add_argument("--user", help="Spotify user id")
    parser.add_argument("--tops", action="store_true", help="Ingest top tracks/artists + audio features")
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Serve the all-users plays flow with a 10-minute schedule",
    )
    args = parser.parse_args()

    if args.serve:
        logger.info("Serving wrapd-ingest-all every 10 minutes")
        wrapd_all_flow.serve(
            name="wrapd-ingest-all-10min",
            interval=600,
            tags=["wrapd", "ingest"],
        )
        return 0

    if args.tops:
        result = wrapd_tops_flow(args.user)
    elif args.user:
        result = wrapd_user_flow(args.user)
    else:
        result = wrapd_all_flow()
    logger.info(f"Done · {result}")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
