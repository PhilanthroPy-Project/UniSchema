# Downstream pipeline examples

These scripts answer **"why UniSchema?"** — they consume normalized **ConstituentEvent** output and feed [PhilanthroPy](https://github.com/PhilanthroPy-Project/PhilanthroPy) ML pipelines.

**Primary guide:** [docs/philanthropy-integration.md](../../docs/philanthropy-integration.md)

## Install

```bash
# Basic analytics
pip install -r examples/downstream/requirements.txt

# PhilanthroPy ML bridge (optional)
pip install -r examples/downstream/requirements-philanthropy.txt
```

## Local egress (pilot / Docker Compose)

After `npm run demo:multi`:

```bash
python3 examples/downstream/read_local_egress.py data/egress
python3 examples/downstream/philanthropy_crm_pipeline.py data/egress samples/crm-golden-record.csv
```

Or run the full chain:

```bash
npm run downstream-demo
```

**Notebook:** [egress_report.ipynb](./egress_report.ipynb) — egress summary + optional PhilanthroPy histogram.

## Feature column contract

`unischema_features.py` aggregates egress JSON to a per-constituent DataFrame. Required columns are tested in `tests/test_feature_contract.py`.

| Column | PhilanthroPy use |
|--------|------------------|
| `total_gift_amount` | `DonorPropensityModel` input |
| `years_active` | `DonorPropensityModel` input |
| `event_attendance_count` | `DonorPropensityModel` input |

Full contract → [philanthropy-integration.md](../../docs/philanthropy-integration.md#feature-column-contract)

## Scripts

| Script | Purpose |
|--------|---------|
| `unischema_features.py` | Egress → feature DataFrame |
| `philanthropy_crm_pipeline.py` | **Recommended** ML path with CRM labels |
| `philanthropy_pipeline.py` | Demo with proxy labels |
| `crm_join_example.py` | CRM join (`externalConstituentId` or email) |
| `read_local_egress.py` | Stakeholder text report |
| `read_s3_ndjson_batch.py` | Production S3 batch reader |

## S3 NDJSON batches (production)

When `EGRESS_TARGET=s3`, UniSchema flushes micro-batches:

```
s3://{bucket}/{prefix}/batches/{YYYY}/{MM}/{DD}/{batchId}.ndjson
s3://{bucket}/{prefix}/batches/{YYYY}/{MM}/{DD}/{batchId}.manifest.json
```

```bash
pip install boto3
python3 examples/downstream/read_s3_ndjson_batch.py \
  s3://your-bucket/constituent-events/batches/2026/06/20/abc123.ndjson
```

## dbt

See [dbt/README.md](./dbt/README.md) — includes `mart_constituent_rfm_features` for PhilanthroPy batch scoring.

## Related

- [docs/downstream-pipeline.md](../../docs/downstream-pipeline.md)
- [docs/ecosystem.md](../../docs/ecosystem.md)
