# Security & privacy (advancement teams)

Guidance for university advancement shops handling constituent and donor data through UniSchema. This is **not legal advice** — consult your institution's counsel for FERPA, GDPR, or state privacy obligations.

## What data flows through UniSchema

| Stage | Data | Storage |
|-------|------|---------|
| Webhook ingest | Raw vendor JSON (may include email, name, gift amount) | SQLite/Postgres `webhook_ingestions` |
| Mapped event | **ConstituentEvent** (email required; optional PII) | SQLite/Postgres + egress JSON |
| Egress | NDJSON batches on S3 or local disk | Your bucket / volume |
| Drift queue | Failed payloads for operator review | SQLite/Postgres `drift_events` |

UniSchema is a **data processor** under your control. You choose vendors, retention, and downstream access.

## Minimum production controls

1. **HMAC webhook secrets** — reject unsigned payloads (`WEBHOOK_SIGNATURE_REQUIRED=true`).
2. **Admin API tokens** — `MAPPING_SYNC_TOKEN`, `DRIFT_AGENT_TOKEN` (or reuse sync token for drift UI).
3. **TLS everywhere** — terminate HTTPS at Fly/Railway/nginx; never expose plain HTTP to the public internet.
4. **S3 bucket policy** — least-privilege IAM; block public ACLs; enable encryption (SSE-S3 or KMS).
5. **Backup egress** — S3 versioning or lifecycle rules; local egress requires volume snapshots.

## FERPA-adjacent considerations

Advancement data often mixes alumni (non-FERPA) with current students. Treat all constituent emails as sensitive:

- Restrict admin UI and API tokens to staff who need mapping access.
- Do not paste production payloads into public issue trackers or LLM tools without redaction.
- The experimental drift agent sends payload context to an LLM when configured — disable or run locally with redacted fixtures if policy requires.

## Retention

Configure downstream retention in your warehouse. UniSchema does not auto-delete ingested rows.

Optional env (document for operators):

| Variable | Purpose |
|----------|---------|
| `EGRESS_RETENTION_DAYS` | Document-only hint for S3 lifecycle rules (not enforced in-app) |

Recommended: S3 lifecycle transition to Glacier after N days; purge drift `processed` events periodically via SQL maintenance.

## Webhook secret rotation

1. Generate new secret in vendor dashboard.
2. Set new env var on UniSchema (Fly secrets / Railway vars).
3. Deploy/restart.
4. Update vendor webhook configuration.
5. Revoke old secret after verifying ingest.

## Incident response

1. Rotate `MAPPING_SYNC_TOKEN` and vendor HMAC secrets.
2. Review `mapping_audit_log` for unauthorized canvas changes.
3. Check drift queue for unexpected payload shapes (possible attack or vendor change).
4. Report security defects via [SECURITY.md](../SECURITY.md).

## Optional OIDC admin auth

Set `OIDC_ISSUER` and `OIDC_AUDIENCE` to accept JWT Bearer tokens from your IdP for mapping sync and drift APIs (in addition to sync token). Webhook routes remain HMAC-only.

See [operator-guide.md](./operator-guide.md) for deployment checklist.
