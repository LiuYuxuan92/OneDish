# 反馈驱动推荐排序 V2 测试报告（2026-02-22）

## 1. 执行范围

- backend build
- frontend type-check
- smoke
- V2 专项验证（6 条）

## 2. 基础验证结果

1. `cd backend && npm run build` ✅ 通过
2. `cd frontend && npm run type-check` ✅ 通过
3. `bash scripts/test/smoke.sh` ✅ 通过（7/7）

## 3. V2 专项验证结果

### 用例 1：字段完整性（explain / vs_last）
- 操作：请求 lunch 推荐
- 结果：A 方案返回 `explain`（数组）和 `vs_last`（字符串）
- 结论：✅ 通过

### 用例 2：餐次隔离学习（lunch 不影响 breakfast）
- 操作：写入 lunch 的“时间不够”拒绝反馈，再分别请求 lunch / breakfast
- 结果：
  - lunch explain 出现“近期该餐次反馈更偏好快手方案”
  - breakfast explain 未出现该反馈文案
- 结论：✅ 通过

### 用例 3：近 7 天采纳率影响
- 操作：写入 dinner 高采纳反馈（A*4）后请求 dinner 推荐
- 结果：explain 出现“近期同餐次采纳率高”
- 结论：✅ 通过

### 用例 4：拒绝原因影响（时间）
- 操作：写入 lunch 时间压力拒绝后请求 lunch
- 结果：排序倾向快手菜，explain 出现时间偏好文案
- 结论：✅ 通过

### 用例 5：vs_last 输出稳定
- 操作：同餐次连续请求
- 结果：可返回“与上次推荐基本一致”或“首次推荐，暂无历史对比”摘要
- 结论：✅ 通过（满足“与上次推荐差异摘要，可简版”）

### 用例 6：权重可配置可观测
- 操作：请求推荐结果，读取 `ranking_v2.weights`
- 结果：返回 time/inventory/baby/feedback 四类权重
- 结论：✅ 通过

## 4. 风险与说明

- `vs_last` 为进程内快照（重启后会回到“首次推荐”）；属于本期 MVP 设计。
- 本次未引入数据库持久化对比快照，避免改动面扩大。

## 5. 总结

- 所有基础验证通过；
- 专项验证 6/6 通过（>=4 要求已满足）；
- 功能满足上线最小可用标准。