#!/usr/bin/env bash
# Send a sample GiveCampus webhook and print the ConstituentEvent written to egress.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
EGRESS_DIR="${EGRESS_DIR:-$ROOT/data/egress}"
VENDOR="${VENDOR:-givecampus}"

case "$VENDOR" in
  givecampus)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/givecampus-donation.json}"
    ;;
  cvent)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/cvent-registration.json}"
    ;;
  imodules)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/imodules-registration.json}"
    ;;
  blackbaud)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/blackbaud-donation.json}"
    ;;
  npsp)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/npsp-donation.json}"
    ;;
  slate)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/slate-registration.json}"
    ;;
  *)
    echo "Unknown VENDOR=${VENDOR}. Supported: givecampus, cvent, imodules, blackbaud, npsp, slate" >&2
    exit 1
    ;;
esac

POLL_SECONDS="${POLL_SECONDS:-15}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (brew install jq)." >&2
  exit 1
fi

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "Payload file not found: $PAYLOAD_FILE" >&2
  exit 1
fi

echo "UniSchema demo — ${VENDOR} → ConstituentEvent"
echo "=============================================="
echo ""
echo "1. Checking ${BASE_URL}/health ..."
curl -sf "${BASE_URL}/health" | jq .
echo ""

echo "2. POST ${BASE_URL}/webhooks/${VENDOR}"
response="$(curl -sf -X POST "${BASE_URL}/webhooks/${VENDOR}" \
  -H "Content-Type: application/json" \
  --data-binary "@${PAYLOAD_FILE}")"
echo "$response" | jq .

ingestion_id="$(echo "$response" | jq -r '.ingestionId')"
if [[ -z "$ingestion_id" || "$ingestion_id" == "null" ]]; then
  echo "No ingestionId in response." >&2
  exit 1
fi

echo ""
echo "3. Waiting for ingestion ${ingestion_id} ..."
deadline=$((SECONDS + POLL_SECONDS))
status="pending"

while (( SECONDS < deadline )); do
  ingestion="$(curl -sf "${BASE_URL}/webhooks/ingestions/${ingestion_id}")"
  status="$(echo "$ingestion" | jq -r '.ingestion.status // empty')"

  if [[ "$status" == "completed" || "$status" == "failed" ]]; then
    break
  fi

  sleep 0.25
done

echo "$ingestion" | jq '{
  status: .ingestion.status,
  eventId: .ingestion.result.eventId,
  constituentEmail: .ingestion.result.constituentEmail,
  eventType: .ingestion.result.eventType,
  amount: .ingestion.result.amount
}'

if [[ "$status" != "completed" ]]; then
  echo ""
  echo "Ingestion did not complete (status: ${status:-unknown}). Check server logs." >&2
  exit 1
fi

event_id="$(echo "$ingestion" | jq -r '.ingestion.result.eventId')"
echo ""
echo "4. Looking for egress file under ${EGRESS_DIR} ..."

if [[ ! -d "$EGRESS_DIR" ]]; then
  echo "Egress directory not found. Is EGRESS_TARGET=local and the data volume mounted?" >&2
  exit 1
fi

egress_file="$(find "$EGRESS_DIR" -type f -name "${event_id}.json" 2>/dev/null | head -n 1 || true)"

if [[ -z "$egress_file" ]]; then
  echo "No egress file named ${event_id}.json yet. Recent files:" >&2
  find "$EGRESS_DIR" -type f -name '*.json' 2>/dev/null | tail -n 5 >&2 || true
  exit 1
fi

echo ""
echo "Success — ConstituentEvent written to:"
echo "  ${egress_file}"
echo ""
cat "$egress_file" | jq .
