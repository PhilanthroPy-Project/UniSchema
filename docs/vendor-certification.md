# Vendor certification

Built-in vendors are assigned **tiers** based on fixture quality and real-world verification. This page describes how Tier 3 (community) vendors become Tier 1 (production-tested).

## Tier definitions

| Tier | Expectation | Vendors (v0.3) |
|------|-------------|----------------|
| **Tier 1** | Production-tested fixtures; primary maintainer support | GiveCampus, Cvent |
| **Tier 2** | Reference implementation for new vendors | iModules |
| **Tier 3** | Community mapper — **verify with your real payloads** before production | Blackbaud, NPSP, Slate, Ellucian |

Canonical registry → [docs/README.md#vendor-registry](./README.md#vendor-registry)

## Certification path (Tier 3 → Tier 1)

### 1. Submit redacted real payload

Open a PR or issue with:

- Anonymized JSON from your vendor instance (no donor PII)
- Vendor slug and `sourceSystem` value
- HMAC header name and signature algorithm (if non-standard)

Store fixtures under:

```
tests/__fixtures__/certified/{vendor}/
```

### 2. Add tests

| Test | File |
|------|------|
| Unit mapper | `tests/unit/mappers.test.ts` |
| Integration webhook | `tests/integration/webhooks.test.ts` |
| Sample for docs | `samples/{vendor}-*.json` |

### 3. Maintainer review

Maintainers verify:

- Zod schema matches documented vendor API
- `ConstituentEvent` output is correct for the payload
- No PII in committed fixtures
- `npm run validate` passes

### 4. Tier promotion

Update:

- `docs/README.md` vendor registry
- `/api/vendors` tier metadata in code (vendor registry)
- CHANGELOG

## Priority targets

1. **Slate** — form field names vary by instance
2. **NPSP** — Salesforce field API names vary by org
3. **Blackbaud** — RENXT gift webhook shapes
4. **Ellucian** — bootstrap mapper needs institutional payloads

## Issue template

Use **Certify vendor** when opening a GitHub issue (`.github/ISSUE_TEMPLATE/certify-vendor.yml`).

## What certification does not guarantee

- Every future vendor API change (use drift queue + tests)
- Compatibility with custom vendor middleware
- Legal/compliance approval for your institution

## Related

- [adding-a-vendor.md](./adding-a-vendor.md) — add vendor #8
- [admin-guide.md](./admin-guide.md) — Tier 3 verification warning in canvas
