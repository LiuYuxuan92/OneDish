# Share Invite TTL 清理机制（MVP）

## 目标
- 为 `share_invite_revocations`（失效邀请码记录）增加 TTL，避免表无限增长。
- 不引入重型组件，支持手动执行与定时调度。

## 实现
1. 新增迁移：`backend/src/database/migrations/20260301170000_add_ttl_to_share_invite_revocations.ts`
   - 增加 `expires_at` 字段与索引。
   - 对历史数据按默认 30 天补齐 `expires_at`。
2. 失效邀请码写入时同时写入 `expires_at`
   - 位置：
     - `mealPlan.service.ts`（`regenerateWeeklyShareInvite`）
     - `shoppingList.service.ts`（`regenerateShareInvite`）
   - TTL 读取环境变量 `SHARE_INVITE_REVOCATION_TTL_DAYS`，默认 30 天。
3. 清理脚本
   - 文件：`backend/src/scripts/cleanup-share-invite-revocations.ts`
   - 命令：`npm run cleanup:share-invites`
   - 逻辑：
     - 优先清理 `expires_at <= now` 的记录
     - 兼容历史数据：`expires_at is null` 时按 `revoked_at + TTL` 清理

## 定时执行建议（可选）
- Linux cron（每天 03:30）：
```bash
30 3 * * * cd /root/.openclaw/workspace/OneDish/backend && npm run cleanup:share-invites >> /tmp/onedish-share-invite-cleanup.log 2>&1
```

## 回滚
- 停止调用清理命令即可立即停止自动清理。
- 如需回滚 schema，可回滚迁移并恢复业务写入（注意先备份数据）。
