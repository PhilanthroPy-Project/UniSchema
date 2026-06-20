-- Staging model for UniSchema ConstituentEvent NDJSON in S3
-- Adjust source() to match your external table / stage definition.

{{ config(materialized='view') }}

select
  event_id,
  constituent_email,
  first_name,
  last_name,
  event_type,
  source_system,
  amount,
  currency,
  normalized_metadata,
  payload,
  created_at
from {{ source('unischema', 'constituent_events_raw') }}
