# Canvas vs code

The UniSchema mapping canvas lets advancement analysts remap fields **without redeploying** — but it cannot register new vendors. This page clarifies the boundary for admins, buyers, and developers.

## Summary

| Capability | Canvas alone | Requires code deploy |
|------------|--------------|----------------------|
| Remap fields → `normalizedMetadata` | Yes | |
| Override built-in field wiring | Yes | |
| Import / export mapping JSON | Yes | |
| Preview ConstituentEvent | Yes | |
| New `POST /webhooks/{vendor}` route | | Yes |
| HMAC secret env var + signature header | | Yes |
| New `sourceSystem` enum value | | Yes |
| Zod validation of raw vendor JSON | | Yes (built-in mapper) |
| Drift capture on schema failure | | Yes |

**Bottom line:** add the vendor once in code (~2–4 hours), then let admins iterate field mappings via the canvas without redeploying.

## How the dynamic mapper works

```
POST /webhooks/{vendor}
  → resolveVendorMapper(vendor)
       ├─ canvas mapping saved with edges? → dynamic mapper
       └─ else → built-in TypeScript mapper (e.g. mapGiveCampusToMaster)
  → ConstituentEvent → egress
```

When an admin syncs a canvas mapping with at least one edge, **canvas wins** over the built-in mapper.

## What admins can do

- Draw lines from vendor JSON paths to master schema fields
- Map org-specific fields into `normalizedMetadata`
- Sync to engine (`POST /api/mappings/sync`)
- Export mapping artifacts for review

Guide → [admin-guide.md](./admin-guide.md)

## What developers must do

Follow the [6-file vendor checklist](./adding-a-vendor.md):

1. `src/schema/master.ts` — `sourceSystem` enum
2. `src/utils/sourceSystem.ts`
3. `src/utils/driftCapture.ts`
4. `src/mappers/{vendor}.ts` — Zod + mapper
5. `src/mappers/resolve.ts`
6. `src/config/webhookRoutes.ts`

Plus tests and sample payloads.

## Buyer FAQ

**"Can our DB admin add Ellucian without IT?"**  
Not today. IT (or a vendor partner) adds Ellucian once in code; then the admin maps fields on the canvas.

**"Can we change event types in the canvas?"**  
No. `eventType` enum (`DONATION`, `EVENT_REGISTRATION`, `EMAIL_CLICK`) is fixed in code. Extensions require an RFC — [schema-governance.md](./schema-governance.md).

**"Is this a no-code integration platform?"**  
No. It is a **purpose-built webhook normalizer** with a visual override layer for registered vendors.

## Related

- [adding-a-vendor.md](./adding-a-vendor.md) — developer checklist
