# Downstream pipeline examples

These scripts answer **"why UniSchema?"** — they consume normalized **ConstituentEvent** output and produce a report your stakeholders can understand.

## Local egress (pilot / Docker Compose)

After `npm run demo`:

```bash
python3 examples/downstream/read_local_egress.py data/egress
```

**Notebook:** [egress_report.ipynb](./egress_report.ipynb) — same data, bar chart for stakeholders (`pip install pandas matplotlib`).

Sample output:

```
UniSchema egress report (local JSON)
====================================
Files read: 1

Events by sourceSystem:
  GIVECAMPUS               1 events  $250.00 total donations

Events by eventType:
  DONATION                      1
```

## S3 NDJSON batches (production)

When `EGRESS_TARGET=s3`, UniSchema flushes micro-batches:

```
s3://{bucket}/{prefix}/batches/{YYYY}/{MM}/{DD}/{batchId}.ndjson
s3://{bucket}/{prefix}/batches/{YYYY}/{MM}/{DD}/{batchId}.manifest.json
```

Read a batch:

```bash
pip install boto3
python3 examples/downstream/read_s3_ndjson_batch.py \
  s3://your-bucket/constituent-events/batches/2026/06/20/abc123.ndjson
```

Each NDJSON line is one `ConstituentEvent` JSON object.

## Airflow

[`airflow_dag_stub.py`](./airflow_dag_stub.py) shows a trigger-only DAG that:

1. Receives `s3Uri` from UniSchema's `AIRFLOW_WEBHOOK_URL` POST (event `egress.batch.ready`)
2. Downloads the NDJSON batch
3. Prints aggregation (replace with warehouse load)

Wire in `.env`:

```bash
AIRFLOW_WEBHOOK_URL=https://airflow.example.com/api/v1/dags/unischema_ingest/dagRuns
AIRFLOW_WEBHOOK_SECRET=...
```

Alternatively, S3 event notifications on `*.manifest.json` can trigger the same DAG without HTTP.

## Jupyter / notebook

Open **[egress_report.ipynb](./egress_report.ipynb)** in JupyterLab or VS Code. It loads local egress JSON and plots donation totals by `sourceSystem`.

## Next steps

- Join `constituentEmail` to your CRM golden record
- Feed `normalizedMetadata` features into an engagement model
- See [docs/operator-guide.md](../../docs/operator-guide.md) for egress configuration
