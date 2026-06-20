#!/usr/bin/env python3
"""
Board of Trustee engagement baseline classifier (starter).

Loads ConstituentEvent JSON files from local egress, builds per-email features,
and trains a simple RandomForest on a synthetic engagement label derived from
event mix (for demo purposes — replace labels with your CRM ground truth).

Usage:
  python3 examples/downstream/bot_engagement_classifier.py data/egress
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report
except ImportError:
    print("Install scikit-learn: pip install scikit-learn")
    sys.exit(1)


def load_events(egress_dir: Path) -> list[dict]:
    events: list[dict] = []
    for path in egress_dir.rglob("*.json"):
        if path.name.endswith(".manifest.json"):
            continue
        try:
            events.append(json.loads(path.read_text()))
        except json.JSONDecodeError:
            continue
    return events


def build_feature_table(events: list[dict]) -> tuple[list[list[float]], list[str], list[int]]:
    by_email: dict[str, dict[str, float]] = defaultdict(lambda: {
        "donation_count": 0.0,
        "registration_count": 0.0,
        "email_click_count": 0.0,
        "total_amount": 0.0,
    })

    for event in events:
        email = event.get("constituentEmail")
        if not email:
            continue
        row = by_email[email]
        et = event.get("eventType", "")
        if et == "DONATION":
            row["donation_count"] += 1
            amount = event.get("amount")
            if isinstance(amount, (int, float)):
                row["total_amount"] += float(amount)
        elif et == "EVENT_REGISTRATION":
            row["registration_count"] += 1
        elif et == "EMAIL_CLICK":
            row["email_click_count"] += 1

    X: list[list[float]] = []
    emails: list[str] = []
    y: list[int] = []

    for email, feats in by_email.items():
        score = (
            feats["donation_count"] * 3
            + feats["registration_count"] * 2
            + feats["email_click_count"]
            + (1 if feats["total_amount"] >= 500 else 0)
        )
        label = 1 if score >= 4 else 0  # demo proxy for "high engagement"
        X.append([
            feats["donation_count"],
            feats["registration_count"],
            feats["email_click_count"],
            feats["total_amount"],
        ])
        emails.append(email)
        y.append(label)

    return X, emails, y


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: bot_engagement_classifier.py <egress_dir>")
        sys.exit(1)

    egress_dir = Path(sys.argv[1])
    events = load_events(egress_dir)

    if len(events) < 5:
        print(f"Need more events (found {len(events)}). Run npm run demo first.")
        sys.exit(0)

    X, emails, y = build_feature_table(events)

    if len(set(y)) < 2:
        print("Not enough class diversity for demo classifier — add more varied webhook demos.")
        sys.exit(0)

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, range(len(X)), test_size=0.3, random_state=42
    )

    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_train, y_train)
    preds = clf.predict(X_test)

    print(f"Events loaded: {len(events)}")
    print(f"Unique constituents: {len(emails)}")
    print(classification_report(y_test, preds, target_names=["standard", "high_engagement"]))


if __name__ == "__main__":
    main()
