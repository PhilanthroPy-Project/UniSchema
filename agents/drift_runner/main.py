from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .artifacts import write_drift_artifacts
from .llm_patch import generate_mapper_patch
from .prompt import count_validation_issues

REPO_ROOT = Path(__file__).resolve().parents[2]

VENDOR_MAPPER_FILES: dict[str, str] = {
    "cvent": "src/mappers/cvent.ts",
    "givecampus": "src/mappers/givecampus.ts",
}


@dataclass
class DriftEvent:
    id: str
    vendor: str
    raw_payload: Any
    validation_errors: dict[str, Any]
    captured_at: str
    status: str


def _fetch_pending_from_api(api_url: str, token: str, limit: int) -> list[DriftEvent]:
    query = f"/drift/events?status=pending&includePayload=true&limit={limit}"
    url = f"{api_url.rstrip('/')}{query}"
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not payload.get("success"):
        raise RuntimeError(f"API error fetching drift events: {payload}")

    events: list[DriftEvent] = []
    for row in payload.get("events", []):
        events.append(
            DriftEvent(
                id=row["id"],
                vendor=row["vendor"],
                raw_payload=row["rawPayload"],
                validation_errors=row["validationErrors"],
                captured_at=row["capturedAt"],
                status=row["status"],
            )
        )

    return events


def _fetch_pending_from_sqlite(database_path: str, limit: int) -> list[DriftEvent]:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row

    try:
        rows = connection.execute(
            """
            SELECT id, vendor, raw_payload_json, validation_errors_json, captured_at, status
            FROM drift_events
            WHERE status = 'pending'
            ORDER BY captured_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    finally:
        connection.close()

    events: list[DriftEvent] = []
    for row in rows:
        events.append(
            DriftEvent(
                id=row["id"],
                vendor=row["vendor"],
                raw_payload=json.loads(row["raw_payload_json"]),
                validation_errors=json.loads(row["validation_errors_json"]),
                captured_at=row["captured_at"],
                status=row["status"],
            )
        )

    return events


def _ack_event_api(api_url: str, token: str, event_id: str) -> None:
    url = f"{api_url.rstrip('/')}/drift/events/{event_id}/ack"
    request = urllib.request.Request(
        url,
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        data=b"{}",
    )

    with urllib.request.urlopen(request, timeout=30):
        return


def _ack_event_sqlite(database_path: str, event_id: str) -> None:
    connection = sqlite3.connect(database_path)
    try:
        connection.execute(
            "UPDATE drift_events SET status = 'processed' WHERE id = ?",
            (event_id,),
        )
        connection.commit()
    finally:
        connection.close()


def _process_event(
    event: DriftEvent,
    *,
    repo_root: Path,
    dry_run: bool,
) -> Path | None:
    mapper_relative = VENDOR_MAPPER_FILES.get(event.vendor)
    if not mapper_relative:
        print(f"[skip] unsupported vendor: {event.vendor}", file=sys.stderr)
        return None

    mapper_path = repo_root / mapper_relative
    if not mapper_path.exists():
        raise FileNotFoundError(f"Mapper file not found: {mapper_path}")

    mapper_source = mapper_path.read_text(encoding="utf-8")
    issue_count = count_validation_issues(event.validation_errors)

    basename = f"{event.vendor}-{event.captured_at.replace(':', '-').replace('.', '-')}"
    fixture_path, test_path = write_drift_artifacts(
        repo_root=repo_root,
        basename=basename,
        vendor=event.vendor,
        raw_payload=event.raw_payload,
        captured_at=event.captured_at,
        issue_count=issue_count,
        dry_run=dry_run,
    )

    print(f"[artifact] fixture={fixture_path}")
    print(f"[artifact] test={test_path}")

    patch_path = repo_root / "agents" / "output" / f"{basename}.mapper.ts"
    patch = generate_mapper_patch(
        vendor=event.vendor,
        mapper_source=mapper_source,
        raw_payload=event.raw_payload,
        validation_errors=event.validation_errors,
        dry_run=dry_run,
    )

    if dry_run:
        print(f"[dry-run] would write mapper patch to {patch_path}")
        return None

    patch_path.parent.mkdir(parents=True, exist_ok=True)
    patch_path.write_text(patch, encoding="utf-8")
    print(f"[patch] wrote proposed mapper update to {patch_path}")

    return patch_path


def run(args: argparse.Namespace) -> int:
    if args.api_url:
        if not args.token:
            print("--token is required when using --api-url", file=sys.stderr)
            return 2
        events = _fetch_pending_from_api(args.api_url, args.token, args.limit)
    elif args.database:
        events = _fetch_pending_from_sqlite(args.database, args.limit)
    else:
        default_db = os.environ.get("DATABASE_URL", "data/unischema.db")
        if not Path(default_db).exists():
            print(
                "No pending drift source configured. Pass --database or --api-url.",
                file=sys.stderr,
            )
            return 2
        events = _fetch_pending_from_sqlite(default_db, args.limit)

    if not events:
        print("[drift-agent] no pending drift events")
        return 0

    print(f"[drift-agent] processing {len(events)} pending event(s)")

    processed = 0
    for event in events:
        print(f"[drift-agent] event={event.id} vendor={event.vendor}")

        try:
            _process_event(event, repo_root=Path(args.repo_root), dry_run=args.dry_run)
        except Exception as error:  # noqa: BLE001 — top-level runner logs and continues
            print(f"[error] failed to process {event.id}: {error}", file=sys.stderr)
            continue

        if args.dry_run:
            continue

        try:
            if args.api_url and args.token:
                _ack_event_api(args.api_url, args.token, event.id)
            elif args.database:
                _ack_event_sqlite(args.database, event.id)
            else:
                _ack_event_sqlite(os.environ.get("DATABASE_URL", "data/unischema.db"), event.id)
        except urllib.error.HTTPError as error:
            print(f"[warn] failed to ack {event.id}: HTTP {error.code}", file=sys.stderr)
        except Exception as error:  # noqa: BLE001
            print(f"[warn] failed to ack {event.id}: {error}", file=sys.stderr)

        processed += 1

    print(f"[drift-agent] completed {processed}/{len(events)} event(s)")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Process pending schema drift events and propose mapper patches via LLM.",
    )
    parser.add_argument(
        "--database",
        help="Path to UniSchema SQLite database (default: DATABASE_URL or data/unischema.db)",
    )
    parser.add_argument(
        "--api-url",
        help="UniSchema API base URL (e.g. https://unischema.example.com)",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("DRIFT_AGENT_TOKEN"),
        help="Bearer token for /drift/events agent endpoints",
    )
    parser.add_argument(
        "--repo-root",
        default=str(REPO_ROOT),
        help="Repository root for mapper and artifact paths",
    )
    parser.add_argument("--limit", type=int, default=10, help="Max pending events to process")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build prompts and log actions without writing files or acking events",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return run(args)


if __name__ == "__main__":
    raise SystemExit(main())
