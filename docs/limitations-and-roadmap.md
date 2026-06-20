# Limitations & roadmap (read before production)

UniSchema is **v0.1.0** — strong for pilots and webhook normalization proofs; not yet "drop in and forget." This page states what works today and what teams ask about before trusting production donor data.

## What works well today

- GiveCampus + Cvent webhooks → **ConstituentEvent** with HMAC verification
- Async ingest with crash recovery
- Local or S3 egress push
- Visual mapping canvas for field overrides
- Docker Compose + single-URL bundled UI
- 15-minute demo script (`npm run demo`)

## Honest limitations (v0.1.0)

### Narrow vendor coverage

| Supported | Not built-in |
|-----------|--------------|
| GiveCampus | Blackbaud Raiser's Edge NXT |
| Cvent | Salesforce NPSP |
| | iModules, Slate, Ellucian, etc. |

Adding vendor #3 is documented in [adding-a-vendor.md](./adding-a-vendor.md) (6 files). You're not blocked, but you're not plug-and-play either.

### Fixed master schema

Core fields (`constituentEmail`, `eventType`, `sourceSystem`, etc.) are **opinionated** for cross-vendor consistency.

- **Good:** one downstream model for analytics and ML
- **Bad:** if your org's canonical constituent model differs significantly

Use `normalizedMetadata` for org-specific fields. Changing core fields requires schema + pipeline coordination.

### Three event types only

`EVENT_REGISTRATION`, `DONATION`, `EMAIL_CLICK`

Email opens, volunteer shifts, membership renewals, etc. must map to the nearest type or wait for enum extensions.

### SQLite backend (pilot scale)

Fine for:

- Single-instance deploy
- Thousands to low millions of rows with modest write rates
- Teams validating webhook → warehouse flow

**Not** fine for (today):

- Multiple app instances writing concurrently
- HA failover without external DB
- Very high webhook burst rates across instances

### Many environment variables

Production requires webhook secrets, egress config, mapping sync token, etc. See [operator-guide.md](./operator-guide.md). We aim to reduce this with hosted templates and opinionated defaults — not there yet.

### Drift agent is experimental

The LLM drift runner (`agents/drift_runner/`) is **human-in-the-loop assistive tooling**:

| It does | It does not |
|---------|-------------|
| Capture failed payloads in a drift queue | Auto-deploy mapper fixes |
| Propose patches under `agents/output/` | Self-heal production without review |
| Generate Vitest fixture scaffolding | Replace your change management |

**Do not** enable unsupervised agent loops against production. See [agents/README.md](../agents/README.md).

### No managed SaaS

Self-host Node + secrets + S3 (+ optionally Airflow) is still required. Cloud templates: [deploy/README.md](../deploy/README.md).

---

## Scale & database

### Current architecture

```
Single Node process
  └── SQLite (WAL, one writer)
  └── In-memory S3 batch buffer
  └── In-memory rate limit buckets (per IP)
```

**Default rate limit:** 120 requests / minute / client IP (`WEBHOOK_RATE_LIMIT_MAX`). Tune for your vendor's burst pattern.

**Async ingest:** Webhooks return **202** immediately; mapping runs on the event loop. Throughput is adequate for typical advancement webhook volumes on one instance; load-test before peak giving day.

### Before high-volume production

| Question | v0.1.0 answer | Planned direction |
|----------|---------------|-----------------|
| Postgres instead of SQLite? | Not supported | Track as adoption milestone |
| Horizontal scaling (2+ instances)? | Rate limits & SQLite are in-process | Requires shared DB + queue |
| Webhook volume limits? | ~120/min/IP default; single CPU bound | Document + benchmark per release |
| Multi-region? | Single region | Out of scope for v0.1 |

**Recommendation:** Run a pilot on SQLite + S3 egress. Measure peak webhooks/minute during a giving period. If you need >1 instance or Postgres, open an issue with your volume numbers — it helps prioritize.

### Data durability

- Ingest state: SQLite (`webhook_ingestions`, `constituent_events`)
- Egress: S3 (durable) or local disk (volume backups required)
- Recovery workers re-process stale pending ingestions and egress on startup

---

## Roadmap themes (not committed dates)

1. **Adoption** — more cloud templates, vendor #3 examples, downstream DAG samples ✅ in progress
2. **Vendors** — community-contributed mappers (Blackbaud, NPSP)
3. **Scale** — Postgres option, optional Redis rate limit / queue
4. **Product** — vendor selector in canvas, mapping sync token in UI
5. **Hosted tier** — explore managed option if community demand exists

Contributions welcome — especially vendor mappers with real payload fixtures and tests.
