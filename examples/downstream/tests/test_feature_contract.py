#!/usr/bin/env python3
"""Tests for ConstituentEvent → feature table contract (no PhilanthroPy required)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pytest

from unischema_features import (
    NUMERIC_FEATURE_COLUMNS,
    REQUIRED_FEATURE_COLUMNS,
    build_feature_table,
    egress_dir_to_features,
)

FIXTURE_EVENTS = [
    {
        "eventId": "11111111-1111-4111-8111-111111111111",
        "constituentEmail": "jane.doe@university.edu",
        "eventType": "DONATION",
        "sourceSystem": "GIVECAMPUS",
        "amount": 250.0,
        "currency": "USD",
        "normalizedMetadata": {"donation_type": "annual"},
        "payload": {},
        "createdAt": "2026-01-15T12:00:00.000Z",
    },
    {
        "eventId": "22222222-2222-4222-8222-222222222222",
        "constituentEmail": "jane.doe@university.edu",
        "eventType": "EVENT_REGISTRATION",
        "sourceSystem": "CVENT",
        "normalizedMetadata": {},
        "payload": {},
        "createdAt": "2026-02-01T09:00:00.000Z",
    },
    {
        "eventId": "33333333-3333-4333-8333-333333333333",
        "constituentEmail": "john.smith@university.edu",
        "eventType": "EMAIL_CLICK",
        "sourceSystem": "SLATE",
        "normalizedMetadata": {"campaign": "spring"},
        "payload": {},
        "createdAt": "2026-03-10T18:30:00.000Z",
    },
]


def test_required_columns_present():
    frame = build_feature_table(FIXTURE_EVENTS, reference_date=datetime(2026, 6, 1, tzinfo=timezone.utc))
    assert list(frame.columns) == list(REQUIRED_FEATURE_COLUMNS)


def test_numeric_dtypes():
    frame = build_feature_table(FIXTURE_EVENTS, reference_date=datetime(2026, 6, 1, tzinfo=timezone.utc))
    for column in NUMERIC_FEATURE_COLUMNS:
        assert pd.api.types.is_numeric_dtype(frame[column]), column


def test_aggregation_per_email():
    frame = build_feature_table(FIXTURE_EVENTS, reference_date=datetime(2026, 6, 1, tzinfo=timezone.utc))
    jane = frame[frame["constituent_email"] == "jane.doe@university.edu"].iloc[0]
    assert jane["donation_count"] == 1
    assert jane["registration_count"] == 1
    assert jane["total_amount"] == 250.0
    assert jane["total_gift_amount"] == 250.0
    assert jane["event_attendance_count"] == 1


def test_egress_dir_roundtrip(tmp_path: Path):
    for event in FIXTURE_EVENTS:
        path = tmp_path / f"{event['eventId']}.json"
        path.write_text(json.dumps(event), encoding="utf-8")

    frame = egress_dir_to_features(tmp_path, reference_date=datetime(2026, 6, 1, tzinfo=timezone.utc))
    assert len(frame) == 2
    assert set(frame["constituent_email"]) == {
        "jane.doe@university.edu",
        "john.smith@university.edu",
    }
