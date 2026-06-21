#!/usr/bin/env bash
# Send sample webhooks and print ConstituentEvent files written to egress.
# Usage:
#   demo-webhook.sh              # single GiveCampus payload (default)
#   demo-webhook.sh --multi      # all built-in vendor samples
#   VENDOR=cvent demo-webhook.sh # single vendor
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000}"
EGRESS_DIR="${EGRESS_DIR:-$ROOT/data/egress}"
POLL_SECONDS="${POLL_SECONDS:-15}"
MULTI=false

if [[ "${1:-}" == "--multi" ]]; then
  MULTI=true
  shift
fi

declare -a MULTI_PAIRS=(
  "givecampus|$ROOT/samples/givecampus-donation.json"
  "cvent|$ROOT/samples/cvent-registration.json"
  "imodules|$ROOT/samples/imodules-registration.json"
  "blackbaud|$ROOT/samples/blackbaud-donation.json"
  "npsp|$ROOT/samples/npsp-donation.json"
  "slate|$ROOT/samples/slate-registration.json"
  "ellucian|$ROOT/samples/ellucian-registration.json"
)

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required (brew install jq)." >&2
  exit 1
fi

post_vendor() {
  local vendor="$1"
  local payload_file="$2"
  local quiet="${3:-false}"

  if [[ ! -f "$payload_file" ]]; then
    echo "Payload file not found: $payload_file" >&2
    return 1
  fi

  if [[ "$quiet" != "true" ]]; then
    echo ""
    echo "POST ${BASE_URL}/webhooks/${vendor}"
  fi

  local response
  response="$(curl -sf -X POST "${BASE_URL}/webhooks/${vendor}" \
    -H "Content-Type: application/json" \
    --data-binary "@${payload_file}")"

  local ingestion_id
  ingestion_id="$(echo "$response" | jq -r '.ingestionId')"
  if [[ -z "$ingestion_id" || "$ingestion_id" == "null" ]]; then
    echo "No ingestionId for ${vendor}." >&2
    return 1
  fi

  local deadline=$((SECONDS + POLL_SECONDS))
  local status="pending"
  local ingestion=""

  while (( SECONDS < deadline )); do
    ingestion="$(curl -sf "${BASE_URL}/webhooks/ingestions/${ingestion_id}")"
    status="$(echo "$ingestion" | jq -r '.ingestion.status // empty')"

    if [[ "$status" == "completed" || "$status" == "failed" ]]; then
      break
    fi

    sleep 0.25
  done

  if [[ "$status" != "completed" ]]; then
    echo "Ingestion failed for ${vendor} (status: ${status:-unknown})" >&2
    echo "$ingestion" | jq . >&2 || true
    return 1
  fi

  local event_id
  event_id="$(echo "$ingestion" | jq -r '.ingestion.result.eventId')"
  if [[ "$quiet" != "true" ]]; then
    echo "$ingestion" | jq '{
      vendor: "'"${vendor}"'",
      status: .ingestion.status,
      eventId: .ingestion.result.eventId,
      constituentEmail: .ingestion.result.constituentEmail,
      eventType: .ingestion.result.eventType
    }'
  else
    echo "  ✓ ${vendor} → ${event_id}"
  fi
}

if [[ "$MULTI" == "true" ]]; then
  echo "UniSchema multi-vendor demo"
  echo "==========================="
  echo ""
  echo "Checking ${BASE_URL}/health ..."
  curl -sf "${BASE_URL}/health" | jq .
  echo ""

  succeeded=0
  for pair in "${MULTI_PAIRS[@]}"; do
    vendor="${pair%%|*}"
    payload_file="${pair#*|}"
    if post_vendor "$vendor" "$payload_file" true; then
      succeeded=$((succeeded + 1))
    fi
  done

  # Second slate payload for donation variety
  if [[ -f "$ROOT/samples/slate-donation.json" ]]; then
    if post_vendor "slate" "$ROOT/samples/slate-donation.json" true; then
      succeeded=$((succeeded + 1))
    fi
  fi

  echo ""
  echo "Completed ${succeeded} ingestions. Egress files under ${EGRESS_DIR}:"
  find "$EGRESS_DIR" -type f -name '*.json' ! -name '*.manifest.json' 2>/dev/null | wc -l | xargs echo "  Total JSON files:"
  exit 0
fi

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
  ellucian)
    PAYLOAD_FILE="${PAYLOAD_FILE:-$ROOT/samples/ellucian-registration.json}"
    ;;
  *)
    echo "Unknown VENDOR=${VENDOR}. Supported: givecampus, cvent, imodules, blackbaud, npsp, slate, ellucian" >&2
    exit 1
    ;;
esac

echo "UniSchema demo — ${VENDOR} → ConstituentEvent"
echo "=============================================="
echo ""
echo "1. Checking ${BASE_URL}/health ..."
curl -sf "${BASE_URL}/health" | jq .
echo ""

post_vendor "$VENDOR" "$PAYLOAD_FILE" false

event_id="$(find "$EGRESS_DIR" -type f -name '*.json' ! -name '*.manifest.json' 2>/dev/null | tail -n 1 | xargs basename 2>/dev/null | sed 's/.json$//' || true)"

echo ""
echo "4. Looking for egress file under ${EGRESS_DIR} ..."

if [[ ! -d "$EGRESS_DIR" ]]; then
  echo "Egress directory not found. Is EGRESS_TARGET=local and the data volume mounted?" >&2
  exit 1
fi

if [[ -n "$event_id" ]]; then
  egress_file="$(find "$EGRESS_DIR" -type f -name "${event_id}.json" 2>/dev/null | head -n 1 || true)"
else
  egress_file=""
fi

if [[ -z "$egress_file" ]]; then
  egress_file="$(find "$EGRESS_DIR" -type f -name '*.json' ! -name '*.manifest.json' 2>/dev/null | tail -n 1 || true)"
fi

if [[ -z "$egress_file" ]]; then
  echo "No egress JSON files found." >&2
  exit 1
fi

echo ""
echo "Success — ConstituentEvent written to:"
echo "  ${egress_file}"
echo ""
cat "$egress_file" | jq .
