#!/usr/bin/env python3
"""
Aggregate ConstituentEvent egress JSON into a per-constituent feature table.

Output columns match the PhilanthroPy integration contract documented in
docs/philanthropy-integration.md.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import pandas as pd
except ImportError as exc:
    raise SystemExit("pandas is required: pip install pandas") from exc

REQUIRED_FEATURE_COLUMNS: tuple[str, ...] = (
    "constituent_email",
    "donation_count",
    "registration_count",
    "email_click_count",
    "total_amount",
    "total_gift_amount",
    "event_attendance_count",
    "last_donation_date",
    "last_event_date",
    "first_event_date",
    "years_active",
    "metadata_key_count",
)

NUMERIC_FEATURE_COLUMNS: tuple[str, ...] = (
    "donation_count",
    "registration_count",
    "email_click_count",
    "total_amount",
    "total_gift_amount",
    "event_attendance_count",
    "years_active",
    "metadata_key_count",
)


def _parse_datetime(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def load_events(egress_dir: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for path in egress_dir.rglob("*.json"):
        if path.name.endswith(".manifest.json"):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if isinstance(data, dict) and data.get("eventId") and data.get("constituentEmail"):
            events.append(data)
    return events


def load_events_from_ndjson(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        data = json.loads(line)
        if isinstance(data, dict) and data.get("eventId") and data.get("constituentEmail"):
            events.append(data)
    return events


def build_feature_table(events: list[dict[str, Any]], reference_date: datetime | None = None) -> pd.DataFrame:
    """Aggregate events to one row per constituent_email."""
    ref = reference_date or datetime.now(timezone.utc)

    rows: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "donation_count": 0,
            "registration_count": 0,
            "email_click_count": 0,
            "total_amount": 0.0,
            "metadata_key_count": 0.0,
            "last_donation_date": None,
            "last_event_date": None,
            "first_event_date": None,
        }
    )

    for event in events:
        email = str(event.get("constituentEmail", "")).strip().lower()
        if not email:
            continue

        row = rows[email]
        row["constituent_email"] = email

        event_type = event.get("eventType", "")
        created_at = _parse_datetime(event.get("createdAt"))

        if created_at is not None:
            if row["first_event_date"] is None or created_at < row["first_event_date"]:
                row["first_event_date"] = created_at
            if row["last_event_date"] is None or created_at > row["last_event_date"]:
                row["last_event_date"] = created_at

        if event_type == "DONATION":
            row["donation_count"] += 1
            amount = event.get("amount")
            if isinstance(amount, (int, float)):
                row["total_amount"] += float(amount)
            if created_at is not None and (
                row["last_donation_date"] is None or created_at > row["last_donation_date"]
            ):
                row["last_donation_date"] = created_at
        elif event_type == "EVENT_REGISTRATION":
            row["registration_count"] += 1
        elif event_type == "EMAIL_CLICK":
            row["email_click_count"] += 1

        metadata = event.get("normalizedMetadata") or {}
        if isinstance(metadata, dict):
            row["metadata_key_count"] += float(len(metadata))

    if not rows:
        return pd.DataFrame(columns=list(REQUIRED_FEATURE_COLUMNS))

    frame = pd.DataFrame(rows.values())

    frame["total_gift_amount"] = frame["total_amount"]
    frame["event_attendance_count"] = frame["registration_count"]

    def _years_active(row: pd.Series) -> float:
        first = row.get("first_event_date")
        if first is None or not isinstance(first, datetime):
            return 0.0
        delta = ref - first
        return max(delta.days / 365.25, 0.0)

    frame["years_active"] = frame.apply(_years_active, axis=1)

    for date_col in ("last_donation_date", "last_event_date", "first_event_date"):
        frame[date_col] = frame[date_col].apply(
            lambda value: value.isoformat() if isinstance(value, datetime) else None
        )

    for column in REQUIRED_FEATURE_COLUMNS:
        if column not in frame.columns:
            frame[column] = 0 if column in NUMERIC_FEATURE_COLUMNS else None

    return frame[list(REQUIRED_FEATURE_COLUMNS)]


def events_to_features(
    events: list[dict[str, Any]],
    reference_date: datetime | None = None,
) -> pd.DataFrame:
    return build_feature_table(events, reference_date=reference_date)


def egress_dir_to_features(egress_dir: Path, reference_date: datetime | None = None) -> pd.DataFrame:
    return build_feature_table(load_events(egress_dir), reference_date=reference_date)
