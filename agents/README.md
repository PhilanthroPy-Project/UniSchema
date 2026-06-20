# Drift agent (experimental)

> **Status: experimental / human-in-the-loop**  
> This is **not** self-healing production infrastructure. It assists engineers when vendor payloads drift from expected schemas.

## What it does

1. Polls `GET /drift/events?status=pending&includePayload=true` (requires `DRIFT_AGENT_TOKEN`)
2. Writes Vitest fixtures from failed payloads
3. Uses an LLM (OpenAI via LlamaIndex) to **propose** TypeScript mapper patches
4. Outputs suggestions under `agents/output/` — **not** applied automatically

## What it does not do

- Deploy or hot-reload mappers in production
- Bypass code review or CI
- Guarantee correct patches (always validate with `npm test`)
- Replace operator investigation of the drift queue

## When to use it

| Good fit | Poor fit |
|----------|----------|
| Accelerating fixture + patch drafts after a vendor schema change | Unattended production cron without human review |
| Local dev against a SQLite copy | Teams without LLM API budget / policy |
| CI hourly dry-run with manual merge | Expectation of "auto-fix" SLAs |

## Setup

```bash
pip install -r agents/drift_runner/requirements.txt

# Local SQLite
python -m agents.drift_runner --database data/unischema.db

# Production API (read-only drift export)
python -m agents.drift_runner \
  --api-url https://unischema.example.com \
  --token "$DRIFT_AGENT_TOKEN"
```

Required secrets: `DRIFT_AGENT_TOKEN`, `OPENAI_API_KEY` (optional `DRIFT_AGENT_MODEL`).

## Operator workflow

1. Drift event appears after webhook validation failure
2. Engineer runs agent locally or via GitHub Action (`.github/workflows/drift-agent.yml`)
3. Review `agents/output/` patch proposal
4. Run tests, adjust, open PR
5. `POST /drift/events/:id/ack` after merge/deploy

## GitHub Action

The hourly workflow is a **scaffold** — configure repository secrets and treat outputs as draft PRs, not auto-merge.

Optional draft PR after patch generation:

```bash
python -m agents.drift_runner --database data/unischema.db --create-pr
```

Requires `gh` CLI authenticated. **Human review required** before merge.

See [docs/operator-guide.md](../docs/operator-guide.md#drift-queue-operator-workflow) for the full operator path.
