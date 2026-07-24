# PhilanthroPy integration

[PhilanthroPy](https://github.com/PhilanthroPy-Project/PhilanthroPy) is the recommended ML layer for UniSchema egress. This guide maps **ConstituentEvent** aggregates to sklearn features and runs propensity scoring.

## Architecture

```
ConstituentEvent (egress JSON / S3 NDJSON)
    → philanthropy.ingest.constituent_events_to_features (per-donor feature table)
    → optional CRM join (engagement_tier, lifetime_giving)
    → PhilanthroPy DonorPropensityModel / LapsePredictor
    → affinity or lapse scores (0–100)
```

Both reading and aggregation live in PhilanthroPy's `philanthropy.ingest` — the single source of truth. `read_constituent_events` walks UniSchema's date-partitioned egress tree (recursively; skips `.manifest.json` sidecars); `constituent_events_to_features` is **leakage-safe** (recency anchored to the batch, never a moving "now") and **deduplicates** redelivered webhooks by `eventId`.

Warehouse path: dbt `mart_constituent_rfm_features` → export CSV → same PhilanthroPy pipeline.

## Install

```bash
pip install -r examples/downstream/requirements-philanthropy.txt
```

This installs PhilanthroPy from GitHub plus pandas, scikit-learn, and pytest.

## Quick start (local egress)

```bash
npm run demo:multi
pip install -r examples/downstream/requirements-philanthropy.txt
python3 examples/downstream/philanthropy_crm_pipeline.py data/egress samples/crm-golden-record.csv
```

Or run the full chain:

```bash
npm run downstream-demo
```

## Feature column contract

`philanthropy.ingest.constituent_events_to_features` aggregates events to one row per donor, indexed by `constituent_id` (the `externalConstituentId` when present, else `constituentEmail`). This contract is owned and tested in the PhilanthroPy repo (`tests/test_ingest.py`):

| Column | Type | Source |
|--------|------|--------|
| `constituent_email` | string | First email seen for the donor |
| `total_gift_amount` | float | Sum of `DONATION` `amount` (single-currency; warns on mixed) |
| `gift_count` | int | Count of `DONATION` events |
| `event_attendance_count` | int | Count of `EVENT_REGISTRATION` events |
| `email_click_count` | int | Count of `EMAIL_CLICK` events |
| `first_gift_date` | datetime | Earliest donation `createdAt` |
| `last_gift_date` | datetime | Latest donation `createdAt` |
| `years_active` | float | First event → reference date |
| `recency_days` | int | Last event → reference date |
| `distinct_source_systems` | int | Channel breadth |

Index: `constituent_id` (`externalConstituentId` ?? `constituentEmail`).

### PhilanthroPy model inputs

| PhilanthroPy component | UniSchema-derived columns |
|------------------------|---------------------------|
| `DonorPropensityModel` | `total_gift_amount`, `years_active`, `event_attendance_count` |
| `RFMTransformer` | `recency_days`, `gift_count`, `total_gift_amount` |
| `WealthScreeningImputer` | CRM `lifetime_giving` → `estimated_net_worth` |
| `LapsePredictor` | CRM-derived lapse labels + RFM features from warehouse |

## CRM golden-record join

Prefer join order:

1. **`externalConstituentId`** on ConstituentEvent → CRM `constituent_id` (when vendor provides stable IDs)
2. **`constituentEmail`** → CRM `email` (fallback)

Example CRM columns (see `samples/crm-golden-record.csv`):

| CRM column | Use |
|------------|-----|
| `email` | Join key |
| `constituent_id` | Join via `externalConstituentId` |
| `engagement_tier` | Label (`high` = positive class) |
| `lifetime_giving` | Wealth imputation input |

## Scripts

| Script | Purpose |
|--------|---------|
| `philanthropy_pipeline.py` | Egress only, proxy labels (demo) |
| `philanthropy_crm_pipeline.py` | **Recommended** — CRM labels + `DonorPropensityModel` |

## Production (S3 → warehouse → batch scoring)

1. Configure S3 egress — [operator-guide.md](./operator-guide.md)
2. Load NDJSON into Snowflake/BigQuery — [downstream-pipeline.md](./downstream-pipeline.md)
3. Run dbt `mart_constituent_rfm_features`
4. Export mart to CSV or query via Python connector
5. Feed feature columns into PhilanthroPy batch scoring job (Airflow task or scheduled notebook)

## sklearn pipeline example

```python
from philanthropy.ingest import constituent_events_to_features, read_constituent_events
from philanthropy.models import DonorPropensityModel

features = constituent_events_to_features(read_constituent_events("data/egress"))
X = features[["total_gift_amount", "years_active", "event_attendance_count"]].to_numpy()

# y from CRM engagement_tier after join — see philanthropy_crm_pipeline.py
model = DonorPropensityModel(n_estimators=200, random_state=42)
model.fit(X_train, y_train)
scores = model.predict_affinity_score(X_test)  # 0–100
```

## Related

- [ecosystem.md](./ecosystem.md) — full PhilanthroPy-Project stack
- [downstream-pipeline.md](./downstream-pipeline.md) — dbt and Airflow
- [PhilanthroPy docs](https://github.com/PhilanthroPy-Project/PhilanthroPy)
