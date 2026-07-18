# Changelog

All notable changes to UniSchema are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.2] - 2026-07-18

### Fixed

- **Default `docker compose up` (and `npm run docker:up` / `docker:demo`) crash-looped.** The Dockerfile forces `NODE_ENV=production`, but the default compose file did not override it, so the server exited on missing production secrets. The canonical `docker-compose.yml` now sets `NODE_ENV: development`.
- `docs/adding-a-vendor.md` omitted the typecheck-forcing `VENDOR_TIERS` / `VENDOR_LABELS` maps and the `vendorRegistry` test count, so following the checklist as written failed the build.
- Stale version label in `docs/benchmarks.md`, a broken relative link in the dbt example, and a dead GitHub Discussions link in `CONTRIBUTING.md`.

### Removed

- Fabricated "reference pilot" case study — its headline metrics contradicted the real demo output in the same file, and the commands it documented actually failed — plus its blank template.
- Pretend-enterprise apparatus inappropriate for a pre-adoption project: the managed-SaaS hosted-tier RFC, the vendor "certification program," and the `certify-vendor` / `pilot-feedback` issue templates. The honest tier labels are retained.
- Duplicate `docker-compose.pilot.yml` (byte-identical to `docker-compose.yml` apart from the inert env line).

### Changed

- Slimmed the README from 15 sections to 13 (merged two duplicate status tables, trimmed a thrice-repeated value prop and an aspirational DOI blurb).
- Enabled GitHub Discussions and restored the Discussions link in `CONTRIBUTING.md`.

## [0.4.1] - 2026-07-18

### Fixed

- **Docker image now builds and publishes.** `frontend/package-lock.json` was missing the `@playwright/test` dependency tree, so the isolated `npm ci` in the Dockerfile frontend stage failed; and `node:20-alpine` (musl) had no `better-sqlite3` prebuild while better-sqlite3@12 dropped node-20 prebuilds. Both stages now use `node:22-slim` (glibc, prebuilt binary).
- **Docker egress is visible on the host.** The pilot/default composes bind-mount `./data` instead of a named volume, so `npm run demo` and the quickstart find the `ConstituentEvent` output.
- `SECURITY.md` supported-versions table (it listed the current release as unsupported).

### Added

- README trust badges (CI, license, Node) and a mapping-canvas hero screenshot.
- `CITATION.cff` for GitHub's "Cite this repository" widget.
- `CLAUDE.md` context file for AI coding sessions.

### Changed

- Quick start names the Node/`python3` prerequisites and points Docker-only users at the bash demo scripts.
- Broadened package description and keywords to nonprofit + fundraising.

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
