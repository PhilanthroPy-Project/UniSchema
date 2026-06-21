-- Daily engagement rollup by constituent email for dashboards and ML features

{{ config(materialized='table') }}

select
  date(created_at) as event_date,
  constituent_email,
  count(*) as event_count,
  sum(case when event_type = 'DONATION' then 1 else 0 end) as donation_count,
  sum(case when event_type = 'EVENT_REGISTRATION' then 1 else 0 end) as registration_count,
  sum(case when event_type = 'EMAIL_CLICK' then 1 else 0 end) as email_click_count,
  sum(coalesce(amount, 0)) as total_donation_amount,
  count(distinct source_system) as source_system_count
from {{ ref('stg_constituent_events') }}
group by 1, 2
