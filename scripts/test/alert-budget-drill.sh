#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
METRICS_URL="$BACKEND_URL/metrics"
DRILL_URL="$BACKEND_URL/api/v1/system/metrics/ai-cost/drill"

metric_value() {
  curl -sS "$METRICS_URL" \
    | awk '/^onedish_ai_cost_usd_total(\{| )/ {sum += $NF} END {printf "%.6f", sum+0}'
}

before="$(metric_value)"
echo "[budget-drill] before onedish_ai_cost_usd_total=$before"

curl -sS --max-time 20 -X POST "$DRILL_URL" \
  -H 'Content-Type: application/json' \
  -d '{"amount":0.002}' \
  >/tmp/onedish_budget_drill_response.json

after="$(metric_value)"
echo "[budget-drill] after  onedish_ai_cost_usd_total=$after"

python3 - "$before" "$after" <<'PY'
import sys
b=float(sys.argv[1]); a=float(sys.argv[2])
if a > b:
    print(f"[budget-drill] OK: increased by {a-b:.6f} USD")
    sys.exit(0)
print("[budget-drill] FAIL: metric did not increase", file=sys.stderr)
sys.exit(1)
PY
