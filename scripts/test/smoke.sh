#!/usr/bin/env bash
set -u

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8081}"
API_BASE="${API_BASE:-$BACKEND_URL/api/v1}"

TOTAL=0
PASSED=0
FAILED=0
FAIL_MESSAGES=()

print_line() {
  printf '%*s\n' "${COLUMNS:-80}" '' | tr ' ' '-'
}

record_pass() {
  local name="$1"
  PASSED=$((PASSED + 1))
  echo "✅ [PASS] $name"
}

record_fail() {
  local name="$1"
  local reason="$2"
  FAILED=$((FAILED + 1))
  FAIL_MESSAGES+=("$name: $reason")
  echo "❌ [FAIL] $name"
  echo "    ↳ $reason"
}

run_test() {
  local name="$1"
  shift
  TOTAL=$((TOTAL + 1))
  if "$@"; then
    record_pass "$name"
  else
    record_fail "$name" "${SMOKE_LAST_ERROR:-未知错误}"
  fi
}

http_status() {
  curl -sS -o /tmp/onedish_smoke_body.$$ -w "%{http_code}" "$1" 2>/tmp/onedish_smoke_err.$$
}

check_backend_reachable() {
  local status
  status=$(curl -sS -o /tmp/onedish_smoke_backend_body.$$ -w "%{http_code}" "$BACKEND_URL/health" 2>/tmp/onedish_smoke_backend_err.$$) || {
    SMOKE_LAST_ERROR="无法访问后端 $BACKEND_URL/health，请确认 backend 已启动（端口 3000）。$(cat /tmp/onedish_smoke_backend_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="后端健康检查返回 HTTP $status（期望 200）"
    return 1
  fi

  return 0
}

check_frontend_reachable() {
  local status
  status=$(curl -sS -o /tmp/onedish_smoke_frontend_body.$$ -w "%{http_code}" "$FRONTEND_URL" 2>/tmp/onedish_smoke_frontend_err.$$) || {
    SMOKE_LAST_ERROR="无法访问前端 $FRONTEND_URL，请确认 frontend 已启动（端口 8081）。$(cat /tmp/onedish_smoke_frontend_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="前端主页返回 HTTP $status（期望 200）"
    return 1
  fi

  if ! grep -qi "<!doctype html" /tmp/onedish_smoke_frontend_body.$$; then
    SMOKE_LAST_ERROR="前端响应不是预期 HTML 页面（未检测到 <!doctype html>）"
    return 1
  fi

  return 0
}

assert_code_200() {
  local body_file="$1"
  local code
  code=$(node -e 'const fs=require("fs");const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(String(b.code));' "$body_file" 2>/dev/null || true)
  [[ "$code" == "200" ]]
}

api_auth_guest() {
  local status
  local body="/tmp/onedish_smoke_auth_body.$$"
  status=$(curl -sS -X POST "$API_BASE/auth/guest" -H "Content-Type: application/json" -d '{}' -o "$body" -w "%{http_code}" 2>/tmp/onedish_smoke_auth_err.$$) || {
    SMOKE_LAST_ERROR="请求 auth/guest 失败：$(cat /tmp/onedish_smoke_auth_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="auth/guest HTTP $status（期望 200）"
    return 1
  fi

  if ! assert_code_200 "$body"; then
    SMOKE_LAST_ERROR="auth/guest 业务 code 非 200"
    return 1
  fi

  TOKEN=$(node -e 'const fs=require("fs");const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(b?.data?.token||"");' "$body" 2>/dev/null)
  if [[ -z "${TOKEN:-}" ]]; then
    SMOKE_LAST_ERROR="auth/guest 未返回 token"
    return 1
  fi

  return 0
}

api_recipes_daily() {
  local status
  local body="/tmp/onedish_smoke_daily_body.$$"
  status=$(curl -sS "$API_BASE/recipes/daily" -o "$body" -w "%{http_code}" 2>/tmp/onedish_smoke_daily_err.$$) || {
    SMOKE_LAST_ERROR="请求 recipes/daily 失败：$(cat /tmp/onedish_smoke_daily_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="recipes/daily HTTP $status（期望 200）"
    return 1
  fi
  if ! assert_code_200 "$body"; then
    SMOKE_LAST_ERROR="recipes/daily 业务 code 非 200"
    return 1
  fi

  RECIPE_ID=$(node -e '
const fs=require("fs");
const obj=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
function findId(v){
  if(!v) return "";
  if(Array.isArray(v)){for(const x of v){const id=findId(x); if(id) return id;}}
  else if(typeof v==="object"){
    if(v.id!==undefined && v.id!==null) return String(v.id);
    for(const k of Object.keys(v)){const id=findId(v[k]); if(id) return id;}
  }
  return "";
}
console.log(findId(obj.data)||"");
' "$body" 2>/dev/null)

  if [[ -z "${RECIPE_ID:-}" ]]; then
    SMOKE_LAST_ERROR="recipes/daily 未提取到可用 recipe id"
    return 1
  fi

  return 0
}

api_recipes_detail() {
  local status
  local body="/tmp/onedish_smoke_detail_body.$$"
  status=$(curl -sS "$API_BASE/recipes/$RECIPE_ID" -o "$body" -w "%{http_code}" 2>/tmp/onedish_smoke_detail_err.$$) || {
    SMOKE_LAST_ERROR="请求 recipes/$RECIPE_ID 失败：$(cat /tmp/onedish_smoke_detail_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="recipes/:id HTTP $status（recipe_id=$RECIPE_ID）"
    return 1
  fi

  if ! assert_code_200 "$body"; then
    SMOKE_LAST_ERROR="recipes/:id 业务 code 非 200（recipe_id=$RECIPE_ID）"
    return 1
  fi

  return 0
}

api_meal_plans_weekly() {
  local status
  local body="/tmp/onedish_smoke_weekly_body.$$"
  status=$(curl -sS "$API_BASE/meal-plans/weekly" -H "Authorization: Bearer $TOKEN" -o "$body" -w "%{http_code}" 2>/tmp/onedish_smoke_weekly_err.$$) || {
    SMOKE_LAST_ERROR="请求 meal-plans/weekly 失败：$(cat /tmp/onedish_smoke_weekly_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="meal-plans/weekly HTTP $status（期望 200）"
    return 1
  fi

  if ! assert_code_200 "$body"; then
    SMOKE_LAST_ERROR="meal-plans/weekly 业务 code 非 200"
    return 1
  fi

  return 0
}

api_shopping_lists() {
  local status
  local body="/tmp/onedish_smoke_lists_body.$$"
  status=$(curl -sS "$API_BASE/shopping-lists" -H "Authorization: Bearer $TOKEN" -o "$body" -w "%{http_code}" 2>/tmp/onedish_smoke_lists_err.$$) || {
    SMOKE_LAST_ERROR="请求 shopping-lists 失败：$(cat /tmp/onedish_smoke_lists_err.$$)"
    return 1
  }

  if [[ "$status" != "200" ]]; then
    SMOKE_LAST_ERROR="shopping-lists HTTP $status（期望 200）"
    return 1
  fi

  if ! assert_code_200 "$body"; then
    SMOKE_LAST_ERROR="shopping-lists 业务 code 非 200"
    return 1
  fi

  return 0
}

cleanup() {
  rm -f /tmp/onedish_smoke_*.$$ 2>/dev/null || true
}
trap cleanup EXIT

echo "🚀 OneDish Smoke Test"
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo "API Base: $API_BASE"
print_line

run_test "服务可达性 - backend(3000)" check_backend_reachable
run_test "服务可达性 - frontend(8081)" check_frontend_reachable
run_test "API - auth/guest" api_auth_guest
run_test "API - recipes/daily" api_recipes_daily
run_test "API - recipes/:id" api_recipes_detail
run_test "API - meal-plans/weekly" api_meal_plans_weekly
run_test "API - shopping-lists" api_shopping_lists

print_line
echo "总计: $TOTAL | 通过: $PASSED | 失败: $FAILED"

if (( FAILED > 0 )); then
  printf "\n失败明细：\n"
  for item in "${FAIL_MESSAGES[@]}"; do
    echo "- $item"
  done
  exit 1
fi

printf "\n🎉 Smoke 全部通过\n"
exit 0
