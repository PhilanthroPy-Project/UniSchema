# UniSchema

Open-source webhook unification for university advancement teams. UniSchema ingests vendor-specific webhook payloads (Cvent, GiveCampus, and more), verifies sender identity with HMAC signatures, validates with Zod, and maps them into a single **ConstituentEvent** master schema. Validated events are pushed to object storage for downstream analytics pipelines.

## Project structure

```
UniSchema/
├── src/
│   ├── config/           # Vendor webhook route configs (secrets, signature headers)
│   ├── db/               # Drizzle + SQLite persistence
│   ├── egress/           # Push-based export (local filesystem or S3)
│   ├── mappers/          # Vendor → master schema mappers (+ dynamic canvas mapper)
│   ├── middleware/       # Async webhook handler with HMAC verification
│   ├── routes/           # Mapping sync, egress, drift, ingestion status APIs
│   ├── store/            # Mappings, ingestions, drift queue, recovery workers
│   └── utils/            # Drift capture, webhook auth, signature helpers
├── tests/                # Vitest — mappers, security, webhooks, egress, recovery
├── agents/drift_runner/  # Python LLM agent for schema-drift mapper patches
├── frontend/             # React Flow visual schema mapper (Vite + Tailwind)
└── .github/workflows/    # CI validation pipeline
```

## Backend

### Requirements

- Node.js 20+
- npm

### Setup

```bash
npm install
cp .env.example .env    # configure secrets and egress target
npm run dev             # watch mode on http://localhost:3000
npm start               # production-style start
npm test                # run full backend test suite
```

The server listens on port `3000` by default. Override with the `PORT` environment variable.

SQLite data is stored at `data/unischema.db` by default (`DATABASE_URL` to override).

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/webhooks/cvent` | Accept Cvent payload → async map to `ConstituentEvent` (**202**) |
| `POST` | `/webhooks/givecampus` | Accept GiveCampus payload → async map (**202**) |
| `GET` | `/webhooks/ingestions/:id` | Poll async ingestion status / result / errors |
| `POST` | `/mappings/sync` | Persist admin canvas mapping configuration |
| `GET` | `/mappings/:vendor` | Load saved mapping configuration |
| `GET` | `/drift/events` | List schema-drift dead-letter queue entries |
| `POST` | `/drift/events/:id/ack` | Mark drift event processed (agent auth required) |
| `GET` | `/egress/events` | Legacy pull-based staging (dev/fallback) |
| `POST` | `/egress/ack` | Acknowledge exported staging rows |

**Webhook flow:** valid JSON → **202 Accepted** with `ingestionId` → background mapping → push to egress → SQLite staging updated. Invalid JSON returns **400**; bad HMAC signature returns **401**.

### Security — webhook HMAC verification

Production deployments **must** configure shared secrets so only genuine vendor traffic is ingested. Without this, anyone who discovers your endpoint can POST spoofed events and poison downstream models.

| Vendor | Env var | Signature header |
|--------|---------|------------------|
| GiveCampus | `GIVECAMPUS_WEBHOOK_SECRET` | `X-GiveCampus-Signature` |
| Cvent | `CVENT_WEBHOOK_SECRET` | `X-Cvent-Signature` |

The handler reads the **raw request body**, computes HMAC SHA-256 with the shared secret, and compares it to the vendor header using a timing-safe check. Mismatches return **401** before any ingestion record is created.

```bash
# Production — fail closed if secrets are missing
NODE_ENV=production
WEBHOOK_SIGNATURE_REQUIRED=true
GIVECAMPUS_WEBHOOK_SECRET=<from GiveCampus dashboard>
CVENT_WEBHOOK_SECRET=<from Cvent dashboard>
```

In local development, verification is skipped when secrets are unset so you can test with curl. Set the secrets in `.env` to exercise the full HMAC path.

### Reliability — async ingestions & recovery

Webhooks acknowledge immediately (**202**) and process in the background. On startup, `server.ts` runs two recovery routines:

1. **`recoverPendingIngestions()`** — re-processes ingestions stuck in `pending` for >5 minutes (crash / dropped microtask).
2. **`recoverPendingEgress()`** — re-publishes staged events that never reached object storage.

### Egress — push to object storage

UniSchema pushes validated `ConstituentEvent` objects to a datastore on successful mapping. Downstream Airflow DAGs or Python pipelines read from storage instead of polling HTTP.

| `EGRESS_TARGET` | Behavior |
|-----------------|----------|
| `local` (default) | Writes JSON to `data/egress/constituent-events/{vendor}/{date}/{eventId}.json` |
| `s3` | Micro-batches NDJSON to `s3://{bucket}/{prefix}/batches/{YYYY}/{MM}/{DD}/{batchId}.ndjson` |
| `none` | SQLite staging only (legacy pull via `/egress/events`) |

S3 egress buffers events in memory and flushes when either threshold is reached:

- **Size:** `EGRESS_S3_BATCH_MAX_BYTES` (default 5 MB)
- **Time:** `EGRESS_S3_FLUSH_INTERVAL_MS` (default 2 minutes)

Each flush writes two objects:

1. `{batchId}.ndjson` — newline-delimited `ConstituentEvent` records
2. `{batchId}.manifest.json` — batch metadata for downstream orchestration

```bash
EGRESS_TARGET=s3
EGRESS_S3_BUCKET=your-data-lake-bucket
EGRESS_S3_PREFIX=constituent-events
EGRESS_S3_BATCH_MAX_BYTES=5242880
EGRESS_S3_FLUSH_INTERVAL_MS=120000
AWS_REGION=us-east-1
```

#### Airflow integration

After each batch upload, UniSchema can notify your Airflow environment via webhook:

```bash
AIRFLOW_WEBHOOK_URL=https://airflow.example.com/api/v1/dags/unischema_ingest/dagRuns
AIRFLOW_WEBHOOK_SECRET=shared-secret-for-airflow-rest-api
```

The POST body includes `event: egress.batch.ready`, the `s3Uri`, record count, byte size, and vendor list — suitable for Airflow `conf` passthrough. Alternatively, configure an **S3 event notification** on `*.manifest.json` objects to trigger the same DAG without a webhook.

### Master schema

All vendors normalize into `ConstituentEvent`:

| Field | Type | Notes |
|-------|------|-------|
| `eventId` | UUID | Deterministic per vendor + source id |
| `constituentEmail` | email | Primary constituent identifier |
| `firstName`, `lastName` | string | Optional |
| `eventType` | enum | `EVENT_REGISTRATION`, `DONATION`, `EMAIL_CLICK` |
| `sourceSystem` | string | e.g. `CVENT`, `GIVECAMPUS` |
| `amount`, `currency` | number, string | Optional (donations) |
| `normalizedMetadata` | object | Vendor-specific fields mapped via admin canvas |
| `payload` | object | Original vendor payload preserved |
| `createdAt` | ISO datetime | Ingestion timestamp |

Built-in mappers live in `src/mappers/`. Admin-defined canvas mappings take precedence when synced via `/mappings/sync`.

### Schema drift capture

When Zod validation fails on a production payload, UniSchema enqueues the failure to a **dead-letter table** (`drift_events`). The edge API never writes to the local filesystem — test generation and mapper patches are handled by isolated workers.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/drift/events?status=pending` | List drift events (metadata only) |
| `GET` | `/drift/events?status=pending&includePayload=true` | Full payloads — requires `Authorization: Bearer $DRIFT_AGENT_TOKEN` |
| `POST` | `/drift/events/:id/ack` | Mark a drift event as processed (agent auth required) |

#### Drift agent runner

The Python agent in `agents/drift_runner/` polls pending drift events, writes Vitest fixtures, and uses LlamaIndex + OpenAI to propose mapper patches under `agents/output/`.

```bash
pip install -r agents/drift_runner/requirements.txt

# Against a local SQLite copy
python -m agents.drift_runner --database data/unischema.db

# Against production API
python -m agents.drift_runner \
  --api-url https://unischema.example.com \
  --token "$DRIFT_AGENT_TOKEN"
```

GitHub Actions runs this hourly via `.github/workflows/drift-agent.yml`. Configure repository secrets: `DRIFT_AGENT_TOKEN`, `UNISCHEMA_API_URL`, and `OPENAI_API_KEY`.

## Frontend — Visual Schema Mapper

A drag-and-drop canvas for database administrators to visually connect external webhook fields to the master schema.

### Setup

```bash
cd frontend
npm install
npm run dev      # Vite dev server
npm run build    # production build
```

Built with **React**, **React Flow**, **Tailwind CSS**, and **Lucide** icons.

The canvas loads saved mappings from `GET /mappings/:vendor` on mount and syncs changes via `POST /mappings/sync`.

## Testing

UniSchema enforces a multi-layer test contract with **security as the first CI gate**:

| Suite | Location | Purpose |
|-------|----------|---------|
| **Security guard** | `tests/security.test.ts` | Secret scanning, forbidden tracked paths, `.gitignore` enforcement |
| **Webhook security** | `tests/webhookSecurity.test.ts` | HMAC spoof rejection, tampered-body detection, fail-closed misconfiguration |
| **Webhook auth** | `tests/webhookAuth.test.ts` | Production vs dev signature policy |
| **Webhook handler** | `tests/webhookHandler.test.ts` | Signature verification, async ingestions, drift on failure |
| **Webhooks (integration)** | `tests/webhooks.test.ts` | Full route integration, egress push, admin mappings |
| **Recovery** | `tests/recoveryWorker.test.ts` | Stale ingestion + egress recovery |
| **Egress** | `tests/egressPublisher.test.ts`, `tests/s3Publisher.test.ts`, `tests/batchManifest.test.ts`, `tests/airflowNotifier.test.ts` | Local/S3 micro-batching and Airflow notifications |
| **Drift agent API** | `tests/driftAgentApi.test.ts` | Agent auth, payload export, ack flow |
| **Mapper tests** | `tests/mappers.test.ts` | Vendor payload → master schema mapping |
| **Schema tests** | `tests/schema.test.ts` | `ConstituentEvent` Zod invariants |
| **Frontend tests** | `frontend/tests/` | Visual mapper utility logic |

Run all commands from the **repository root** (`UniSchema/`), not from `frontend/`.

**Full local validation (matches CI):**

```bash
npm run validate
```

**Security first (recommended before every PR):**

```bash
npm run test:security
npm run test -- tests/webhookSecurity.test.ts tests/webhookAuth.test.ts tests/webhookHandler.test.ts
```

**Backend only:**

```bash
npm run typecheck
npm test
npm run test:coverage
```

**Backend + frontend:**

```bash
npm run test:all
```

CI runs on every push to `main` and on pull requests via the **Agent Pipeline Validation** workflow. The pipeline blocks merges unless the **security guard passes first**, then backend typecheck, coverage-backed tests, frontend typecheck, frontend tests, and production build all pass.

## Security

This repository is public. Treat credentials as compromised if they ever appear in git history.

**Local setup**

- Copy `.env.example` to `.env` for local configuration.
- Never commit `.env`, key files (`.pem`, `.key`), or credential JSON.

**Automated guardrails**

- `.gitignore` blocks common secret paths, local SQLite data, and egress artifacts.
- `tests/security.test.ts` scans tracked files for high-confidence secret patterns (GitHub tokens, AWS keys, private keys, etc.) and fails if forbidden paths are tracked.
- `tests/webhookSecurity.test.ts` verifies spoofed webhooks are rejected before ingestion.
- CI runs the security suite **first** and blocks tracked `.env` files before any other jobs start.

Run the guards locally before opening a PR:

```bash
npm run test:security
npm test -- tests/webhookSecurity.test.ts
```

## License

MIT
