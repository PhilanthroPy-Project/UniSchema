# UniSchema

**v0.1.0** — Open-source webhook unification for university advancement teams.

Turn GiveCampus, Cvent (and vendors you add) into one **ConstituentEvent** schema, with a visual mapper UI and push-to-storage egress for analytics.

> **Pilot-ready, not forgettable yet.** Two built-in vendors, SQLite, self-hosted.  
> Read [docs/limitations-and-roadmap.md](./docs/limitations-and-roadmap.md) before production donor data.

**One URL:** API + admin UI on the same port.

---

## Choose your guide

| I am… | Start here |
|-------|------------|
| **New adopter** — first webhook in ~15 min | [Quick start](#quick-start-15-minutes) below |
| **Admin / analyst** — drawing mapping lines on the canvas | [docs/admin-guide.md](./docs/admin-guide.md) |
| **Operator** — secrets, S3 egress, cloud deploy | [docs/operator-guide.md](./docs/operator-guide.md) |
| **Developer** — adding Blackbaud, NPSP, vendor #3 | [docs/adding-a-vendor.md](./docs/adding-a-vendor.md) |
| **Data engineer** — prove downstream value | [examples/downstream/](examples/downstream/README.md) (notebook + scripts) |
| **All docs** | [docs/README.md](docs/README.md) |

---

## Quick start (~15 minutes)

**Requires:** [Docker](https://docs.docker.com/get-docker/) + Docker Compose. The demo script uses `curl` and `jq` (included in the Docker image).

```bash
git clone https://github.com/PhilanthroPy-Project/UniSchema.git
cd UniSchema
docker compose up --build
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

| ✅ Today | ⚠️ v0.1.0 limits |
|----------|------------------|
| GiveCampus + Cvent → ConstituentEvent | Blackbaud, NPSP, iModules — [bring your own vendor](./docs/adding-a-vendor.md) |
| HMAC webhook verification | ~120 req/min/IP default; single-instance SQLite |
| Idempotent egress (duplicate webhooks skip re-publish) | Set `TRUST_PROXY=true` when behind Fly/Railway/nginx |
| Visual canvas overrides | Core master schema is opinionated — [details](./docs/limitations-and-roadmap.md) |
| Local + S3 egress push | No managed SaaS — [Fly / Railway / Terraform S3](deploy/README.md) |
| 3 event types: registration, donation, email click | Extending enums needs code + pipeline coordination |
| Drift queue for schema failures | LLM drift agent is **experimental** — [human review required](./agents/README.md) |

---

## Cloud deploy (low ops)

No hosted tier yet. Use bundled Docker image + platform templates:

| Platform | Docs |
|----------|------|
| Fly.io | [deploy/fly.toml](./deploy/fly.toml) + [deploy/README.md](./deploy/README.md) |
| Railway | [deploy/railway.toml](./deploy/railway.toml) |
| Any host | [Dockerfile](./Dockerfile) |

Production checklist → [operator guide](./docs/operator-guide.md).

**Minimum production env vars** (see [.env.example](./.env.example)):

| Variable | Purpose |
|----------|---------|
| `GIVECAMPUS_WEBHOOK_SECRET` / `CVENT_WEBHOOK_SECRET` | HMAC verification (required in production) |
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

Airflow DAG stub + S3 batch reader → [examples/downstream/](examples/downstream/README.md).

---

## API (summary)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/webhooks/givecampus` | GiveCampus webhook (**202**) |
| `POST` | `/webhooks/cvent` | Cvent webhook (**202**) |
| `GET` | `/webhooks/ingestions/:id` | Poll async status (Bearer auth in production) |
| `POST` | `/api/mappings/sync` | Save canvas mapping (Bearer auth in production) |
| `GET` | `/api/mappings/:vendor` | Load canvas mapping (Bearer auth in production) |
| `GET` | `/api/drift/events` | Schema drift queue (Bearer auth in production) |

Admin routes are also available without the `/api` prefix. Local dev works without tokens when `NODE_ENV` is not `production`.

Full operator reference → [docs/operator-guide.md](./docs/operator-guide.md).

---

## Project layout

```
UniSchema/
├── docs/              admin, operator, vendor, limitations guides
├── deploy/            Fly.io + Railway templates
├── examples/downstream/   report scripts + Airflow stub
├── frontend/          React mapping canvas
├── src/               Hono API, mappers, egress
├── samples/           demo webhook payloads
├── scripts/           demo-webhook.sh
└── agents/            experimental drift agent (Python)
```

---

## Testing

```bash
npm test                  # backend (232 tests)
npm run validate          # full CI parity (backend + frontend + build)
```

---

## License

MIT
