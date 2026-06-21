# Adding a vendor (bring your own vendor)

UniSchema ships **seven built-in vendors** (GiveCampus, Cvent, iModules, Blackbaud, NPSP, Slate, Ellucian). Additional CRMs follow the same **6-file checklist** below.

Plan **~2–4 hours** if you have a sample webhook payload and the vendor's HMAC header name.

---

## Canvas vs code — what still requires a deploy

The **dynamic mapper** (admin canvas) only runs **after** a vendor is registered in code. It maps fields on top of an existing webhook route — it does not create one.

| Capability | Canvas alone | Requires code |
|------------|--------------|---------------|
| Remap fields → `normalizedMetadata` | ✅ | |
| Override built-in field wiring | ✅ | |
| New `POST /webhooks/{vendor}` route | | ✅ |
| HMAC secret env var + signature header | | ✅ |
| New `sourceSystem` value (e.g. `IMODULES`) | | ✅ |
| Zod validation of raw vendor JSON | | ✅ (built-in mapper) |
| Drift capture on schema failure | | ✅ |

**Bottom line:** add the vendor once in code, then let admins iterate field mappings via the canvas without redeploying.

---

## Request flow (after you add the vendor)

```
Vendor POST /webhooks/imodules
    → webhookGuard (IP allowlist + rate limit)
    → HMAC verify (IMODULES_WEBHOOK_SECRET)
    → 202 + ingestionId
    → resolveVendorMapper('imodules')
         ├─ canvas mapping saved? → dynamic mapper
         └─ else → mapImodulesToMaster (your TypeScript mapper)
    → ConstituentEvent → egress (local / S3)
```

---

## Checklist — 6 files (+ tests)

Use slug `imodules` and enum `IMODULES` as a running example.

| # | File | What to add |
|---|------|-------------|
| 1 | `src/schema/master.ts` | `'IMODULES'` to `SourceSystemSchema` |
| 2 | `src/utils/sourceSystem.ts` | `imodules: 'IMODULES'` |
| 3 | `src/utils/driftCapture.ts` | `'imodules'` to `DRIFT_VENDORS` + drift config entry |
| 4 | `src/mappers/imodules.ts` | **New file** — Zod payload schema + `mapImodulesToMaster` |
| 5 | `src/mappers/resolve.ts` | `case 'imodules': return mapImodulesToMaster` |
| 6 | `src/config/webhookRoutes.ts` | Route config (secret env key, signature header) |

Routes are **auto-registered** from `webhookRoutes.ts` — you do **not** edit `src/app.ts` or `src/routes/register.ts`.

Also update:

| File | Action |
|------|--------|
| `src/mappers/index.ts` | Re-export new mapper |
| `.env.example` | Document `IMODULES_WEBHOOK_SECRET=` |
| `tests/fixtures/payloads.ts` | `validImodulesPayload` |
| `tests/unit/mappers.test.ts` | Unit test mapper |
| `tests/integration/webhooks.test.ts` | POST `/webhooks/imodules` integration |
| `samples/imodules-registration.json` | Sample payload for docs / manual curl |

---

## Step-by-step

### 1–2. Register `sourceSystem`

```typescript
// src/schema/master.ts
export const SourceSystemSchema = z.enum(['CVENT', 'GIVECAMPUS', 'IMODULES'])
```

```typescript
// src/utils/sourceSystem.ts
const VENDOR_TO_SOURCE_SYSTEM: Record<string, SourceSystem> = {
  cvent: 'CVENT',
  givecampus: 'GIVECAMPUS',
  imodules: 'IMODULES',
}
```

### 3. Drift queue

```typescript
// src/utils/driftCapture.ts
export const DRIFT_VENDORS = ['cvent', 'givecampus', 'imodules'] as const

// VENDOR_DRIFT_CONFIG — add:
imodules: {
  mapperFn: 'mapImodulesToMaster',
  mapperModule: '../../src/mappers/imodules.js',
},
```

Update the `DriftVendorConfig` union types for the new mapper name/module.

### 4. Built-in mapper (copy `src/mappers/givecampus.ts`)

```typescript
// src/mappers/imodules.ts
import { z } from 'zod'
import { ConstituentEventSchema, type ConstituentEvent } from '../schema/master.js'
import { toPrimitiveRecord } from '../schema/primitives.js'
import { deterministicEventId } from '../utils/deterministicEventId.js'

export const ImodulesPayloadSchema = z.object({
  registration_id: z.string().min(1),
  email: z.string().email(),
  event_name: z.string().min(1),
})

export function mapImodulesToMaster(rawPayload: unknown): ConstituentEvent {
  const parsed = ImodulesPayloadSchema.safeParse(rawPayload)
  if (!parsed.success) throw new z.ZodError(parsed.error.issues)

  const row = parsed.data
  const masterCandidate = {
    eventId: deterministicEventId('IMODULES', row.registration_id),
    constituentEmail: row.email,
    eventType: 'EVENT_REGISTRATION' as const,
    sourceSystem: 'IMODULES' as const,
    payload: toPrimitiveRecord(rawPayload),
    createdAt: new Date().toISOString(),
  }

  const validated = ConstituentEventSchema.safeParse(masterCandidate)
  if (!validated.success) throw new z.ZodError(validated.error.issues)
  return validated.data
}
```

```typescript
// src/mappers/resolve.ts — inside switch:
case 'imodules':
  return mapImodulesToMaster
```

### 5–6. Webhook route + signature

```typescript
// src/config/webhookRoutes.ts
imodules: {
  vendor: 'imodules',
  failureMessage: 'Failed to map iModules payload to master schema',
  secretEnvKey: 'IMODULES_WEBHOOK_SECRET',
  signatureHeader: 'x-imodules-signature',  // confirm with vendor docs
},
```

```bash
# .env.example
# IMODULES_WEBHOOK_SECRET=
```

This automatically exposes `POST /webhooks/imodules`.

---

## Verify locally

```bash
npm test

# Start server (no HMAC in dev when secret unset)
npm run dev

curl -X POST http://localhost:3000/webhooks/imodules \
  -H "Content-Type: application/json" \
  -d @samples/imodules-registration.json

# Poll status (use ingestionId from 202 response)
curl http://localhost:3000/webhooks/ingestions/<ingestionId> | jq .

# Check egress
find data/egress -name '*.json' | tail -1 | xargs cat | jq .
```

---

## After the route exists — canvas overrides

Admins can sync field mappings without a redeploy. When a saved mapping has `mappings.length > 0`, it **replaces** the built-in TypeScript mapper at runtime.

```bash
curl -X POST http://localhost:3000/api/mappings/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MAPPING_SYNC_TOKEN" \
  -d '{"vendor":"imodules","mappings":[...],"metadataMappings":[],"exportedAt":"..."}'
```

The built-in mapper still matters for:

- First ingest before any canvas config exists
- Drift capture when raw JSON fails Zod validation
- CI fixtures and regression tests

Optional: add a sample tree to `frontend/src/data/samplePayloads.ts` so the canvas shows iModules JSON (webhook ingest works without this).

---

## Event types

Only three values today: `EVENT_REGISTRATION`, `DONATION`, `EMAIL_CLICK`.

Pick the closest fit and put vendor-specific detail in `normalizedMetadata`, or extend `EventTypeSchema` in `master.ts` (coordinate with downstream pipelines).

---

## Not supported yet

- **Zero-code plugins** — no drop-in JSON config without TypeScript
- **Custom master schemas per org** — use `normalizedMetadata` for extras

See [limitations-and-roadmap.md](./limitations-and-roadmap.md) for scale and vendor roadmap.
