# 测试计划｜下一功能（埋点闭环 v1）

## 1. 目标
验证“智能推荐埋点闭环”实现正确、稳定，不影响现有主链路。

## 2. 测试范围
- 后端：`POST /api/v1/metrics/events`
- 数据库：`metrics_events` 写入
- 前端：周计划页触发智能推荐时的埋点调用（requested/viewed）

## 3. 测试项
1. **构建测试**
   - backend: `npm run build`
   - frontend: `npm run type-check`
2. **冒烟**
   - `bash scripts/test/smoke.sh`
3. **专项验证（>=3）**
   - TC-01 合法事件上报成功（HTTP 200，数据落库）
   - TC-02 非法事件名被拒绝（HTTP 400）
   - TC-03 缺失必填字段被拒绝（HTTP 400）

## 4. 通过标准
- 全部构建/冒烟测试通过。
- 专项验证 3/3 通过。
