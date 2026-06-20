# dbt staging model for ConstituentEvent NDJSON batches

Load UniSchema S3 egress batches into your warehouse, then apply this staging model.

## Assumptions

- Raw table: `raw_unischema.constituent_events` (one row per NDJSON line, JSON column `data`)
- dbt project with `staging` folder

## Model: `models/staging/stg_constituent_events.sql`

```sql
with source as (
  select
    data:eventId::string as event_id,
    lower(data:constituentEmail::string) as constituent_email,
    data:firstName::string as first_name,
    data:lastName::string as last_name,
    data:eventType::string as event_type,
    data:sourceSystem::string as source_system,
    data:amount::number as amount,
    data:currency::string as currency,
    data:normalizedMetadata as normalized_metadata,
    data:createdAt::timestamp_tz as created_at,
    current_timestamp() as loaded_at
  from {{ source('unischema', 'constituent_events') }}
)

select * from source
```

## Source definition (`models/sources.yml`)

```yaml
sources:
  - name: unischema
    database: analytics
    schema: raw_unischema
    tables:
      - name: constituent_events
        description: NDJSON lines from UniSchema S3 egress batches
```

## Next steps

- Join `constituent_email` to CRM golden record
- Aggregate by `source_system` and `event_type` for advancement dashboards

See also [read_s3_ndjson_batch.py](../read_s3_ndjson_batch.py) for loading batches into files before warehouse ingest.
