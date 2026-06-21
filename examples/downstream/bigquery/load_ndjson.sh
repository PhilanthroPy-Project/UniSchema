#!/usr/bin/env python3
"""Load UniSchema ConstituentEvent NDJSON batch from GCS into BigQuery."""

from __future__ import annotations

import argparse
import json
import sys


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ndjson_path", help="Local path or gs:// URI to NDJSON batch")
    parser.add_argument("--project", required=True)
    parser.add_argument("--dataset", default="unischema")
    parser.add_argument("--table", default="constituent_events_raw")
    args = parser.parse_args()

    print(
        json.dumps(
            {
                "action": "bigquery_load",
                "source": args.ndjson_path,
                "destination": f"{args.project}.{args.dataset}.{args.table}",
                "note": "Use bq load --source_format=NEWLINE_DELIMITED_JSON with this file",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
