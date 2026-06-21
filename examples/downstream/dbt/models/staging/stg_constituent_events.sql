-- Staging: camelCase ConstituentEvent JSON → snake_case analytics columns

{{ config(materialized='view') }}

select
  eventId as event_id,
  constituentEmail as constituent_email,
  firstName as first_name,
  lastName as last_name,
  eventType as event_type,
  sourceSystem as source_system,
  amount,
  currency,
  normalizedMetadata as normalized_metadata,
  payload,
  createdAt as created_at
from {{ source('unischema', 'constituent_events_raw') }}
