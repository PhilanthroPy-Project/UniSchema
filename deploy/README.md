# Deploy UniSchema to the cloud

UniSchema ships as a **single Docker image** (API + admin UI). Pick a platform that supports persistent volumes for SQLite and secrets injection.

| Platform | Template | Persistent data |
|----------|----------|-----------------|
| **Fly.io** | [`fly.toml`](./fly.toml) | Fly volume → `/app/data` |
| **Railway** | [`railway.toml`](./railway.toml) | Railway volume mount |
| **Any container host** | [`Dockerfile`](../Dockerfile) | Bind-mount or volume |

There is **no official managed UniSchema SaaS** in v0.1.0. These templates reduce ops burden; you still own secrets, S3, and vendor webhook URLs.

## Minimum viable cloud (1–2 person advancement shop)

You do **not** need Airflow, Kubernetes, or Postgres to prove value.

| Component | Pilot choice | Skip for now |
|-----------|--------------|--------------|
| UniSchema app | Fly.io or Railway (free/low tiers) | Self-managed K8s |
| Database | SQLite on a platform volume | Postgres |
| Egress | S3 bucket ([Terraform](./terraform/README.md)) | Airflow |
| Downstream | [Notebook](../examples/downstream/egress_report.ipynb) or Python script | Full warehouse |

**Typical monthly cost (pilot):** Fly/Railway ~$0–5 + S3 pennies + no Airflow.

### Fastest path

1. `fly launch --config deploy/fly.toml` (or Railway from GitHub)
2. `terraform apply` in `deploy/terraform/s3-egress/` for the bucket
3. Set secrets from `.env.example` (webhook secrets + S3 creds)
4. `BASE_URL=https://your-app.fly.dev npm run demo`
5. Open [egress_report.ipynb](../examples/downstream/egress_report.ipynb) for a stakeholder-friendly chart

Operator details: [docs/operator-guide.md](../docs/operator-guide.md)

## Prerequisites (all platforms)

1. S3 bucket (recommended) or accept local egress on a volume
2. Webhook secrets from GiveCampus / Cvent dashboards
3. `MAPPING_SYNC_TOKEN` — long random string for canvas sync
4. AWS credentials (if `EGRESS_TARGET=s3`) — IAM user or instance role

Copy variables from [`.env.example`](../.env.example). Set them as platform secrets, not in git.

---

## Fly.io

### One-time setup

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
fly launch --no-deploy --config deploy/fly.toml
```

Create a volume for SQLite + local egress fallback:

```bash
fly volumes create unischema_data --size 1 --region ord
```

Attach secrets (example):

```bash
fly secrets set \
  NODE_ENV=production \
  SERVE_FRONTEND=true \
  WEBHOOK_SIGNATURE_REQUIRED=true \
  GIVECAMPUS_WEBHOOK_SECRET=... \
  CVENT_WEBHOOK_SECRET=... \
  MAPPING_SYNC_REQUIRED=true \
  MAPPING_SYNC_TOKEN=... \
  EGRESS_TARGET=s3 \
  EGRESS_S3_BUCKET=your-bucket \
  EGRESS_S3_PREFIX=constituent-events \
  AWS_ACCESS_KEY_ID=... \
  AWS_SECRET_ACCESS_KEY=... \
  AWS_REGION=us-east-1
```

Deploy:

```bash
fly deploy --config deploy/fly.toml
```

Register webhooks: `https://<your-app>.fly.dev/webhooks/givecampus`

Health check: `https://<your-app>.fly.dev/health`

---

## Railway

1. New project → **Deploy from GitHub repo**
2. Railway detects [`railway.toml`](./railway.toml) and builds from root `Dockerfile`
3. Add a **volume** mounted at `/app/data`
4. Set environment variables from `.env.example` in the Railway dashboard
5. Generate domain → use as webhook base URL

Railway auto-assigns `PORT`; the Dockerfile respects `PORT=3000`.

---

## Terraform

Full Terraform modules (VPC, RDS, etc.) are **not** included in v0.1.0 — most advancement pilots start with Fly/Railway + S3.

If you need IaC for AWS (ECS + RDS + S3), open an issue with your constraints; community contributions welcome.

---

## Post-deploy verification

```bash
curl -sf https://<host>/health
curl -sf https://<host>/api/mappings/givecampus   # 404 OK if no mapping yet

# From repo clone:
BASE_URL=https://<host> ./scripts/demo-webhook.sh
```

Then configure S3 lifecycle rules and downstream jobs — see [examples/downstream/README.md](../examples/downstream/README.md).

Operator checklist: [docs/operator-guide.md](../docs/operator-guide.md)

---

## Multi-instance production

When one Fly/Railway instance is not enough:

| Component | Requirement |
|-----------|-------------|
| Database | Postgres (`DATABASE_URL`) — shared ingestion state |
| Rate limits | `REDIS_URL` — shared IP buckets across instances |
| Ingest queue | Enabled by default with Postgres (pg-boss); disable with `INGEST_QUEUE_ENABLED=false` |
| Sessions | Sticky sessions optional for admin UI; API is stateless |

### Fly.io example (2 machines)

```bash
fly postgres create
fly postgres attach --app your-unischema-app
fly secrets set REDIS_URL=redis://... MAPPING_SYNC_TOKEN=...
fly scale count 2 --app your-unischema-app
```

Deploy with [deploy/fly.toml](./fly.toml). All instances must share the same Postgres and Redis.

See [docs/postgres.md](../docs/postgres.md) and [docs/benchmarks.md](../docs/benchmarks.md).
