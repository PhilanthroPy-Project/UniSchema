#!/usr/bin/env python3
"""Load UniSchema ConstituentEvent NDJSON batch into Amazon Redshift via COPY."""

from __future__ import annotations

import argparse
import json


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("s3_uri", help="s3://bucket/path/batch.ndjson")
    parser.add_argument("--iam-role", required=True, help="Redshift COPY IAM role ARN")
    args = parser.parse_args()

    sql = f"""
COPY constituent_events_raw
FROM '{args.s3_uri}'
IAM_ROLE '{args.iam_role}'
FORMAT AS JSON 'auto';
""".strip()

    print(json.dumps({"sql": sql}, indent=2))


if __name__ == "__main__":
    main()
