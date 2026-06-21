-- Per-constituent RFM-style features for PhilanthroPy batch scoring
-- Column contract: docs/philanthropy-integration.md

{{ config(materialized='table') }}

with events as (
  select * from {{ ref('stg_constituent_events') }}
),

per_constituent as (
  select
    constituent_email,
    min(created_at) as first_event_at,
    max(created_at) as last_event_at,
    max(case when event_type = 'DONATION' then created_at end) as last_donation_at,
    count(*) as event_count,
    sum(case when event_type = 'DONATION' then 1 else 0 end) as donation_count,
    sum(case when event_type = 'EVENT_REGISTRATION' then 1 else 0 end) as registration_count,
    sum(case when event_type = 'EMAIL_CLICK' then 1 else 0 end) as email_click_count,
    sum(coalesce(amount, 0)) as total_amount,
    sum(coalesce(amount, 0)) as total_gift_amount,
    sum(case when event_type = 'EVENT_REGISTRATION' then 1 else 0 end) as event_attendance_count,
    datediff('day', max(created_at), current_date()) as recency_days,
    datediff('day', min(created_at), current_date()) / 365.25 as years_active
  from events
  group by 1
)

select
  constituent_email,
  donation_count,
  registration_count,
  email_click_count,
  total_amount,
  total_gift_amount,
  event_attendance_count,
  last_donation_at as last_donation_date,
  last_event_at as last_event_date,
  first_event_at as first_event_date,
  years_active,
  recency_days,
  event_count
from per_constituent
