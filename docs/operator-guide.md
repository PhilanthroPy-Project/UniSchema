# Operator guide — deployment & pipelines

This guide is for the **person who runs UniSchema**: platform engineer, devops, or the "one technical person" on an advancement team. Mapping canvas users should read [admin-guide.md](./admin-guide.md) instead.

## Quick deploy options

| Method | Best for | Guide |
|--------|----------|-------|
| **Docker Compose** | Local pilot, first webhook in 15 min | [README](../README.md#quick-start-15-minutes) |
| **Fly.io** | Managed container + volume, low ops | [deploy/README.md](../deploy/README.md) |
| **Railway** | Git-push deploy, managed secrets | [deploy/README.md](../deploy/README.md) |
| **Self-built Docker image** | Your own K8s / VM | `Dockerfile` + [README](../README.md#production-deployment) |

There is **no hosted UniSchema SaaS yet**. v0.4.2 expects you to run the container or Node process yourself.

## Architecture (one URL)

```
                    ┌──────────────────────────────────────┐
  Vendor webhooks ──┤  /webhooks/{vendor}                  │
                    │  HMAC verify → async ingest          │
                    │  /api/*        admin + drift APIs    │
                    │  /*            React mapping UI      │
                    └──────────────┬───────────────────────┘
                                   │ push
                                   ▼
                    ┌──────────────────────────────────────┐
                    │  EGRESS_TARGET=local | s3 | none     │
                    │  ConstituentEvent JSON / NDJSON      │
                    └──────────────┬───────────────────────┘
                                   │
                                   ▼
                    Airflow / Python / warehouse (see examples/)
```

## Environment variables (production checklist)

Copy `.env.example` → `.env`. Minimum for production donor data:

```bash
NODE_ENV=production
SERVE_FRONTEND=true

# Webhooks — fail closed
WEBHOOK_SIGNATURE_REQUIRED=true
GIVECAMPUS_WEBHOOK_SECRET=<from vendor dashboard>
CVENT_WEBHOOK_SECRET=<from vendor dashboard>

# Admin API
MAPPING_SYNC_REQUIRED=true
MAPPING_SYNC_TOKEN=<long random string>

# Egress — S3 recommended for analytics
EGRESS_TARGET=s3
EGRESS_S3_BUCKET=your-data-lake
EGRESS_S3_PREFIX=constituent-events
AWS_REGION=us-east-1

# Optional Airflow trigger after each NDJSON batch
# AIRFLOW_WEBHOOK_URL=...
# AIRFLOW_WEBHOOK_SECRET=...

# SQLite path (pilot) — mount a persistent volume
DATABASE_URL=/app/data/unischema.db
EGRESS_LOCAL_DIR=/app/data/egress   # when EGRESS_TARGET=local
```

### Webhook URLs to register with vendors

| Vendor | POST URL |
|--------|----------|
| GiveCampus | `https://<host>/webhooks/givecampus` |
| Cvent | `https://<host>/webhooks/cvent` |

Signature headers: `X-GiveCampus-Signature`, `X-Cvent-Signature` (HMAC SHA-256 over raw body).

### Edge protection (recommended)

```bash
WEBHOOK_IP_ALLOWLIST=203.0.113.10,198.51.100.0/24   # vendor egress IPs
WEBHOOK_RATE_LIMIT_MAX=120                           # per IP per minute (default)
WEBHOOK_RATE_LIMIT_WINDOW_MS=60000
```

Also terminate TLS and rate-limit at nginx / Cloudflare in front of the app.

## Egress modes

| `EGRESS_TARGET` | Output | Downstream |
|-----------------|--------|------------|
| `local` | `data/egress/constituent-events/{vendor}/{Y}/{M}/{D}/{eventId}.json` | [examples/downstream](../examples/downstream/) |
| `s3` | `{prefix}/batches/{Y}/{M}/{D}/{batchId}.ndjson` + `.manifest.json` | Same examples + Airflow |
| `none` | SQLite staging only | Legacy `GET /api/egress/events` pull |

S3 micro-batch thresholds (defaults): 5 MB or 2 minutes idle — see `.env.example`.

## Persistence & backups

**Pilot (v0.4.2):** SQLite at `DATABASE_URL` + local/S3 egress files.

- Mount `data/` as a Docker volume (see `docker-compose.yml`).
- Back up `unischema.db` and your S3 prefix on a schedule.
- SQLite uses WAL mode — safe for single-process writes.

**Before production donor volume:** read [limitations-and-roadmap.md](./limitations-and-roadmap.md#scale--database) for Postgres and horizontal scaling plans.

## Health & monitoring

```bash
curl -sf https://<host>/health
# {"status":"ok","driftPendingCount":0,...}
```

`driftPendingCount` is the agent work queue depth — pending drift events awaiting operator review. Non-zero values mean vendor payloads failed Zod validation and need investigation.

Watch logs for:

- `[egress] published constituent event` — success
- `[egress] failed to publish` — S3 creds or network
- `Recovered N stale pending ingestion(s)` — crash recovery on startup

Poll failed ingestions via `GET /webhooks/ingestions/{id}` or inspect drift queue `GET /api/drift/events?status=pending`.

## Drift queue (operator workflow)

When a vendor changes payload shape, Zod validation fails and the raw payload lands in **drift_events**.

1. List pending: `GET /api/drift/events?status=pending`
2. Fix mapper or canvas mapping
3. Replay or wait for next webhook

### Drift agent (experimental — not auto-healing)

The Python agent in `agents/drift_runner/` is **assistive only**:

- Proposes mapper patches under `agents/output/`
- A **human must review, test, and merge** code changes
- Not safe to run unsupervised against production

See [agents/README.md](../agents/README.md).

## Adding vendor #3

Follow the checklist in [adding-a-vendor.md](./adding-a-vendor.md). The canvas alone cannot register a new webhook route.

## Downstream pipeline

Prove value to stakeholders with the sample scripts in [examples/downstream/](../examples/downstream/README.md) — they read egress JSON/NDJSON and print donation totals by source system.

## Security testing before go-live

```bash
npm run test:security
npm test -- tests/integration/webhookSecurity.test.ts
```

Never commit `.env` or vendor secrets to git.
