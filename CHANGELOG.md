# Changelog

All notable changes to UniSchema are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
- Documentation reconciled for adoption flywheel and agent loop (7 vendors, Redis docs fix)

## [0.2.0] - 2026-06-20

See git history for the v0.2.0 release notes.
