# Changelog

All notable changes to UniSchema are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-06-20

### Added

- Mapping canvas sync token UI with session storage and optional `VITE_MAPPING_SYNC_TOKEN`
- Vendor selector in admin UI (GiveCampus, Cvent, iModules, Blackbaud, NPSP, Slate)
- Read-only drift queue panel with payload view, ack, and canvas deep-link
- `normalizedMetadata` mapping editor, import mapping JSON, paste/upload payload, test preview
- iModules, Blackbaud, and Salesforce NPSP vendor mappers
- Slate vendor mapper (community tier)
- `GET /api/vendors` registry endpoint
- `POST /api/mappings/preview` — preview ConstituentEvent without persisting
- Extended `/health` with version, egress target, drift pending count, queue depth
- Postgres optional backend via `DATABASE_URL=postgres://...`
- Optional Redis rate limit store (`REDIS_URL`)
- Optional pg-boss ingest queue when Postgres is configured
- Drift agent `--create-pr` flag and CI trigger on mapper test failure
- Downstream examples: dbt project stub, BoT engagement classifier, warehouse loader
- Load benchmark script and published numbers
- OSS files: SECURITY.md, CODE_OF_CONDUCT.md, Dependabot, PR template, GHCR release workflow
- Schema governance and CODEOWNERS for vendor mappers
- Docker compose profiles: `docker-compose.pilot.yml`, `docker-compose.prod.yml`
- Production config validation at startup
- OIDC admin auth (optional), mapping audit log, observability metrics
- Security and privacy guide

### Changed

- Backend entry split into `src/app.ts` and `src/routes/register.ts`
- Backend tests organized into `tests/unit/` and `tests/integration/`
- npm workspaces for frontend package
- GiveCampus mapper surfaces `donation_type` in `normalizedMetadata`
- Dynamic mapper default event types for all six built-in vendors
- Documentation reconciled for v0.2.0 vendor and Postgres support

## [0.1.0] - 2026-06-20

### Added

- GiveCampus and Cvent webhook ingestion with HMAC verification
- ConstituentEvent master schema with Zod validation
- Visual mapping canvas with dynamic mapper overrides
- Async webhook ingest with crash recovery
- Local and S3 egress push with Airflow webhook integration
- Schema drift capture and experimental LLM drift agent
- Docker Compose quick start and role-based documentation
- Fly.io and Railway deploy templates
- 188+ automated tests with security-first CI

[Unreleased]: https://github.com/PhilanthroPy-Project/UniSchema/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/PhilanthroPy-Project/UniSchema/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PhilanthroPy-Project/UniSchema/releases/tag/v0.1.0
