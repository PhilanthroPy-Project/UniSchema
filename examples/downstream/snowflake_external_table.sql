# Snowflake external table example (ConstituentEvent NDJSON)

After UniSchema flushes S3 batches, create an external table over the NDJSON prefix.

```sql
CREATE OR REPLACE FILE FORMAT unischema_ndjson
  TYPE = JSON
  STRIP_OUTER_ARRAY = FALSE;

CREATE OR REPLACE STAGE unischema_egress
  URL = 's3://your-bucket/constituent-events/batches/'
  CREDENTIALS = (AWS_KEY_ID = '...' AWS_SECRET_KEY = '...')
  FILE_FORMAT = unischema_ndjson;

CREATE OR REPLACE EXTERNAL TABLE raw.unischema_constituent_events (
  eventId VARCHAR AS (value:eventId::VARCHAR),
  constituentEmail VARCHAR AS (value:constituentEmail::VARCHAR),
  eventType VARCHAR AS (value:eventType::VARCHAR),
  sourceSystem VARCHAR AS (value:sourceSystem::VARCHAR),
  amount NUMBER AS (value:amount::NUMBER),
  createdAt TIMESTAMP_TZ AS (value:createdAt::TIMESTAMP_TZ),
  payload VARIANT AS (value:payload)
)
  LOCATION = @unischema_egress
  AUTO_REFRESH = TRUE;
```

Query:

```sql
SELECT sourceSystem, eventType, COUNT(*), SUM(amount)
FROM raw.unischema_constituent_events
GROUP BY 1, 2;
```

For BigQuery, use `LOAD DATA` from GCS after copying S3 batches, or federate via external connection.

See [dbt staging model](../dbt/README.md) for transformation layer.
