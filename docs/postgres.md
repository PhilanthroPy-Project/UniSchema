# Postgres backend (optional)

UniSchema defaults to **SQLite** for zero-config pilots. Set `DATABASE_URL` to a Postgres connection string to use Postgres instead.

## When to use Postgres

- Multiple app instances need shared ingestion state
- HA failover with managed Postgres (RDS, Neon, Fly Postgres)
- Pilot outgrows single-instance SQLite (see [benchmarks.md](./benchmarks.md))

## Quick start (Docker Compose)

```bash
docker compose -f docker-compose.postgres.yml up --build
```

Set in `.env`:

```bash
DATABASE_URL=postgres://unischema:unischema@postgres:5432/unischema
```

## Manual setup

1. Provision Postgres 14+
2. Set `DATABASE_URL=postgres://user:pass@host:5432/dbname`
3. Start the server — tables are created automatically on boot

```bash
npm run build
DATABASE_URL=postgres://... npm start
```

## Fly.io Postgres

```bash
fly postgres create
fly postgres attach --app your-unischema-app
# Fly sets DATABASE_URL automatically
fly deploy --config deploy/fly.toml
```

## Limitations (v0.2)

- Postgres and SQLite share the same Drizzle schema; migrations are `CREATE TABLE IF NOT EXISTS` on startup
- Rate limiting uses in-process counters by default; set **`REDIS_URL`** for shared rate limits across instances (see [docker-compose.scale.yml](../docker-compose.scale.yml))
- Optional **pg-boss** ingest queue activates when `DATABASE_URL` is Postgres and `INGEST_QUEUE_ENABLED` is not `false`
- Tests run against SQLite `:memory:` by default

## Switching from SQLite

1. Export existing data if needed (constituent_events JSON from egress is the source of truth for analytics)
2. Point `DATABASE_URL` at Postgres
3. Re-register vendor webhooks if URLs changed during migration

Ingest history in SQLite is not automatically migrated — replay from vendor logs if required.
