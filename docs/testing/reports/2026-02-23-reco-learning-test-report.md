# 测试报告：推荐长期学习与自动重算（2026-02-23）

## 执行结果
- [x] backend build（`npm run build`）
- [x] frontend type-check（`npm run type-check`）
- [x] smoke（服务方法链路：推荐→反馈→重算→再推荐）
- [x] 专项>=5（实际 6 项）

## 关键输出
1. CHECK1 recommendations meals = `3 (breakfast,lunch,dinner)`
2. CHECK2 feedback accepted = `true`
3. CHECK3 recompute profiles = `1`
4. CHECK4 explain exists = `true`，ranking_reasons = `true`，vs_last = `true`
5. CHECK5 stats window = `7`，total = `10`
6. CHECK6 profile persisted = `true`

## 结论
- 推荐长期学习链路可用：反馈写入后可重算并持久化 profile。
- 推荐结果新增结构化 `ranking_reasons`，且保留 `explain/switch_hint/vs_last`，满足兼容。
- 权重按餐次配置与7/30天衰减策略已在实现路径中生效。

## 备注
- `npm run migrate` 在本次新增迁移前后均可执行；新迁移已成功应用（Batch 8 run: 2 migrations）。
