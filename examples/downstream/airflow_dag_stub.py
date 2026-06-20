"""
Airflow DAG stub — trigger when UniSchema writes an S3 NDJSON batch.

Two integration options:
  1. Set AIRFLOW_WEBHOOK_URL to Airflow's REST API (dagRuns) — UniSchema POSTs manifest metadata
  2. S3 event notification on *.manifest.json → SQS → this DAG

This stub reads conf passed from the webhook trigger and runs the local report script logic.
Replace `process_unischema_batch` with your warehouse load (Snowflake COPY, BigQuery, etc.).

Requires: apache-airflow, boto3 (provider packages vary by Airflow version)
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

default_args = {
    "owner": "advancement-analytics",
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


def process_unischema_batch(**context) -> None:
    conf = context["dag_run"].conf or {}
    # Example conf from UniSchema egress.batch.ready webhook:
    # { "event": "egress.batch.ready", "s3Uri": "s3://bucket/.../batch.ndjson", ... }
    s3_uri = conf.get("s3Uri")
    if not s3_uri:
        raise ValueError("dag_run.conf missing s3Uri — wire AIRFLOW_WEBHOOK_URL or pass conf manually")

    import boto3

    parsed = s3_uri.replace("s3://", "").split("/", 1)
    bucket, key = parsed[0], parsed[1]
    body = boto3.client("s3").get_object(Bucket=bucket, Key=key)["Body"].read().decode("utf-8")

    totals: dict[str, float] = {}
    counts: dict[str, int] = {}
    for line in body.splitlines():
        if not line.strip():
            continue
        event = json.loads(line)
        source = event.get("sourceSystem", "UNKNOWN")
        counts[source] = counts.get(source, 0) + 1
        amount = event.get("amount")
        if isinstance(amount, (int, float)):
            totals[source] = totals.get(source, 0.0) + float(amount)

    print(f"Loaded batch {s3_uri}: {sum(counts.values())} events")
    for source, count in sorted(counts.items()):
        print(f"  {source}: {count} events, ${totals.get(source, 0):,.2f} donations")

    # TODO: COPY INTO warehouse, update dbt model, send Slack summary, etc.


with DAG(
    dag_id="unischema_ingest",
    default_args=default_args,
    description="Process UniSchema ConstituentEvent NDJSON batch from S3",
    schedule=None,  # trigger only — webhook or S3 event
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["unischema", "advancement"],
) as dag:
    PythonOperator(
        task_id="process_batch",
        python_callable=process_unischema_batch,
    )
