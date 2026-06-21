#!/usr/bin/env python3
"""Join ConstituentEvent egress JSON to a CRM golden-record CSV."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def load_events(egress_dir: Path) -> list[dict]:
    events: list[dict] = []
    for path in egress_dir.rglob("*.json"):
        if path.name.endswith(".manifest.json"):
            continue
        try:
            with path.open(encoding="utf-8") as handle:
                events.append(json.load(handle))
        except (json.JSONDecodeError, OSError):
            continue
    return events


def load_crm(path: Path) -> tuple[dict[str, dict], dict[str, dict]]:
    by_email: dict[str, dict] = {}
    by_constituent_id: dict[str, dict] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            email = row.get("email", "").strip().lower()
            if email:
                by_email[email] = row
            constituent_id = row.get("constituent_id", "").strip()
            if constituent_id:
                by_constituent_id[constituent_id] = row
    return by_email, by_constituent_id


def resolve_crm_row(
    event: dict,
    by_email: dict[str, dict],
    by_constituent_id: dict[str, dict],
) -> dict | None:
    external_id = event.get("externalConstituentId")
    if isinstance(external_id, str) and external_id.strip():
        row = by_constituent_id.get(external_id.strip())
        if row is not None:
            return row

    email = str(event.get("constituentEmail", "")).strip().lower()
    if email:
        return by_email.get(email)

    return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("egress_dir", type=Path, help="Local egress directory")
    parser.add_argument("crm_csv", type=Path, help="CRM export with email column")
    args = parser.parse_args()

    events = load_events(args.egress_dir)
    by_email, by_constituent_id = load_crm(args.crm_csv)

    matched = 0
    matched_by_external = 0
    for event in events:
        crm_row = resolve_crm_row(event, by_email, by_constituent_id)
        if crm_row:
            matched += 1
            external_id = event.get("externalConstituentId")
            if isinstance(external_id, str) and external_id.strip() in by_constituent_id:
                matched_by_external += 1
            email = str(event.get("constituentEmail", "")).lower()
            print(
                json.dumps(
                    {
                        "eventId": event.get("eventId"),
                        "constituentEmail": email,
                        "externalConstituentId": external_id,
                        "crmId": crm_row.get("constituent_id"),
                        "eventType": event.get("eventType"),
                        "sourceSystem": event.get("sourceSystem"),
                        "amount": event.get("amount"),
                    }
                )
            )

    print(f"\nMatched {matched}/{len(events)} events to CRM records", flush=True)
    if matched:
        print(f"  via externalConstituentId: {matched_by_external}", flush=True)


if __name__ == "__main__":
    main()
