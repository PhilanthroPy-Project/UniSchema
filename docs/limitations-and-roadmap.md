# Limitations & roadmap (read before production)

UniSchema is **v0.4.1** — strong for pilots and webhook normalization proofs; not yet "drop in and forget." This page states what works today and what teams ask about before trusting production donor data.

## What works well today

- Eight built-in vendors → **ConstituentEvent** with HMAC verification
- Async ingest with crash recovery
- Local or S3 egress push
- Visual mapping canvas for field overrides + `normalizedMetadata`
- **PhilanthroPy integration** — [philanthropy-integration.md](./philanthropy-integration.md)
- SQLite default or optional Postgres ([postgres.md](./postgres.md))
- Docker Compose + single-URL bundled UI
- 15-minute demo (`npm run demo:multi`)

## Vendor maturity tiers

| Tier | Vendors | Status |
|------|---------|--------|
| **Tier 1** | GiveCampus, Cvent | Production-tested fixtures, primary support |
| **Tier 2** | iModules | Reference vendor #3 implementation |
| **Tier 3** | Blackbaud, NPSP, Slate, Ellucian, CiviCRM | Community mappers — verify with your real payloads; [certification](./vendor-certification.md) |

See [vendor registry](./README.md#vendor-registry) for the canonical list.

## Honest limitations (v0.4.1)

### Not every advancement vendor is built-in

Niche CRMs still require the [6-file vendor checklist](./adding-a-vendor.md). Tier 3 vendors (including Ellucian) — verify payloads against your instance before production.

### Fixed master schema

Core fields (`constituentEmail`, `eventType`, `sourceSystem`, etc.) are **opinionated** for cross-vendor consistency.

- **Good:** one downstream model for analytics and ML
- **Bad:** if your org's canonical constituent model differs significantly

Use `normalizedMetadata` for org-specific fields. Changing core fields requires schema + pipeline coordination ([schema-governance.md](./schema-governance.md)).

### Three event types only

`EVENT_REGISTRATION`, `DONATION`, `EMAIL_CLICK`

Email opens, volunteer shifts, membership renewals, etc. must map to the nearest type or wait for enum extensions via RFC — see [schema-governance.md](./schema-governance.md#community-rfc-volunteer_shift).

### Scale characteristics

**Pilot (SQLite, single instance):**

- Single-instance deploy
- Thousands to low millions of rows with modest write rates
- Default ~120 req/min/IP rate limit

**Production (Postgres, optional Redis):**

- Postgres for shared state across instances ([postgres.md](./postgres.md))
- Optional `REDIS_URL` for shared rate limits ([benchmarks.md](./benchmarks.md))
- Multi-instance guide: [deploy/README.md](../deploy/README.md#multi-instance-production)

**Not** fine for (today):

- Multi-region active-active
- Very high burst rates without load testing

### Many environment variables

Production requires webhook secrets, egress config, mapping sync token, etc. See [operator-guide.md](./operator-guide.md). Compose files (`docker-compose.yml` for pilots vs `docker-compose.prod.yml`) reduce guesswork.

### Drift agent is experimental

The LLM drift runner (`agents/drift_runner/`) is **human-in-the-loop assistive tooling**:

| It does | It does not |
|---------|-------------|
| Capture failed payloads in a drift queue | Auto-deploy mapper fixes |
| Propose patches under `agents/output/` | Self-heal production without review |
| Generate Vitest fixture scaffolding | Replace your change management |

**Do not** enable unsupervised agent loops against production. See [ai-agent-loop.md](./ai-agent-loop.md) and [agents/README.md](../agents/README.md).

### No managed SaaS (yet)

Self-host Node + secrets + S3 (+ optionally Airflow) is still required. Cloud templates: [deploy/README.md](../deploy/README.md).

---

## Scale & database

### Current architecture

```
Node process(es)
  └── SQLite (default) or Postgres (DATABASE_URL)
  └── Optional Redis rate limit (REDIS_URL)
  └── In-memory S3 batch buffer (per instance)
  └── Optional pg-boss ingest queue (when DATABASE_URL set)
```

**Default rate limit:** 120 requests / minute / client IP (`WEBHOOK_RATE_LIMIT_MAX`). Tune for your vendor's burst pattern.

**Async ingest:** Webhooks return **202** immediately; mapping runs in background. Throughput is adequate for typical advancement webhook volumes on one instance; run `npm run benchmark` before peak giving day.

### Before high-volume production

| Question | v0.2.0 answer | Planned direction |
|----------|---------------|-----------------|
| Postgres instead of SQLite? | Supported via `DATABASE_URL` | Documented migration path |
| Horizontal scaling (2+ instances)? | Postgres + optional Redis | Multi-instance deploy guide |
| Webhook volume limits? | Benchmarked — see [benchmarks.md](./benchmarks.md) | Per-release numbers |
| Multi-region? | Single region | Out of scope for v0.2 |

**Recommendation:** Run a pilot on SQLite + S3 egress. Measure peak webhooks/minute during a giving period. If you need >1 instance, use Postgres + Redis per [deploy/README.md](../deploy/README.md).

### Data durability

- Ingest state: SQLite or Postgres (`webhook_ingestions`, `constituent_events`)
- Egress: S3 (durable) or local disk (volume backups required)
- Recovery workers re-process stale pending ingestions and egress on startup

---

## Roadmap themes (not committed dates)

1. **Adoption** — GHCR releases, compose profiles, PhilanthroPy bridge ✅ v0.3
2. **Vendors** — Slate/NPSP Tier 1 certification, community certification for Blackbaud/Ellucian
3. **Scale** — Redis rate limit, pg-boss queue, published benchmarks ✅ in progress
4. **Product** — metadata canvas, import mapping, drift UI actions ✅ in progress
5. **Trust (v1.0)** — OIDC admin auth, mapping audit log, compliance docs
6. **Hosted tier** — RFC after v0.3 adoption signals

Contributions welcome — especially vendor mappers with real payload fixtures and tests.
