# ConstituentEvent schema governance

UniSchema uses semantic versioning for the **repository** and documents breaking changes to the **ConstituentEvent** master schema.

## Version policy

| Change type | Example | Version bump |
|-------------|---------|--------------|
| New optional field | Add `middleName?` | Minor (v0.x) |
| New `sourceSystem` enum | Add `SLATE` | Minor (v0.x) |
| New `eventType` enum | Add `VOLUNTEER_SHIFT` | Minor — coordinate downstream |
| Remove / rename core field | Rename `constituentEmail` | **Major (v1.0+)** |
| Change field type | `amount` string → number only | Major |

## Adding event types

1. Extend `EventTypeSchema` in [`src/schema/master.ts`](../src/schema/master.ts)
2. Update frontend [`constituentEvent.ts`](../frontend/src/types/constituentEvent.ts)
3. Document migration in CHANGELOG
4. Notify downstream pipelines (dbt models, warehouse loaders)

## Adding source systems

Follow [adding-a-vendor.md](./adding-a-vendor.md) — each vendor adds a `sourceSystem` enum value.

## Deprecation window

From v1.0 onward: **6 months notice** in CHANGELOG before removing or renaming core fields. Use `normalizedMetadata` for org-specific extensions instead of forking the master schema.

## Future: schemaVersion field

Planned for v1.0 if breaking changes accumulate:

```json
{ "schemaVersion": 1, "eventId": "...", ... }
```

Downstream loaders should ignore unknown versions and alert operators.

## RFC process (community)

Open a GitHub Discussion with:

- Motivation (which vendors / pipelines need the change)
- Proposed Zod diff
- Migration notes for existing S3 batches

Maintainers label `rfc/schema` and decide before merge.
