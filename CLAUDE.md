# CLAUDE.md — UniSchema context for AI coding sessions

Orientation for Claude Code / Cursor / any AI assistant working in this repo. Keep it accurate; update it when architecture changes.

## What this is

UniSchema normalizes fragmented university-advancement webhooks into a single Zod-validated `ConstituentEvent` stream, then egresses it (local files or S3) for warehouses and ML. It is a **webhook ingest + normalize** layer — not a CRM and not bi-directional sync. Downstream consumer: [PhilanthroPy](https://github.com/PhilanthroPy-Project/PhilanthroPy) (sklearn-native advancement ML).

- Backend: **Hono** API (`src/`), TypeScript, ESM, Node ≥20, run via `tsx`.
- Frontend: **React + Vite** mapping canvas (`frontend/`), served from the same port.
- Storage: **SQLite** default (`better-sqlite3`), optional **Postgres**. Queue via `pg-boss`/Redis at scale.
- Validation: **Zod v4** everywhere at trust boundaries.

## Core data model — `src/schema/master.ts`

`ConstituentEvent` is the canonical output. Every mapper produces one and it must pass `ConstituentEventSchema`.

- `eventType`: `EVENT_REGISTRATION` | `DONATION` | `EMAIL_CLICK` (only three — extend via RFC, see `docs/schema-governance.md`).
- `sourceSystem`: enum of the 8 built-in vendors.
- `eventId`: UUID from `deterministicEventId(sourceSystem, nativeId)` — **deterministic**, so re-ingesting the same event is idempotent. Never use random UUIDs in mappers.
- `normalizedMetadata`: vendor-specific extras (canvas-mapped), primitives only (`src/schema/primitives.ts`).
- `payload`: full raw payload as a primitive record.

## Request flow

`POST /webhooks/{vendor}` → `webhookGuard` (IP allowlist + rate limit) → HMAC verify (`{VENDOR}_WEBHOOK_SECRET`) → **202 + ingestionId** → background: `resolveVendorMapper` picks the **canvas mapping if saved, else the built-in TS mapper** → `ConstituentEvent` → egress. Poll status at `GET /webhooks/ingestions/:id`.

## Commands

```bash
npm run dev            # tsx watch, http://localhost:3000
npm test               # vitest (backend) — 294 tests
npm run typecheck      # tsc --noEmit
npm run validate       # full CI parity: typecheck + security + coverage + frontend + build
npm run demo           # single webhook via scripts/demo-webhook.sh
npm run demo:multi     # all vendors
npm run downstream-demo # prove PhilanthroPy value end-to-end
```

Local dev needs no auth tokens unless `NODE_ENV=production`. Adding a vendor's HMAC secret enables signature checks for that route.

## Adding a vendor (most common task)

6-file checklist — full walkthrough in `docs/adding-a-vendor.md`. Routes auto-register from `src/config/webhookRoutes.ts`; **do not** edit `src/app.ts` or `src/routes/register.ts`.

1. `src/schema/master.ts` — add to `SourceSystemSchema`
2. `src/utils/sourceSystem.ts` — `vendor: 'VENDOR'` map
3. `src/utils/driftCapture.ts` — `DRIFT_VENDORS` + drift config
4. `src/mappers/{vendor}.ts` — **new**: Zod payload schema + `map{Vendor}ToMaster` (copy `givecampus.ts`)
5. `src/mappers/resolve.ts` — `case` in the switch
6. `src/config/webhookRoutes.ts` — secret env key + signature header

Also: re-export in `src/mappers/index.ts`, add `.env.example` entry, fixture in `tests/fixtures/payloads.ts`, tests in `tests/unit/mappers.test.ts` + `tests/integration/webhooks.test.ts`, and `samples/{vendor}-*.json`.

## Conventions & gotchas

- **ESM imports use `.js` extensions** even for `.ts` sources (e.g. `../schema/master.js`). Match this.
- Mappers `safeParse` then throw `z.ZodError` on failure — that failure path feeds drift capture. Keep it.
- Match the surrounding file's style exactly; no reformatting unrelated code.
- `data/`, `coverage/`, `dist/`, `node_modules/`, `.env*`, `repomix-output.xml` are gitignored — never commit them.
- Don't add AI/Claude co-author trailers to commits.

## Repo map

`src/mappers` per-vendor · `src/schema` canonical model · `src/egress` local/S3 publish · `src/store` queues + registries · `src/middleware` webhook guard/handler · `src/routes` API · `agents/` experimental Python drift agent · `docs/` role guides · `examples/downstream/` PhilanthroPy + dbt pipelines.
