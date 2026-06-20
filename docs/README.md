# Documentation index

Pick the guide that matches your role — you don't need to read everything.

## By role

| Role | Guide | You will… |
|------|-------|-----------|
| **Admin / analyst** | [admin-guide.md](./admin-guide.md) | Draw mapping lines on the canvas, sync to engine |
| **Operator** | [operator-guide.md](./operator-guide.md) | Set `EGRESS_TARGET`, webhook secrets, deploy to cloud |
| **Developer** | [adding-a-vendor.md](./adding-a-vendor.md) | Add vendor #3 in 6 files |
| **Data engineer** | [../examples/downstream/README.md](../examples/downstream/README.md) | Read NDJSON batches, prove downstream value |
| **Everyone (before prod)** | [limitations-and-roadmap.md](./limitations-and-roadmap.md) | SQLite limits, scale, honest v0.1.0 scope |

| **Pilot program** | [case-studies/README.md](./case-studies/README.md) | Join or document a pilot deployment |

## Vendor compatibility matrix

| Vendor | Status | Webhook route | Notes |
|--------|--------|---------------|-------|
| GiveCampus | Built-in | `/webhooks/givecampus` | Donations |
| Cvent | Built-in | `/webhooks/cvent` | Registrations, events |
| iModules | Built-in | `/webhooks/imodules` | Reference vendor #3 |
| Blackbaud RENXT | Built-in (community) | `/webhooks/blackbaud` | Gift webhooks — verify payload shape |
| Salesforce NPSP | Built-in (community) | `/webhooks/npsp` | Donation objects — verify field API names |
| Slate, Ellucian, etc. | Planned / community | — | See [adding-a-vendor.md](./adding-a-vendor.md) |

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
| First webhook in 15 min (local) | [../README.md#quick-start-15-minutes](../README.md#quick-start-15-minutes) |
| Low-ops cloud (Fly / Railway) | [../deploy/README.md](../deploy/README.md) |
| S3 bucket only (Terraform) | [../deploy/terraform/README.md](../deploy/terraform/README.md) |

## Experimental tooling

| Tool | Status | Guide |
|------|--------|-------|
| LLM drift agent | **Experimental — human review required** | [../agents/README.md](../agents/README.md) |

> The drift agent proposes mapper patches; it does **not** auto-fix production.

## Quick answers

**Do we need Airflow?** No for a pilot. S3 egress + a Python script or notebook is enough. Airflow is optional for scheduled warehouse loads.

**Do we need Postgres?** Not for a pilot. SQLite is fine on a single Fly/Railway instance. See [limitations-and-roadmap.md#scale--database](./limitations-and-roadmap.md#scale--database) before high-volume production.

**Is there a hosted SaaS?** Not yet. Use [deploy templates](../deploy/README.md) — Fly.io has a free allowance suitable for demos.
