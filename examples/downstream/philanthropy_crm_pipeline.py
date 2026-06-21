#!/usr/bin/env python3
"""
UniSchema egress + CRM golden record → PhilanthroPy DonorPropensityModel.

Joins on constituent_email (or externalConstituentId when present in CRM export).
Uses CRM engagement_tier as ground-truth labels and lifetime_giving as a wealth signal.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

try:
    import numpy as np
    from sklearn.model_selection import train_test_split
    from philanthropy.models import DonorPropensityModel
    from philanthropy.preprocessing import WealthScreeningImputer
except ImportError:
    print(
        "PhilanthroPy not installed. Run:\n"
        "  pip install -r examples/downstream/requirements-philanthropy.txt",
        file=sys.stderr,
    )
    sys.exit(1)

from unischema_features import egress_dir_to_features, load_events

FEATURE_COLS = ["total_gift_amount", "years_active", "event_attendance_count"]
WEALTH_COL = "estimated_net_worth"


def load_crm(path: Path) -> dict[str, dict]:
    by_email: dict[str, dict] = {}
    by_external_id: dict[str, dict] = {}

    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            email = row.get("email", "").strip().lower()
            if email:
                by_email[email] = row
            ext_id = row.get("constituent_id", "").strip()
            if ext_id:
                by_external_id[ext_id] = row

    return {"email": by_email, "external_id": by_external_id}


def join_crm(features, crm_indexes, events: list[dict]) -> tuple:
    email_to_external: dict[str, str] = {}
    for event in events:
        email = str(event.get("constituentEmail", "")).strip().lower()
        ext = event.get("externalConstituentId")
        if email and isinstance(ext, str) and ext:
            email_to_external[email] = ext

    joined_rows = []
    labels = []
    wealth_values = []

    for _, row in features.iterrows():
        email = row["constituent_email"]
        crm_row = crm_indexes["email"].get(email)

        if crm_row is None:
            ext_id = email_to_external.get(email)
            if ext_id:
                crm_row = crm_indexes["external_id"].get(ext_id)

        if crm_row is None:
            continue

        joined_rows.append(row)
        tier = crm_row.get("engagement_tier", "").strip().lower()
        labels.append(1 if tier == "high" else 0)

        giving = crm_row.get("lifetime_giving", "0")
        try:
            wealth_values.append(float(giving))
        except ValueError:
            wealth_values.append(0.0)

    if not joined_rows:
        return None, None, None

    import pandas as pd

    frame = pd.DataFrame(joined_rows)
    frame[WEALTH_COL] = wealth_values
    return frame, np.array(labels, dtype=int), frame


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("egress_dir", type=Path, help="Local egress directory")
    parser.add_argument("crm_csv", type=Path, help="CRM export with email and engagement_tier")
    args = parser.parse_args()

    events = load_events(args.egress_dir)
    if not events:
        print("No ConstituentEvent files found. Run: npm run demo:multi")
        sys.exit(0)

    features = egress_dir_to_features(args.egress_dir)
    crm_indexes = load_crm(args.crm_csv)
    joined, y, frame = join_crm(features, crm_indexes, events)

    if joined is None or y is None or frame is None:
        print("No CRM matches on email or externalConstituentId.")
        sys.exit(0)

    if len(set(y)) < 2:
        print("CRM labels lack class diversity (need high and standard engagement_tier).")
        sys.exit(0)

    X_base = joined[FEATURE_COLS].to_numpy(dtype=float)
    wealth_imputer = WealthScreeningImputer(wealth_cols=[WEALTH_COL], strategy="median")
    wealth_matrix = wealth_imputer.fit_transform(frame[[WEALTH_COL]].to_numpy(dtype=float))
    X = np.hstack([X_base, wealth_matrix])

    if len(X) < 4:
        print(f"Only {len(X)} matched constituents — need more events or CRM overlap.")
        sys.exit(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )

    model = DonorPropensityModel(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    scores = model.predict_affinity_score(X_test)

    match_rate = len(joined) / max(len(features), 1)
    print(f"Events loaded: {len(events)}")
    print(f"CRM join rate: {len(joined)}/{len(features)} ({match_rate:.0%})")
    print(f"Affinity scores (0–100): min={scores.min():.0f} max={scores.max():.0f} mean={scores.mean():.1f}")

    for email, score in zip(
        joined["constituent_email"].iloc[:5],
        model.predict_affinity_score(X)[:5],
    ):
        print(json.dumps({"constituent_email": email, "affinity_score": int(score)}))


if __name__ == "__main__":
    main()
