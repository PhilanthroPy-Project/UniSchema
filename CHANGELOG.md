# Changelog

All notable changes to UniSchema are documented here. The project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Mapping canvas sync token UI with session storage and optional `VITE_MAPPING_SYNC_TOKEN`
- Vendor selector in admin UI (GiveCampus, Cvent, iModules, Blackbaud, NPSP)
- Read-only drift queue panel in admin UI
- iModules, Blackbaud, and Salesforce NPSP vendor mappers
- `GET /api/vendors` registry endpoint
- Extended `/health` with version, egress target, and drift pending count
- Postgres optional backend via `DATABASE_URL=postgres://...`
- Drift agent `--create-pr` flag for draft GitHub PRs
- Downstream examples: dbt staging model, CRM join script, warehouse loader stubs
- Load benchmark script and documentation
- OSS files: LICENSE, CONTRIBUTING.md, issue templates
- Pilot program templates in `docs/case-studies/`
- Schema governance and CODEOWNERS for vendor mappers

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

[Unreleased]: https://github.com/PhilanthroPy-Project/UniSchema/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/PhilanthroPy-Project/UniSchema/releases/tag/v0.1.0
