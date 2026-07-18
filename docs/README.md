# Documentation index

Pick the guide that matches your role — you don't need to read everything.

## By role

| Role | Guide | You will… |
|------|-------|-----------|
| **Admin / analyst** | [admin-guide.md](./admin-guide.md) | Draw mapping lines on the canvas, sync to engine |
| **Operator** | [operator-guide.md](./operator-guide.md) | Set `EGRESS_TARGET`, webhook secrets, deploy to cloud |
| **Developer** | [adding-a-vendor.md](./adding-a-vendor.md) | Add a vendor in 6 files |
| **Data engineer** | [downstream-pipeline.md](./downstream-pipeline.md) | Pilot → S3 → dbt → analytics |
| **Data scientist / ML engineer** | [philanthropy-integration.md](./philanthropy-integration.md) | ConstituentEvent → PhilanthroPy propensity scoring |
| **New adopter** | [adoption-checklist.md](./adoption-checklist.md) | Week-by-week pilot → production |
| **Everyone (before prod)** | [limitations-and-roadmap.md](./limitations-and-roadmap.md) | Scale, vendor tiers, honest v0.4 scope |
| **Security / privacy** | [security-and-privacy.md](./security-and-privacy.md) | FERPA-adjacent guidance, retention, rotation |

## Ecosystem and positioning

| Topic | Guide |
|-------|-------|
| UniSchema + PhilanthroPy stack | [ecosystem.md](./ecosystem.md) |
| Canvas vs code deploy boundary | [canvas-vs-code.md](./canvas-vs-code.md) |
| vs Lambdas, Zapier, Fivetran | [competitive-positioning.md](./competitive-positioning.md) |
| AI agent + drift loop | [ai-agent-loop.md](./ai-agent-loop.md) |

## Vendor registry

**Single source of truth** for built-in vendors. Other docs link here instead of duplicating tier tables.

| Tier | Vendors | Expectation |
|------|---------|-------------|
| **Tier 1** | GiveCampus, Cvent | Production-tested fixtures; primary support |
| **Tier 2** | iModules | Reference implementation for new vendors |
| **Tier 3** | Blackbaud, NPSP, Slate, Ellucian, CiviCRM | Community — verify with your real payloads |

### Compatibility matrix

| Vendor | Tier | Webhook route | Notes |
|--------|------|---------------|-------|
| GiveCampus | 1 | `/webhooks/givecampus` | Donations |
| Cvent | 1 | `/webhooks/cvent` | Registrations, events |
| iModules | 2 | `/webhooks/imodules` | Reference vendor |
| Blackbaud RENXT | 3 | `/webhooks/blackbaud` | Gift webhooks — verify payload shape |
| Salesforce NPSP | 3 | `/webhooks/npsp` | Donation objects — verify field API names |
| Slate | 3 | `/webhooks/slate` | Form webhooks — verify field API names |
| Ellucian | 3 | `/webhooks/ellucian` | Bootstrap mapper — verify with your payloads |
| CiviCRM | 3 | `/webhooks/civicrm` | Nonprofit CRM — contribution/participant/mailing; verify with your payloads |
| Other CRMs | — | — | See [adding-a-vendor.md](./adding-a-vendor.md) |

Promote Tier 3 → Tier 1 by contributing real payload fixtures + tests — see [adding-a-vendor.md](./adding-a-vendor.md).

## Additional references

| Topic | Guide |
|-------|-------|
| Postgres backend | [postgres.md](./postgres.md) |
| Load benchmarks | [benchmarks.md](./benchmarks.md) |
| Schema semver | [schema-governance.md](./schema-governance.md) |
| Contributing | [../CONTRIBUTING.md](../CONTRIBUTING.md) |

## Deployment

| Goal | Start here |
|------|------------|
| Pilot (SQLite, local egress) | `docker compose up` |
| Production (Postgres, secrets enforced) | [docker-compose.prod.yml](../docker-compose.prod.yml) |
| Low-ops cloud (Fly / Railway) | [../deploy/README.md](../deploy/README.md) |
| S3 bucket only (Terraform) | [../deploy/terraform/README.md](../deploy/terraform/README.md) |

## Experimental tooling

| Tool | Status | Guide |
|------|--------|-------|
| LLM drift agent | **Experimental — human review required** | [../agents/README.md](../agents/README.md) |

> The drift agent proposes mapper patches; it does **not** auto-fix production.

## Quick answers

**Do we need Airflow?** No for a pilot. S3 egress + PhilanthroPy or a notebook is enough.

**Do we need Postgres?** Not for a pilot. Use Postgres when you need 2+ instances — [postgres.md](./postgres.md).

**Do we need PhilanthroPy?** Optional for ingest-only pilots. Recommended for propensity/lapse scoring — [philanthropy-integration.md](./philanthropy-integration.md).

**Is there a hosted SaaS?** No — UniSchema is self-host only.
