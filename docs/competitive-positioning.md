# Competitive positioning

When should a university advancement team choose UniSchema over alternatives?

## Problem statement

Advancement shops receive **fragmented webhook JSON** from GiveCampus, Cvent, Slate, NPSP, and others. Each payload shape differs. Teams typically respond with:

- One-off Lambda functions per vendor
- Zapier/Make flows
- Manual CSV exports
- Generic ETL from CRM APIs (not real-time webhooks)

UniSchema + PhilanthroPy targets the **real-time normalization + ML scoring** path for advancement-specific vendors.

## Comparison matrix

| Approach | Strengths | Weaknesses vs UniSchema |
|----------|-----------|-------------------------|
| **Custom Lambdas per vendor** | Full control, serverless | No shared schema, duplicated HMAC logic, no visual mapper, hard to test |
| **Zapier / Make** | Fast for simple flows | Expensive at volume, no strict Zod validation, no drift queue, not advancement-specific |
| **Fivetran / Airbyte** | Great for bulk CRM/API sync | Not built for sparse advancement webhooks; no HMAC header conventions; no ConstituentEvent schema |
| **Vendor-native exports** | Authoritative from source | Batch not real-time; still N shapes for N vendors |
| **UniSchema** | Strict schema, 7 vendors, canvas, egress, PhilanthroPy bridge | Self-host ops; opinionated schema; new vendors need code |

## Where UniSchema wins

- **Multi-vendor webhook ingest** with one `ConstituentEvent` output
- **Advancement-specific** vendor coverage (GiveCampus, Cvent, Slate, NPSP)
- **Test-driven mappers** — Vitest as contract for AI-assisted drift fixes
- **Visual metadata mapping** for non-developers (after vendor registration)
- **Downstream kit** — dbt, PhilanthroPy, notebook, CRM join examples

## Where UniSchema does not compete

- **Full CRM replacement** or bi-directional Slate/Salesforce sync
- **Enterprise iPaaS** with 500+ connectors
- **Managed multi-tenant SaaS** (hosted tier is RFC — [hosted-tier-rfc.md](./hosted-tier-rfc.md))
- **Bulk historical backfill** — webhooks are forward-looking; pair with CRM export for history

## Recommended combinations

| Stack | Pattern |
|-------|---------|
| UniSchema + Snowflake + dbt + PhilanthroPy | Real-time events + warehouse features + ML scores |
| UniSchema + local egress + notebook | 15-minute pilot proof for leadership |
| UniSchema + Airflow | S3 batch trigger → warehouse load |
| Fivetran (CRM) + UniSchema (webhooks) | Complementary — not either/or |

## Evaluation checklist

Ask before adopting:

1. Do we have **2+ webhook vendors** with no shared event model?
2. Can we **self-host** Node + secrets + S3?
3. Does **ConstituentEvent** fit our analytics model? ([limitations](./limitations-and-roadmap.md))
4. Do we have someone to **verify Tier 3** payloads against our instances?
5. Is **PhilanthroPy** (or another ML stack) the scoring layer we want?

## Related

- [ecosystem.md](./ecosystem.md)
- [adoption-checklist.md](./adoption-checklist.md)
