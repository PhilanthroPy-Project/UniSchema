# Anonymized pilot example (template)

> Replace bracketed placeholders when publishing a real case study. Remove this note.

## Summary

**[Mid-size private university]** unified GiveCampus and Cvent webhooks with UniSchema to feed a **[Snowflake / local analytics]** pipeline. Pilot duration: **[4 weeks]**.

## Problem

- GiveCampus donations and Cvent registrations arrived in different JSON shapes
- Custom Lambda scripts broke when vendor payloads changed
- Advancement analysts needed one report for cross-channel engagement

## Solution

1. Deployed UniSchema on **[Fly.io]** with SQLite volume + S3 egress
2. Registered webhooks from GiveCampus and Cvent dashboards
3. Used default mappers (no canvas overrides required initially)
4. Ran [egress_report.ipynb](../../examples/downstream/egress_report.ipynb) for stakeholder demo

## Results

| Metric | Before | After pilot |
|--------|--------|-------------|
| Time to add new vendor field | ~2 days (script edit) | ~30 min (canvas) |
| Failed webhook visibility | Log grep | Drift queue UI |
| Downstream schema variants | 2 | 1 ConstituentEvent |

## Lessons learned

- **Worked:** 15-minute Docker demo convinced IT; S3 NDJSON batches fit existing Airflow stub
- **Blocked:** Production canvas sync required operator to share `MAPPING_SYNC_TOKEN` (now documented in admin guide)
- **Next:** Evaluate Blackbaud mapper for CRM golden-record join

## Quote (optional)

> "[UniSchema let us prove unified constituent events without buying an iPaaS.]"

— **[Advancement Data Engineer]**, anonymized
