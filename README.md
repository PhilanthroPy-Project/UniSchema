# UniSchema

**v0.2.0** — Open-source webhook unification for university advancement teams.

Turn GiveCampus, Cvent, iModules, Blackbaud, NPSP, Slate (and vendors you add) into one **ConstituentEvent** schema, with a visual mapper UI and push-to-storage egress for analytics.

> **Pilot-ready, not forgettable yet.** Six built-in vendors, SQLite or Postgres, self-hosted.  
> Read [docs/limitations-and-roadmap.md](./docs/limitations-and-roadmap.md) before production donor data.

**One URL:** API + admin UI on the same port.

[![Deploy on Fly.io](https://img.shields.io/badge/Deploy-Fly.io-7c3aed?style=for-the-badge&logo=fly.io)](https://fly.io/docs/languages-and-frameworks/docker/)
[![Deploy on Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://docs.railway.com/guides/dockerfiles)

Docker image: `ghcr.io/PhilanthroPy-Project/unischema:latest`

---

## Adoption paths

| Stage | Stack | Guide |
|-------|-------|-------|
| **Pilot** (~15 min) | Docker + SQLite + local egress | [Quick start](#quick-start-15-minutes) |
| **Production** | Fly/Railway + S3 + Postgres optional | [Operator guide](./docs/operator-guide.md) |
| **Scale** | Postgres + benchmarks + multi-instance | [Benchmarks](./docs/benchmarks.md) · [Postgres](./docs/postgres.md) |

---

## Choose your guide

| I am… | Start here |
|-------|------------|
| **New adopter** — first webhook in ~15 min | [Quick start](#quick-start-15-minutes) below |
| **Admin / analyst** — drawing mapping lines on the canvas | [docs/admin-guide.md](./docs/admin-guide.md) |
| **Operator** — secrets, S3 egress, cloud deploy | [docs/operator-guide.md](./docs/operator-guide.md) |
| **Developer** — adding Slate, Ellucian, vendor #7 | [docs/adding-a-vendor.md](./docs/adding-a-vendor.md) |
| **Data engineer** — prove downstream value | [examples/downstream/](examples/downstream/README.md) (notebook + scripts) |
| **All docs** | [docs/README.md](docs/README.md) |

---

## Quick start (~15 minutes)

**Requires:** [Docker](https://docs.docker.com/get-docker/) + Docker Compose. The demo script uses `curl` and `jq` (included in the Docker image).

```bash
git clone https://github.com/PhilanthroPy-Project/UniSchema.git
cd UniSchema
docker compose -f docker-compose.pilot.yml up --build
```

1. Open [http://localhost:3000](http://localhost:3000) — mapping canvas + API together  
2. In another terminal: `npm run demo`  
3. See a **ConstituentEvent** JSON file under `data/egress/`

```
GiveCampus POST → 202 Accepted → background map → data/egress/.../eventId.json
```

<details>
<summary>Without Docker</summary>

```bash
npm install && cd frontend && npm install && cd ..
npm run build
SERVE_FRONTEND=true npm start
npm run demo
```

</details>

---

## What UniSchema is (and isn't)

| ✅ Today (v0.2.0) | ⚠️ Limits |
|----------|------------------|
| 6 vendors: GiveCampus, Cvent, iModules, Blackbaud, NPSP, Slate | Ellucian — [add your own](./docs/adding-a-vendor.md) |
| Tier 1 (prod-tested): GiveCampus, Cvent · Tier 2: iModules · Tier 3 (community): Blackbaud, NPSP, Slate | Verify Tier 3 mappers with your real payloads — [certification](./docs/README.md) |
| SQLite default + optional Postgres | Horizontal scale needs Postgres + Redis (see [deploy guide](./deploy/README.md)) |
| HMAC webhook verification | ~120 req/min/IP default; tune for peak giving day |
| Visual canvas + metadata mappings + import/export | Core master schema is opinionated — [details](./docs/limitations-and-roadmap.md) |
| Local + S3 egress push | No managed SaaS yet — [Fly / Railway / Terraform S3](deploy/README.md) |
| 3 event types: registration, donation, email click | Extending enums needs RFC + pipeline coordination |
| Drift queue + experimental LLM agent | **Human review required** — [agents/README.md](./agents/README.md) |

---

## Cloud deploy (low ops)

No hosted tier yet. Use bundled Docker image + platform templates:

| Platform | Docs |
|----------|------|
| Fly.io | [deploy/fly.toml](./deploy/fly.toml) + [deploy/README.md](./deploy/README.md) |
| Railway | [deploy/railway.toml](./deploy/railway.toml) |
| GHCR image | `docker pull ghcr.io/PhilanthroPy-Project/unischema:0.2.0` |
| Any host | [Dockerfile](./Dockerfile) |

Production checklist → [operator guide](./docs/operator-guide.md).

**Minimum production env vars** (see [.env.example](./.env.example)):

| Variable | Purpose |
|----------|---------|
| `GIVECAMPUS_WEBHOOK_SECRET` / `CVENT_WEBHOOK_SECRET` (+ per-vendor secrets) | HMAC verification (required in production) |
| `MAPPING_SYNC_TOKEN` | Protects mapping sync, mapping GET, and ingestion polling |
| `DRIFT_AGENT_TOKEN` | Protects drift queue API |
| `TRUST_PROXY=true` | Trust `X-Forwarded-For` only when behind a reverse proxy |

---

## Downstream example

After the demo:

```bash
python3 examples/downstream/read_local_egress.py data/egress
```

Or open the **[Jupyter notebook](examples/downstream/egress_report.ipynb)** for a stakeholder-friendly summary chart.

Board of Trustee engagement ML starter → [examples/downstream/bot_engagement_classifier.py](examples/downstream/bot_engagement_classifier.py).

---

## API (summary)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (version, egress, drift count) |
| `GET` | `/api/vendors` | Vendor registry |
| `POST` | `/webhooks/{vendor}` | Vendor webhooks (**202**) — givecampus, cvent, imodules, blackbaud, npsp, slate |
| `GET` | `/webhooks/ingestions/:id` | Poll async status (Bearer auth in production) |
| `POST` | `/api/mappings/sync` | Save canvas mapping (Bearer auth in production) |
| `POST` | `/api/mappings/preview` | Preview ConstituentEvent from artifact (no persist) |
| `GET` | `/api/mappings/:vendor` | Load canvas mapping (Bearer auth in production) |
| `GET` | `/api/drift/events` | Schema drift queue (Bearer auth in production) |

Admin routes are also available without the `/api` prefix. Local dev works without tokens when `NODE_ENV` is not `production`.

Full operator reference → [docs/operator-guide.md](./docs/operator-guide.md).

---

## Project layout

```
UniSchema/
├── src/                    # Hono API — app.ts, server.ts, mappers, egress
├── frontend/               # React mapping canvas (npm workspace)
├── tests/
│   ├── unit/               # Module-level tests
│   └── integration/        # Full HTTP route tests
├── docs/                   # Role guides (admin, operator, vendor)
├── deploy/                 # Fly.io, Railway, Terraform
├── examples/downstream/    # Analytics scripts + notebook
├── samples/                # Demo webhook payloads
├── scripts/                # demo-webhook.sh, benchmarks
└── agents/                 # Experimental drift agent (Python)
```

---

## Testing

```bash
npm test                  # backend
npm run validate          # full CI parity (backend + frontend + build)
```

---

## License

MIT
