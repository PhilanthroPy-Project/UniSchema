"""
Complete Airflow DAG — S3 NDJSON batch → parse → optional warehouse COPY stub.

Trigger via UniSchema AIRFLOW_WEBHOOK_URL or S3 event notification.
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
    s3_uri = conf.get("s3Uri")
    if not s3_uri:
        raise ValueError("dag_run.conf missing s3Uri")

    import boto3

    parsed = s3_uri.replace("s3://", "").split("/", 1)
    bucket, key = parsed[0], parsed[1]
    body = boto3.client("s3").get_object(Bucket=bucket, Key=key)["Body"].read().decode("utf-8")

    totals: dict[str, float] = {}
    counts: dict[str, int] = {}
    rows: list[dict] = []

    for line in body.splitlines():
        if not line.strip():
            continue
        event = json.loads(line)
        rows.append(event)
        source = event.get("sourceSystem", "UNKNOWN")
        counts[source] = counts.get(source, 0) + 1
        amount = event.get("amount")
        if isinstance(amount, (int, float)):
            totals[source] = totals.get(source, 0.0) + float(amount)

    print(f"Loaded batch {s3_uri}: {len(rows)} events")
    for source, count in sorted(counts.items()):
        print(f"  {source}: {count} events, ${totals.get(source, 0):,.2f} donations")

    # Snowflake COPY pattern (replace connection id and stage):
    # COPY INTO constituent_events FROM @unischema_stage/{key}
    #   FILE_FORMAT = (TYPE = JSON STRIP_OUTER_ARRAY = FALSE);
    #
    # BigQuery: load job from gs://bucket/key with NEWLINE_DELIMITED_JSON

    context["ti"].xcom_push(key="row_count", value=len(rows))
    context["ti"].xcom_push(key="s3_uri", value=s3_uri)


with DAG(
    dag_id="unischema_ingest",
    default_args=default_args,
    description="Process UniSchema ConstituentEvent NDJSON batch from S3",
    schedule=None,
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["unischema", "advancement"],
) as dag:
    PythonOperator(
        task_id="process_batch",
        python_callable=process_unischema_batch,
    )
