# Pilot case study template

Use this structure to document UniSchema pilots (anonymize institution names and PII).

## Institution profile

| Field | Value |
|-------|-------|
| Institution type | e.g. private R1, liberal arts, public system |
| Advancement team size | e.g. 3 FTE + 1 data analyst |
| Primary vendors | e.g. GiveCampus + Cvent |
| Downstream stack | e.g. Snowflake + dbt + Python ML |

## Problem

What fragmented webhook / integration pain existed before UniSchema?

- Number of vendor JSON shapes
- Manual ETL effort (hours/week)
- Blockers for ML or dashboard projects

## Solution

| Component | Choice |
|-----------|--------|
| Deploy | Docker Compose pilot / Fly.io / Railway |
| Database | SQLite / Postgres |
| Egress | Local / S3 |
| Vendors wired | List webhook endpoints configured |

## Timeline

| Milestone | Duration | Notes |
|-----------|----------|-------|
| First webhook ingested | e.g. 15 min | `npm run demo` |
| First production-shaped test | e.g. Day 2 | Real vendor sandbox |
| Stakeholder demo | e.g. Day 5 | Notebook / downstream report |
| Production decision | e.g. Week 4 | Go / no-go |

## Results

- Events normalized per week (pilot volume)
- Fields mapped via canvas vs built-in mapper
- Downstream artifact produced (table, model, dashboard)
- Blockers encountered (Tier 3 payloads, schema mismatch, ops)

## Recommendations for similar institutions

What would you tell a peer advancement shop evaluating UniSchema?

## Reference pilot (synthetic)

**Mid-size private university — GiveCampus + Cvent pilot**

A 2-person advancement analytics team spent years maintaining separate Python scripts for GiveCampus gifts and Cvent registrations. UniSchema pilot on Docker Compose took 15 minutes to first ConstituentEvent; downstream notebook showed unified donation totals by source system for a VP presentation the same afternoon.

After week 2, the team pointed GiveCampus sandbox webhooks at a Fly.io deploy with S3 egress. dbt staging model loaded NDJSON batches into Snowflake. Blocker: Cvent `EventCode` prefix differed from fixtures — resolved via canvas metadata mapping, not code change.

**Outcome:** Production go-ahead for Tier 1 vendors; Slate deferred pending real payload verification.
