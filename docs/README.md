# Documentation index

Pick the guide that matches your role — you don't need to read everything.

## By role

| Role | Guide | You will… |
|------|-------|-----------|
| **Admin / analyst** | [admin-guide.md](./admin-guide.md) | Draw mapping lines on the canvas, sync to engine |
| **Operator** | [operator-guide.md](./operator-guide.md) | Set `EGRESS_TARGET`, webhook secrets, deploy to cloud |
| **Developer** | [adding-a-vendor.md](./adding-a-vendor.md) | Add a vendor in 6 files |
| **Data engineer** | [downstream-pipeline.md](./downstream-pipeline.md) | Pilot → S3 → dbt → analytics |
| **New adopter** | [adoption-checklist.md](./adoption-checklist.md) | Week-by-week pilot → production |
| **Everyone (before prod)** | [limitations-and-roadmap.md](./limitations-and-roadmap.md) | Scale, vendor tiers, honest v0.2.0 scope |
| **Security / privacy** | [security-and-privacy.md](./security-and-privacy.md) | FERPA-adjacent guidance, retention, rotation |

## Vendor maturity tiers

| Tier | Vendors | Expectation |
|------|---------|-------------|
| **Tier 1** | GiveCampus, Cvent | Production-tested fixtures; primary support |
| **Tier 2** | iModules | Reference implementation for new vendors |
| **Tier 3** | Blackbaud, NPSP | Community — submit real (redacted) payload PRs to certify |
| **Tier 3** | Slate | Community mapper — verify form field names with your Slate instance |

Community-tier vendors (Blackbaud, NPSP, Slate): submit redacted real payload PRs to certify field names against your instance.

## Vendor compatibility matrix

| Vendor | Tier | Webhook route | Notes |
|--------|------|---------------|-------|
| GiveCampus | 1 | `/webhooks/givecampus` | Donations |
| Cvent | 1 | `/webhooks/cvent` | Registrations, events |
| iModules | 2 | `/webhooks/imodules` | Reference vendor |
| Blackbaud RENXT | 3 | `/webhooks/blackbaud` | Gift webhooks — verify payload shape |
| Salesforce NPSP | 3 | `/webhooks/npsp` | Donation objects — verify field API names |
| Slate | 3 | `/webhooks/slate` | Form webhooks — verify field API names |
| Ellucian | 3 | `/webhooks/ellucian` | Reference bootstrap — verify with your payloads |
| Other CRMs | — | — | See [adding-a-vendor.md](./adding-a-vendor.md) |

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
| Pilot (SQLite, local egress) | `docker compose -f docker-compose.pilot.yml up` |
| Production (Postgres, secrets enforced) | [docker-compose.prod.yml](../docker-compose.prod.yml) |
| Low-ops cloud (Fly / Railway) | [../deploy/README.md](../deploy/README.md) |
| S3 bucket only (Terraform) | [../deploy/terraform/README.md](../deploy/terraform/README.md) |

## Experimental tooling

| Tool | Status | Guide |
|------|--------|-------|
| LLM drift agent | **Experimental — human review required** | [../agents/README.md](../agents/README.md) |

> The drift agent proposes mapper patches; it does **not** auto-fix production.

## Quick answers

**Do we need Airflow?** No for a pilot. S3 egress + a Python script or notebook is enough.

**Do we need Postgres?** Not for a pilot. Use Postgres when you need 2+ instances or shared state — [postgres.md](./postgres.md).

**Is there a hosted SaaS?** Not yet — self-host with Docker or Fly/Railway templates.
