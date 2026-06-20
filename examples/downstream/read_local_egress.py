#!/usr/bin/env python3
"""
Read UniSchema local egress JSON files and print a simple donation report.

Usage:
  python read_local_egress.py data/egress
  python read_local_egress.py data/egress/constituent-events/givecampus

No dependencies beyond Python 3.10+.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path


def iter_event_files(root: Path):
    for path in sorted(root.rglob("*.json")):
        if path.name.endswith(".manifest.json"):
            continue
        yield path


def load_event(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if isinstance(data, dict) and "eventId" in data:
        return data
    return None


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "data/egress")

    if not root.exists():
        print(f"Path not found: {root}", file=sys.stderr)
        return 1

    totals: dict[str, float] = defaultdict(float)
    counts: dict[str, int] = defaultdict(int)
    by_type: dict[str, int] = defaultdict(int)
    files_read = 0

    for path in iter_event_files(root):
        event = load_event(path)
        if not event:
            continue
        files_read += 1
        source = event.get("sourceSystem", "UNKNOWN")
        event_type = event.get("eventType", "UNKNOWN")
        by_type[event_type] += 1
        counts[source] += 1
        amount = event.get("amount")
        if isinstance(amount, (int, float)):
            totals[source] += float(amount)

    print("UniSchema egress report (local JSON)")
    print("====================================")
    print(f"Root:       {root.resolve()}")
    print(f"Files read: {files_read}")
    print()

    if files_read == 0:
        print("No ConstituentEvent JSON found. Run: npm run demo")
        return 0

    print("Events by sourceSystem:")
    for source in sorted(counts):
        print(f"  {source:20} {counts[source]:5} events  ${totals[source]:,.2f} total donations")

    print()
    print("Events by eventType:")
    for event_type in sorted(by_type):
        print(f"  {event_type:25} {by_type[event_type]:5}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
