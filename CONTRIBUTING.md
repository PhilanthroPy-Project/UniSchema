# Contributing to UniSchema

Thank you for helping make webhook unification easier for university advancement teams.

## Quick start for contributors

```bash
git clone https://github.com/PhilanthroPy-Project/UniSchema.git
cd UniSchema
npm install && cd frontend && npm install && cd ..
npm run validate
```

## What to contribute

| Contribution | Guide |
|--------------|-------|
| **New vendor mapper** | [docs/adding-a-vendor.md](docs/adding-a-vendor.md) — required: mapper, tests, sample JSON, `.env.example` entry |
| **Documentation** | Role guides in `docs/`, downstream examples in `examples/` |
| **Bug fixes** | Include a test when fixing ingest, mapping, or security behavior |
| **Frontend / canvas** | Match existing Tailwind + React Flow patterns |

## Vendor PR checklist

Every new vendor PR must include:

1. `src/mappers/{vendor}.ts` with Zod payload schema + mapper function
2. Registration in `src/schema/master.ts`, `src/utils/sourceSystem.ts`, `src/utils/driftCapture.ts`, `src/config/webhookRoutes.ts`, `src/mappers/resolve.ts`
3. `tests/unit/mappers.test.ts` unit tests
4. `tests/integration/webhooks.test.ts` integration test for `POST /webhooks/{vendor}`
5. `samples/{vendor}-*.json` sample payload
6. `.env.example` secret variable documented

Run before opening a PR:

```bash
npm run validate
```

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). UniSchema serves advancement teams handling donor and constituent data — treat issues and reviews with appropriate care for privacy and production impact.

## Security

Do not commit secrets, `.env` files, or real production webhook payloads with PII. Report security issues privately via GitHub Security Advisories if available, or open a minimal reproduction issue without live credentials.

## Questions

Open a [GitHub Discussion](https://github.com/PhilanthroPy-Project/UniSchema/discussions) or issue with the `question` label.
