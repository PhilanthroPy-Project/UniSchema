# Admin guide — mapping canvas users

This guide is for **database administrators and advancement analysts** who wire vendor webhook fields to the UniSchema master schema. You do not need to configure servers, S3, or webhook secrets.

## What you use

| Tool | URL (local Docker) | Purpose |
|------|-------------------|---------|
| **Mapping canvas** | [http://localhost:3000](http://localhost:3000) | Draw lines from vendor fields → ConstituentEvent fields |
| **Sync to Engine** | Button in the canvas | Saves your mapping to the server |

The canvas ships bundled with the API — one URL in production.

## Before you start

Ask your **operator** (see [operator-guide.md](./operator-guide.md)) for:

1. The UniSchema base URL (e.g. `https://unischema.university.edu`)
2. Whether webhook HMAC secrets are configured (you don't set these, but ingest won't run in prod without them)
3. Which vendor you're mapping (`givecampus` or `cvent` today)

## Canvas layout

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Source payload │  Mapping canvas │  Master schema  │
│  (vendor JSON)  │  (drag edges)   │  ConstituentEvent│
└─────────────────┴─────────────────┴─────────────────┘
```

- **Left** — sample or live-shaped GiveCampus JSON (more vendors coming; see [adding-a-vendor.md](./adding-a-vendor.md))
- **Center** — connect a source field node to a target field node
- **Right** — required and optional ConstituentEvent fields

## Core master fields (opinionated)

These are fixed across all vendors. Extra vendor-specific data goes in **normalizedMetadata** via canvas mappings.

| Field | Required | Typical source |
|-------|----------|----------------|
| `constituentEmail` | Yes | Donor / attendee email |
| `eventType` | Yes | `DONATION`, `EVENT_REGISTRATION`, or `EMAIL_CLICK` |
| `eventId` | Set by engine | Deterministic from vendor id |
| `amount`, `currency` | Donations | Gift amount fields |
| `firstName`, `lastName` | Optional | Name fields |
| `normalizedMetadata` | Optional | Anything else your pipeline needs |

See [limitations-and-roadmap.md](./limitations-and-roadmap.md) if your org's canonical model differs from this shape.

## Workflow

### 1. Load existing mapping

On open, the canvas calls `GET /api/mappings/{vendor}`. If your operator saved a config before, edges appear automatically.

### 2. Map fields

Drag from a **source** node (vendor JSON path) to a **target** node (master schema field).

- Core fields (`constituentEmail`, `eventType`, etc.) map directly.
- Use **metadata** targets for fields that should land in `normalizedMetadata`.

Invalid connections are blocked (type mismatches, duplicate targets).

### 3. Sync to Engine

Click **Sync to Engine**. This POSTs to `/api/mappings/sync`.

If your operator requires a mapping token (`MAPPING_SYNC_REQUIRED=true`):

1. Click **Set sync token** in the canvas header
2. Paste the `MAPPING_SYNC_TOKEN` from your operator
3. Retry sync — the token is stored in session storage for this browser tab

Operators may alternatively inject `VITE_MAPPING_SYNC_TOKEN` at build time for trusted internal deployments (see operator guide).

Sync returns 401? Ask your operator for the token — see [admin-guide.md](./admin-guide.md).

### 4. Export (optional)

**Download JSON** saves the mapping artifact locally for review or version control. The operator merges approved artifacts in git if your team uses that workflow.

## How canvas mappings interact with built-in mappers

UniSchema ships **built-in TypeScript mappers** for GiveCampus and Cvent. When you sync a canvas mapping with at least one edge:

- **Canvas wins** — the dynamic mapper runs instead of the built-in mapper.
- **Empty canvas** — the built-in mapper handles known payload shapes.

You can start with the built-in mapper and only use the canvas when you need extra `normalizedMetadata` fields or vendor shape changes.

## Testing your mapping

You don't POST webhooks from the canvas. Ask your operator to:

1. Send a test payload to `/webhooks/{vendor}`
2. Check `GET /webhooks/ingestions/{id}` for `completed` vs `failed`
3. Confirm a file appears under egress (local) or S3 (production)

If validation fails, the event may appear in the **drift queue** — your operator handles that (see operator guide).

## What you cannot do from the canvas (today)

- Add a **new vendor** (e.g. Blackbaud) — requires code changes; see [adding-a-vendor.md](./adding-a-vendor.md)
- Change **event types** or **sourceSystem** enums — fixed in code
- Configure **egress**, **secrets**, or **rate limits**

## Getting help

| Symptom | Likely cause | Who fixes it |
|---------|--------------|--------------|
| Sync returns 401 | Missing mapping token | Operator |
| Webhook accepted but mapping failed | Payload shape drift | Operator + optional drift agent |
| Field not in source tree | Sample payload outdated | Operator updates sample or vendor mapper |
