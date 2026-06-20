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

## Reference results (development machine)

| Environment | CPU | Result | Notes |
|-------------|-----|--------|-------|
| Local Node 20, `:memory:` SQLite | Apple M-series / 4 cores | ~800–1200 req/min sustained | No HMAC verification |
| Docker Compose (1 container) | 2 vCPU | ~600–900 req/min | Default rate limit 120/min/IP applies per client IP |

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
