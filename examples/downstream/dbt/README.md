# Minimal dbt project for UniSchema S3 NDJSON egress

Stages ConstituentEvent batches after UniSchema S3 push. The `mart_constituent_rfm_features` model outputs columns compatible with PhilanthroPy batch scoring.

## Layout

```
dbt/
├── dbt_project.yml
├── models/
│   ├── sources.yml
│   ├── staging/
│   │   ├── stg_constituent_events.sql
│   │   └── schema.yml
│   └── marts/
│       ├── mart_constituent_engagement_daily.sql
│       ├── mart_constituent_rfm_features.sql
│       └── schema.yml
```

## Quick start

1. Create the Snowflake external table from [../snowflake_external_table.sql](../snowflake_external_table.sql).
2. Configure `profiles.yml` for your warehouse.
3. Run:

```bash
dbt run
```

## PhilanthroPy consumption

Export `mart_constituent_rfm_features` to CSV or query via Python:

```python
# Warehouse export columns align with unischema_features.py contract
# See docs/philanthropy-integration.md
```

Column contract documented in `models/marts/schema.yml`.

See [../../../docs/downstream-pipeline.md](../../../docs/downstream-pipeline.md) for the full pilot → warehouse path.
