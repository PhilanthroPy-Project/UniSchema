#!/usr/bin/env python3
"""
Read a UniSchema S3 NDJSON batch and print the same summary as read_local_egress.py.

Requires: pip install boto3

Usage:
  python read_s3_ndjson_batch.py s3://bucket/constituent-events/batches/2026/06/20/abc.ndjson
  python read_s3_ndjson_batch.py ./path/to/batch.ndjson   # local file
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse


def load_ndjson_lines(raw: str) -> list[dict]:
    events = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        row = json.loads(line)
        if isinstance(row, dict):
            events.append(row)
    return events


def read_s3(uri: str) -> str:
    try:
        import boto3
    except ImportError as exc:
        raise SystemExit("Install boto3: pip install boto3") from exc

    parsed = urlparse(uri)
    bucket = parsed.netloc
    key = parsed.path.lstrip("/")
    client = boto3.client("s3")
    obj = client.get_object(Bucket=bucket, Key=key)
    return obj["Body"].read().decode("utf-8")


def read_input(path_or_uri: str) -> str:
    if path_or_uri.startswith("s3://"):
        return read_s3(path_or_uri)
    return Path(path_or_uri).read_text(encoding="utf-8")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: read_s3_ndjson_batch.py <s3://.../batch.ndjson | local.ndjson>", file=sys.stderr)
        return 1

    source = sys.argv[1]
    events = load_ndjson_lines(read_input(source))

    totals: dict[str, float] = defaultdict(float)
    counts: dict[str, int] = defaultdict(int)
    by_type: dict[str, int] = defaultdict(int)

    for event in events:
        source_system = event.get("sourceSystem", "UNKNOWN")
        event_type = event.get("eventType", "UNKNOWN")
        by_type[event_type] += 1
        counts[source_system] += 1
        amount = event.get("amount")
        if isinstance(amount, (int, float)):
            totals[source_system] += float(amount)

    print("UniSchema egress report (NDJSON batch)")
    print("======================================")
    print(f"Source:     {source}")
    print(f"Records:    {len(events)}")
    print()

    print("Events by sourceSystem:")
    for key in sorted(counts):
        print(f"  {key:20} {counts[key]:5} events  ${totals[key]:,.2f} total donations")

    print()
    print("Events by eventType:")
    for event_type in sorted(by_type):
        print(f"  {event_type:25} {by_type[event_type]:5}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
