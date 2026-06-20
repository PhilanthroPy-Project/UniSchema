#!/usr/bin/env python3
"""Join ConstituentEvent egress JSON to a CRM golden-record CSV by email."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def load_events(egress_dir: Path) -> list[dict]:
    events: list[dict] = []
    for path in egress_dir.rglob("*.json"):
        with path.open(encoding="utf-8") as handle:
            events.append(json.load(handle))
    return events


def load_crm(path: Path) -> dict[str, dict]:
    by_email: dict[str, dict] = {}
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            email = row.get("email", "").strip().lower()
            if email:
                by_email[email] = row
    return by_email


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("egress_dir", type=Path, help="Local egress directory")
    parser.add_argument("crm_csv", type=Path, help="CRM export with email column")
    args = parser.parse_args()

    events = load_events(args.egress_dir)
    crm = load_crm(args.crm_csv)

    matched = 0
    for event in events:
        email = str(event.get("constituentEmail", "")).lower()
        crm_row = crm.get(email)
        if crm_row:
            matched += 1
            print(
                json.dumps(
                    {
                        "eventId": event.get("eventId"),
                        "constituentEmail": email,
                        "crmId": crm_row.get("constituent_id"),
                        "eventType": event.get("eventType"),
                        "sourceSystem": event.get("sourceSystem"),
                        "amount": event.get("amount"),
                    }
                )
            )

    print(f"\nMatched {matched}/{len(events)} events to CRM records", flush=True)


if __name__ == "__main__":
    main()
