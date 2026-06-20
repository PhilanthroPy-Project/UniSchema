# UniSchema

Open-source webhook unification for university advancement teams. UniSchema ingests vendor-specific webhook payloads (Cvent, GiveCampus, and more), validates them with Zod, and maps them into a single **ConstituentEvent** master schema that downstream CRM and data systems can consume reliably.

## Project structure

```
UniSchema/
├── src/                  # Hono backend — webhooks, mappers, master schema
├── tests/                # Vitest mapper contract tests
├── frontend/             # React Flow visual schema mapper (Vite + Tailwind)
└── .github/workflows/    # CI validation pipeline
```

## Backend

### Requirements

- Node.js 20+
- npm

### Setup

```bash
npm install
npm run dev      # watch mode on http://localhost:3000
npm start        # production-style start
npm test         # run mapper test suite
```

The server listens on port `3000` by default. Override with the `PORT` environment variable.

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/webhooks/cvent` | Map a Cvent registration payload to `ConstituentEvent` |
| `POST` | `/webhooks/givecampus` | Map a GiveCampus donation payload to `ConstituentEvent` |

Invalid payloads return `400` with flattened Zod validation errors.

### Master schema

All vendors normalize into `ConstituentEvent`:

| Field | Type | Notes |
|-------|------|-------|
| `eventId` | UUID | Generated per ingestion |
| `constituentEmail` | email | Primary constituent identifier |
| `firstName`, `lastName` | string | Optional (Cvent) |
| `eventType` | enum | `EVENT_REGISTRATION`, `DONATION`, `EMAIL_CLICK` |
| `sourceSystem` | string | e.g. `CVENT`, `GIVECAMPUS` |
| `amount`, `currency` | number, string | Optional (GiveCampus donations) |
| `payload` | object | Original vendor payload preserved |
| `createdAt` | ISO datetime | Ingestion timestamp |

Mappers live in `src/mappers/` and are validated by the test suite in `tests/mappers.test.ts`.

## Frontend — Visual Schema Mapper

A drag-and-drop canvas for database administrators to visually connect external webhook fields to the master schema.

### Setup

```bash
cd frontend
npm install
npm run dev      # Vite dev server
npm run build    # production build
```

Built with **React**, **React Flow**, **Tailwind CSS**, and **Lucide** icons.

The canvas displays:

- **Source node** (left) — GiveCampus webhook fields: `id`, `donation_type`, `value`, `currency`, `donor_email`
- **Destination node** (right) — `ConstituentEvent` fields: `eventId`, `constituentEmail`, `eventType`, `amount`, `currency`

Drag from a source field handle to a destination field handle to create a mapping. Click **Generate Mapping Config** to log the active connections to the browser console (e.g. `[{ source: 'donor_email', target: 'constituentEmail' }]`).

## Testing

UniSchema enforces a multi-layer test contract for both human contributors and the autonomous agent pipeline:

| Suite | Location | Purpose |
|-------|----------|---------|
| Mapper tests | `tests/mappers.test.ts` | Vendor payload → master schema mapping and boundary cases |
| Schema tests | `tests/schema.test.ts` | `ConstituentEvent` Zod invariants |
| Webhook tests | `tests/webhooks.test.ts` | Hono route integration (`/health`, `/webhooks/*`) |
| Security tests | `tests/security.test.ts` | Secret scanning and sensitive-path `.gitignore` enforcement |
| Frontend tests | `frontend/tests/` | Visual mapper utility logic |

Run all commands from the **repository root** (`UniSchema/`), not from `frontend/`.

**Full local validation (matches CI):**

```bash
npm run validate
```

**Backend only** (from repository root):

```bash
npm run typecheck
npm test
npm run test:coverage
npm run test:security
```

**Security only** (from repository root):

```bash
npm run test:security
```

**Frontend only:**

```bash
cd frontend
npm run typecheck
npm run test
npm run build
```

**Backend + frontend tests** (from repository root):

```bash
npm run test:all
```

CI runs on every push to `main` and on pull requests via the **Agent Pipeline Validation** workflow. The pipeline blocks merges unless the security guard passes, backend typecheck, coverage-backed tests, frontend typecheck, frontend tests, and production build all pass.

## Security

This repository is public. Treat credentials as compromised if they ever appear in git history.

**Local setup**

- Copy `.env.example` to `.env` for local configuration.
- Never commit `.env`, key files (`.pem`, `.key`), or credential JSON.

**Automated guardrails**

- `.gitignore` blocks common secret and environment file paths.
- `tests/security.test.ts` scans tracked files for high-confidence secret patterns (GitHub tokens, AWS keys, private keys, etc.) and fails if forbidden paths are tracked.
- CI runs the security suite first and blocks tracked `.env` files before backend or frontend jobs start.

Run the guard locally before opening a PR:

```bash
npm run test:security
```

## License

MIT
