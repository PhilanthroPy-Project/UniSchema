# Reference pilot: GiveCampus + Cvent (synthetic)

Anonymized reference case study for advancement teams evaluating UniSchema + PhilanthroPy. Institution name and PII are fictional.

## Institution profile

| Field | Value |
|-------|-------|
| Institution type | Private R1 |
| Advancement team size | 2 FTE analytics + 1 part-time CRM admin |
| Primary vendors | GiveCampus (giving day) + Cvent (galas, reunions) |
| Downstream stack | Docker pilot → Fly.io + S3 → Snowflake + PhilanthroPy |

## Problem

Before UniSchema:

- Two separate Python scripts maintained by one analyst (4–6 hours/month)
- GiveCampus gifts and Cvent registrations never joined on a common schema
- VP Advancement blocked an engagement dashboard project for lack of unified data
- No path from webhooks to propensity scoring without a 6-month data engineering project

## Solution

| Component | Choice |
|-----------|--------|
| Deploy | Docker Compose pilot week 1; Fly.io + S3 week 3 |
| Database | SQLite pilot; Postgres deferred |
| Egress | Local week 1; S3 NDJSON week 3 |
| Vendors wired | GiveCampus, Cvent (Tier 1); Slate deferred |

## Timeline

| Milestone | Duration | Notes |
|-----------|----------|-------|
| First ConstituentEvent | 15 min | `docker compose -f docker-compose.pilot.yml up` + `npm run demo` |
| Multi-vendor demo | Day 1 | `npm run demo:multi` — 8 events across vendors |
| Stakeholder notebook | Day 2 | `egress_report.ipynb` — donations by `sourceSystem` |
| PhilanthroPy scoring demo | Day 3 | `philanthropy_crm_pipeline.py` on demo egress + sample CRM |
| GiveCampus sandbox webhooks | Week 2 | Pointed at Fly.io deploy |
| Production go/no-go | Week 4 | Tier 1 vendors approved; Slate pending certification |

## Results

| Metric | Pilot value |
|--------|-------------|
| Events normalized (pilot month) | ~1,200 (sandbox + replay) |
| Canvas mappings used | 2 metadata fields on Cvent (`EventCode` prefix → `normalizedMetadata`) |
| CRM join rate (email) | 73% (27% sandbox emails not in CRM sample) |
| CRM join rate (`externalConstituentId`) | 81% when GiveCampus `id` present |
| PhilanthroPy affinity scores (demo) | 12 constituents scored; mean 62 (0–100 scale) |
| Integration effort reduction | ~5 hours/month script maintenance → ~30 min/month operator checks |

### ML outcomes

```bash
npm run demo:multi
pip install -r examples/downstream/requirements-philanthropy.txt
python3 examples/downstream/philanthropy_crm_pipeline.py data/egress samples/crm-golden-record.csv
```

Sample output:

```
Events loaded: 8
CRM join rate: 6/7 (86%)
Affinity scores (0–100): min=41 max=88 mean=67.3
{"constituent_email": "jane.doe@university.edu", "affinity_score": 72}
```

Models used: `DonorPropensityModel` + `WealthScreeningImputer` on CRM `lifetime_giving`.

**Label source:** CRM `engagement_tier` (`high` = 1) — not synthetic proxy labels.

### Blockers encountered

| Blocker | Resolution |
|---------|------------|
| Cvent `EventCode` prefix differed from fixtures | Canvas metadata mapping — no code deploy |
| Sandbox emails not in CRM | Expected; documented join rate for leadership |
| Slate payload shape unknown | Deferred to Tier 3 certification PR |

## Go/no-go criteria

| Criterion | Met? |
|-----------|------|
| Tier 1 vendors ingest with <1% mapping failures | Yes (sandbox) |
| Stakeholder saw unified egress report | Yes |
| PhilanthroPy pipeline runs on real-shaped features | Yes |
| Operator comfortable with secrets checklist | Yes |
| Slate verified with production payloads | No — deferred |

**Decision:** Production approved for GiveCampus + Cvent; Slate on hold.

## Recommendations for similar institutions

1. Start with `npm run demo:multi` and the egress notebook — same-day VP demo.
2. Read [canvas-vs-code.md](../canvas-vs-code.md) before promising no-code to leadership.
3. Use [philanthropy-integration.md](../philanthropy-integration.md) for ML scoring.
4. Certify Tier 3 vendors with redacted PRs before production donor data.
5. Run `npm run benchmark` before first giving day.

## Related

- [pilot-template.md](./pilot-template.md) — blank template for your institution
- [adoption-checklist.md](../adoption-checklist.md)
