#!/usr/bin/env bash
set -euo pipefail

# OneDish 发布日命令清单（轻量执行版）
# 用法：
#   bash scripts/release/release-day-commands.sh precheck
#   bash scripts/release/release-day-commands.sh verify
#   bash scripts/release/release-day-commands.sh migrate
#   bash scripts/release/release-day-commands.sh smoke

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

step_precheck() {
  echo "[precheck] repo: $ROOT_DIR"
  echo "[precheck] node: $(node -v || true)"
  echo "[precheck] npm : $(npm -v || true)"
  echo "[precheck] git : $(git -C "$ROOT_DIR" rev-parse --short HEAD || true)"
}

step_verify() {
  echo "[verify] backend"
  (cd "$BACKEND_DIR" && npm run verify)
  echo "[verify] frontend"
  (cd "$FRONTEND_DIR" && npm run verify)
}

step_migrate() {
  echo "[migrate] backend migrate"
  (cd "$BACKEND_DIR" && npm run migrate)
  echo "[migrate] done"
}

step_smoke() {
  echo "[smoke] running scripts/test/smoke.sh"
  (cd "$ROOT_DIR" && bash scripts/test/smoke.sh)
}

step_rollback_hint() {
  cat <<'EOF'
[rollback-hint]
1) 回滚应用到上一稳定版本（按部署平台命令执行）
2) 数据库回滚：cd backend && npx knex migrate:rollback
3) 执行 smoke 验证
EOF
}

ACTION="${1:-help}"
case "$ACTION" in
  precheck)
    step_precheck
    ;;
  verify)
    step_verify
    ;;
  migrate)
    step_migrate
    ;;
  smoke)
    step_smoke
    ;;
  rollback-hint)
    step_rollback_hint
    ;;
  *)
    cat <<'EOF'
Usage:
  bash scripts/release/release-day-commands.sh precheck
  bash scripts/release/release-day-commands.sh verify
  bash scripts/release/release-day-commands.sh migrate
  bash scripts/release/release-day-commands.sh smoke
  bash scripts/release/release-day-commands.sh rollback-hint
EOF
    ;;
esac
