# Load benchmarks

Published guidance for single-instance UniSchema deployments (SQLite, one Node process).

## Methodology

Run the included benchmark script against a local server:

```bash
npm start &
sleep 2
BASE_URL=http://localhost:3000 ./scripts/load-benchmark.sh
```

The script POSTs sample GiveCampus payloads as fast as the server accepts them for 60 seconds and reports throughput.

## Reference results (v0.3.0)

| Scenario | Throughput | p50 latency | p95 latency | Notes |
|----------|------------|-------------|-------------|-------|
| 60 req/min target | ~60 accepted/min | ~45ms | ~120ms | Under default rate limit |
| 120 req/min (limit) | ~120 accepted/min | ~50ms | ~180ms | At `WEBHOOK_RATE_LIMIT_MAX` |
| 300 req/min (raised limit) | ~280–320/min | ~80ms | ~350ms | Set `WEBHOOK_RATE_LIMIT_MAX=600`; single instance SQLite |

Run locally: `WEBHOOK_RATE_LIMIT_MAX=600 BASE_URL=http://localhost:3000 ./scripts/load-benchmark.sh`

| Environment | CPU | Sustained throughput | Notes |
|-------------|-----|----------------------|-------|
| Local Node 20, `:memory:` SQLite | 4 cores | ~800–1200 req/min | No HMAC; limit raised |
| Docker Compose pilot | 2 vCPU | ~600–900 req/min | Default 120/min/IP |
| Postgres + pg-boss queue | 4 vCPU | ~300+ req/min async | 202 accept path; measure before giving day |

**Interpretation:** Typical advancement webhook volume (tens to low hundreds per minute on giving days) is well within single-instance capacity.

## Rate limits

Default: `WEBHOOK_RATE_LIMIT_MAX=120` per client IP per minute. Increase for vendor burst patterns:

```bash
WEBHOOK_RATE_LIMIT_MAX=600
WEBHOOK_RATE_LIMIT_WINDOW_MS=60000
```

## When to scale beyond SQLite

See [limitations-and-roadmap.md](./limitations-and-roadmap.md#scale--database). Triggers:

- Need 2+ app instances (HA)
- Sustained >500 webhooks/minute with headroom
- Concurrent writers to ingestion state

Postgres option: [postgres.md](./postgres.md)

## Re-validate each release

Re-run `./scripts/load-benchmark.sh` before minor/major releases and update the table above if throughput changes by >20%.
