# Changelog

All notable changes to UniSchema are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-07-17

### Added

- CiviCRM vendor mapper (Tier 3 bootstrap) — contribution/participant/mailing entities → **ConstituentEvent**, HMAC verification via `CIVICRM_WEBHOOK_SECRET`
- `samples/civicrm-donation.json` + canvas sample payload for CiviCRM
- README **Research** section linking UniSchema to the fundraising-analytics methods it operationally supports
- `.github/TOPICS.md` — repository topics for manual configuration

### Changed

- Vendor registry now lists **eight** built-in vendors (adds CiviCRM at Tier 3)
- Docs, demo script, `.env.example`, and `/api/vendors` reconciled for 8-vendor consistency

## [0.3.0] - 2026-06-21

### Added

- PhilanthroPy downstream bridge: `unischema_features.py`, `philanthropy_pipeline.py`, `philanthropy_crm_pipeline.py`
- Documentation: `philanthropy-integration.md`, `ecosystem.md`, `canvas-vs-code.md`, `competitive-positioning.md`, `ai-agent-loop.md`, `vendor-certification.md`
- Reference pilot case study: `docs/case-studies/reference-givecampus-cvent-pilot.md`
- dbt `mart_constituent_rfm_features` for PhilanthroPy batch scoring
- `npm run demo:multi` — multi-vendor webhook demo
- Feature column contract tests: `examples/downstream/tests/test_feature_contract.py`
- CI job `downstream-ml` for Python feature contract tests
- GitHub issue template: certify-vendor
- `externalConstituentId` preferred in `crm_join_example.py`

### Changed

- README restructured for ecosystem positioning (UniSchema + PhilanthroPy)
- `docs/README.md` vendor registry as single source of truth (7 vendors)
- `downstream-demo.sh` uses PhilanthroPy pipeline when installed
- Removed deprecated `bot_engagement_classifier.py` in favor of PhilanthroPy integration
- Operator guide documents `driftPendingCount` on `/health`

### Documentation

- All guides updated for 7-vendor consistency (GiveCampus, Cvent, iModules, Blackbaud, NPSP, Slate, Ellucian)
- `downstream-pipeline.md` recommends PhilanthroPy as primary ML path
- `schema-governance.md` adds `VOLUNTEER_SHIFT` RFC (documentation only)

## [0.2.0] - 2026-06-20

### Added

- Ellucian vendor mapper (tier 3 bootstrap) and Slate donation support
- `externalConstituentId` on ConstituentEvent for CRM joins
- Downstream adoption kit: chained demo script, dbt sources/marts, BigQuery/Redshift loaders, contract test
- Adoption checklist, downstream pipeline guide, pilot case-study template
- Drift worker (`scripts/drift-worker.ts`), PII redaction, post-merge ack workflow
- JWKS OIDC auth chain, oauth2-proxy compose, fail-fast prod secret validation
- Mapping audit API (`GET /api/mappings/:vendor/audit`), SIGTERM S3 flush
- Operator dashboard, first-run wizard, test webhook panel, Playwright E2E in CI
- `docker-compose.scale.yml`, hosted-tier RFC

### Changed

- Seven built-in vendors with tier metadata on `/api/vendors`
- Documentation reconciled for adoption flywheel and agent loop

See git history for full v0.2.0 release notes.
