# Minimal dbt project stub for UniSchema S3 NDJSON egress

This folder demonstrates how to stage ConstituentEvent batches in a warehouse after UniSchema S3 push.

## Layout

```
dbt/
├── dbt_project.yml
└── models/staging/stg_constituent_events.sql
```

## Assumptions

- S3 prefix: `s3://your-bucket/constituent-events/` (matches `EGRESS_S3_PREFIX`)
- Files: NDJSON batches + `.manifest.json` sidecars from UniSchema egress

## Quick start

1. Copy this folder to your dbt project or use as a submodule.
2. Configure `profiles.yml` with your warehouse (Snowflake, BigQuery, Redshift).
3. Create an external table or stage pointing at the S3 prefix.
4. Run:

```bash
dbt run --select stg_constituent_events
```

## Model

See [models/staging/stg_constituent_events.sql](./models/staging/stg_constituent_events.sql) for column mapping aligned with `ConstituentEvent` v0.2.
