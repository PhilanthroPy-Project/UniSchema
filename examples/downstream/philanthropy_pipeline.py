#!/usr/bin/env python3
"""
End-to-end: UniSchema egress → feature table → PhilanthroPy DonorPropensityModel.

Uses engagement-derived proxy labels when no CRM ground truth is available.
For production scoring with CRM labels, use philanthropy_crm_pipeline.py instead.
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import numpy as np
    from sklearn.model_selection import train_test_split
    from philanthropy.models import DonorPropensityModel
except ImportError:
    print(
        "PhilanthroPy not installed. Run:\n"
        "  pip install -r examples/downstream/requirements-philanthropy.txt",
        file=sys.stderr,
    )
    sys.exit(1)

from unischema_features import egress_dir_to_features, load_events

FEATURE_COLS = ["total_gift_amount", "years_active", "event_attendance_count"]


def _proxy_labels(features) -> np.ndarray:
    """Demo proxy when CRM labels are unavailable."""
    score = (
        features["donation_count"] * 3
        + features["registration_count"] * 2
        + features["email_click_count"]
        + features["metadata_key_count"] * 0.5
        + (features["total_amount"] >= 500).astype(float)
    )
    return (score >= 4).astype(int).to_numpy()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: philanthropy_pipeline.py <egress_dir>")
        sys.exit(1)

    egress_dir = Path(sys.argv[1])
    events = load_events(egress_dir)

    if len(events) < 2:
        print(f"Need at least 2 events (found {len(events)}). Run: npm run demo:multi")
        sys.exit(0)

    features = egress_dir_to_features(egress_dir)

    if features.empty:
        print("No constituent features produced.")
        sys.exit(1)

    X = features[FEATURE_COLS].to_numpy(dtype=float)
    y = _proxy_labels(features)

    if len(set(y)) < 2:
        print("Not enough class diversity for demo — add more varied webhook events.")
        sys.exit(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )

    model = DonorPropensityModel(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    scores = model.predict_affinity_score(X_test)

    print(f"Events loaded: {len(events)}")
    print(f"Constituents scored: {len(features)}")
    print(f"Test affinity scores (0–100): min={scores.min():.0f} max={scores.max():.0f} mean={scores.mean():.1f}")


if __name__ == "__main__":
    main()
