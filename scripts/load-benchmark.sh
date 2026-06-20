#!/usr/bin/env bash
# Synthetic webhook load test — reports requests/minute against a running UniSchema instance.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
DURATION_SECONDS="${DURATION_SECONDS:-60}"
PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/givecampus-donation.json}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

echo "UniSchema load benchmark"
echo "========================"
echo "Target: ${BASE_URL}/webhooks/givecampus"
echo "Duration: ${DURATION_SECONDS}s"
echo ""

curl -sf "${BASE_URL}/health" >/dev/null

start=$SECONDS
accepted=0
errors=0

while (( SECONDS - start < DURATION_SECONDS )); do
  status="$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/webhooks/givecampus" \
    -H "Content-Type: application/json" \
    --data-binary "@${PAYLOAD_FILE}")"

  if [[ "$status" == "202" ]]; then
    accepted=$((accepted + 1))
  else
    errors=$((errors + 1))
  fi
done

elapsed=$((SECONDS - start))
rpm=$(awk "BEGIN { printf \"%.0f\", ($accepted / $elapsed) * 60 }")

echo "Results"
echo "-------"
echo "Accepted (202): ${accepted}"
echo "Errors:         ${errors}"
echo "Elapsed:        ${elapsed}s"
echo "Throughput:     ~${rpm} requests/minute"
echo ""
echo "See docs/benchmarks.md for interpretation."
