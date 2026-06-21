#!/usr/bin/env bash
# Chained pilot proof: webhook demo → egress report → ML classifier → CRM join.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EGRESS_DIR="${EGRESS_DIR:-$ROOT/data/egress}"
CRM_CSV="${CRM_CSV:-$ROOT/samples/crm-golden-record.csv}"

cd "$ROOT"

echo "=== Step 1: Send demo webhook ==="
bash scripts/demo-webhook.sh

echo ""
echo "=== Step 2: Egress report ==="
python3 examples/downstream/read_local_egress.py "$EGRESS_DIR"

echo ""
echo "=== Step 3: Engagement classifier (needs ≥5 events for full demo) ==="
python3 examples/downstream/bot_engagement_classifier.py "$EGRESS_DIR" || true

echo ""
echo "=== Step 4: CRM join ==="
if [[ -f "$CRM_CSV" ]]; then
  python3 examples/downstream/crm_join_example.py "$EGRESS_DIR" "$CRM_CSV"
else
  echo "CRM sample not found at $CRM_CSV — skipping join."
fi

echo ""
echo "Downstream demo complete. See examples/downstream/egress_report.ipynb for charts."
