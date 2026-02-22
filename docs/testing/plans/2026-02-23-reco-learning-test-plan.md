# 测试计划：推荐长期学习与自动重算（2026-02-23）

## 一、构建与静态检查
1. backend: `npm run build`
2. frontend: `npm run type-check`

## 二、Smoke
1. 调用推荐接口（all-day）返回 A/B 方案。
2. 回传反馈后再次推荐，结果仍可用。
3. 触发重算接口返回成功。

## 三、专项测试（>=5）
1. **按餐次权重**：早餐/午餐/晚餐返回的 ranking_v2 weights.by_meal 不同配置可生效。
2. **衰减窗口**：7天与30天窗口统计均存在，feedback_score 在[0,1]。
3. **稳定解释**：同输入下 `ranking_reasons` 顺序按贡献度稳定。
4. **兼容性**：`explain/switch_hint/vs_last` 仍存在。
5. **手动重算**：`/recommendations/recompute` 可触发并写入 profile。
6. **回退路径**：无 profile 时可实时计算，不报错。

## 四、输出
- 记录命令、关键返回、结论
- 产出测试报告文档
