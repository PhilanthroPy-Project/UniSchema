#!/usr/bin/env bash
# Chained pilot proof: multi-vendor demo → egress report → PhilanthroPy ML → CRM join.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EGRESS_DIR="${EGRESS_DIR:-$ROOT/data/egress}"
CRM_CSV="${CRM_CSV:-$ROOT/samples/crm-golden-record.csv}"
PHILANTHROPY_REQ="$ROOT/examples/downstream/requirements-philanthropy.txt"

cd "$ROOT"

has_philanthropy() {
  python3 -c "import philanthropy" 2>/dev/null
}

echo "=== Step 1: Send multi-vendor demo webhooks ==="
bash scripts/demo-webhook.sh --multi

echo ""
echo "=== Step 2: Egress report ==="
python3 examples/downstream/read_local_egress.py "$EGRESS_DIR"

echo ""
echo "=== Step 3: PhilanthroPy pipeline ==="
if has_philanthropy; then
  python3 examples/downstream/philanthropy_crm_pipeline.py "$EGRESS_DIR" "$CRM_CSV" || true
else
  echo "PhilanthroPy not installed — skipping ML step."
  echo "Install: pip install -r examples/downstream/requirements-philanthropy.txt"
fi

echo ""
echo "=== Step 4: CRM join ==="
if [[ -f "$CRM_CSV" ]]; then
  python3 examples/downstream/crm_join_example.py "$EGRESS_DIR" "$CRM_CSV"
else
  echo "CRM sample not found at $CRM_CSV — skipping join."
fi

echo ""
echo "Downstream demo complete."
echo "  Notebook: examples/downstream/egress_report.ipynb"
echo "  ML guide: docs/philanthropy-integration.md"
