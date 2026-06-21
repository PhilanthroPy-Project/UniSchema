# Adoption checklist

Week-by-week path from evaluation to production UniSchema deployment.

## Week 1 — Evaluate (pilot)

| Day | Task | Success signal |
|-----|------|----------------|
| 1 | `docker compose -f docker-compose.pilot.yml up --build` | Health check returns 200 |
| 1 | Open mapping canvas at `:3000` | Vendor dropdown shows 6 vendors |
| 2 | `npm run demo` | ConstituentEvent JSON in `data/egress/` |
| 2 | `npm run downstream-demo` | Egress report + CRM join output |
| 3 | Review [limitations-and-roadmap.md](./limitations-and-roadmap.md) | Team accepts schema + tier model |
| 4 | Point one vendor test webhook (GiveCampus or Cvent) | Ingestion status `completed` |
| 5 | Share [egress_report.ipynb](../examples/downstream/egress_report.ipynb) with stakeholders | Leadership sees normalized data |

## Week 2 — Configure vendors

| Day | Task | Owner |
|-----|------|-------|
| 1–2 | Set all 6 webhook HMAC secrets in `.env` | Operator |
| 2 | Configure `MAPPING_SYNC_TOKEN` + `DRIFT_AGENT_TOKEN` | Operator |
| 3 | Verify Tier 3 vendors (Blackbaud, NPSP, Slate) with real payloads | Admin + Developer |
| 4 | Canvas mapping for org-specific `normalizedMetadata` fields | Admin |
| 5 | Document vendor webhook URLs for vendor portals | Operator |

## Week 3 — Production egress

| Day | Task | Success signal |
|-----|------|----------------|
| 1 | Terraform S3 bucket (`deploy/terraform/s3-egress/`) | Bucket created |
| 2 | Set `EGRESS_TARGET=s3` + AWS credentials | S3 NDJSON batch appears |
| 3 | Run [downstream-pipeline.md](./downstream-pipeline.md) Snowflake/dbt path | Staging model runs |
| 4 | Optional: wire `AIRFLOW_WEBHOOK_URL` | DAG triggered on batch |
| 5 | Load test: `./scripts/load-benchmark.sh` | Throughput within rate limits |

## Week 4 — Trust and handoff

| Day | Task | Owner |
|-----|------|-------|
| 1 | Complete [operator-guide.md](./operator-guide.md) production checklist | Operator |
| 2 | Enable OIDC or oauth2-proxy for admin UI | Operator |
| 3 | Review mapping audit log after canvas changes | Compliance |
| 4 | Publish internal case study using [pilot-template.md](./case-studies/pilot-template.md) | Project lead |
| 5 | Go/no-go for production donor data | Leadership |

## When to scale beyond SQLite

- Need 2+ app instances (HA)
- Sustained >500 webhooks/minute
- See [postgres.md](./postgres.md) and [docker-compose.scale.yml](../docker-compose.scale.yml)
