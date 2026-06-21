# PhilanthroPy integration

[PhilanthroPy](https://github.com/PhilanthroPy-Project/PhilanthroPy) is the recommended ML layer for UniSchema egress. This guide maps **ConstituentEvent** aggregates to sklearn features and runs propensity scoring.

## Architecture

```
ConstituentEvent (egress JSON / S3 NDJSON)
    → unischema_features.py (per-email feature table)
    → optional CRM join (engagement_tier, lifetime_giving)
    → PhilanthroPy DonorPropensityModel / LapsePredictor
    → affinity or lapse scores (0–100)
```

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

`examples/downstream/unischema_features.py` aggregates events to one row per `constituent_email`:

| Column | Type | Source |
|--------|------|--------|
| `constituent_email` | string | Group key |
| `donation_count` | int | `eventType == DONATION` |
| `registration_count` | int | `eventType == EVENT_REGISTRATION` |
| `email_click_count` | int | `eventType == EMAIL_CLICK` |
| `total_amount` | float | Sum of donation `amount` |
| `total_gift_amount` | float | Alias of `total_amount` (PhilanthroPy naming) |
| `event_attendance_count` | int | Alias of `registration_count` |
| `last_donation_date` | ISO string | Latest donation `createdAt` |
| `last_event_date` | ISO string | Latest any-event `createdAt` |
| `first_event_date` | ISO string | Earliest any-event `createdAt` |
| `years_active` | float | Years from `first_event_date` to reference date |
| `metadata_key_count` | float | Sum of `normalizedMetadata` key counts |

Contract tests: `examples/downstream/tests/test_feature_contract.py`

### PhilanthroPy model inputs

| PhilanthroPy component | UniSchema-derived columns |
|------------------------|---------------------------|
| `DonorPropensityModel` | `total_gift_amount`, `years_active`, `event_attendance_count` |
| `RFMTransformer` | Use `last_donation_date`, `donation_count`, `total_amount` after date parsing |
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
| `unischema_features.py` | Library — egress → DataFrame |
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
from pathlib import Path
from philanthropy.models import DonorPropensityModel
from unischema_features import egress_dir_to_features

features = egress_dir_to_features(Path("data/egress"))
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
