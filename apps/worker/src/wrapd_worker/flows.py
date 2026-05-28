"""Prefect flows para orquestar la ingesta.

Uso manual:
    python -m wrapd_worker.flows               → ingesta todos los usuarios una vez
    python -m wrapd_worker.flows --user <id>   → ingesta solo un usuario
    python -m wrapd_worker.flows --serve       → registra como deployment con schedule

En producción:
    El flow `wrapd_hourly` se sirve con un schedule cada 10 minutos.
"""

import argparse
import sys
from typing import Any

from loguru import logger
from prefect import flow, task

from wrapd_worker.ingest import ingest_all_users, ingest_user


@task(retries=3, retry_delay_seconds=30, log_prints=True)
def ingest_user_task(user_id: str) -> dict[str, Any]:
    return ingest_user(user_id)


@task(retries=2, retry_delay_seconds=30, log_prints=True)
def ingest_all_task() -> dict[str, Any]:
    return ingest_all_users()


@flow(name="wrapd-ingest-user", log_prints=True)
def wrapd_user_flow(user_id: str) -> dict[str, Any]:
    return ingest_user_task(user_id)


@flow(name="wrapd-ingest-all", log_prints=True)
def wrapd_all_flow() -> dict[str, Any]:
    return ingest_all_task()


def _main() -> int:
    parser = argparse.ArgumentParser(description="Wrapd ingest CLI")
    parser.add_argument("--user", help="Ingest a single user by Spotify id")
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Serve the all-users flow with a 10-minute schedule",
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

    if args.user:
        result = wrapd_user_flow(args.user)
    else:
        result = wrapd_all_flow()
    logger.info(f"Done · {result}")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
