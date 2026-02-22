# OneDish staging 告警联调执行记录模板

> 文档日期：YYYY-MM-DD  
> 执行人：  
> 环境：staging  
> 服务：onedish-backend

---

## 1. 目标与范围

- 联调目标：
- 覆盖告警：
  - [ ] OneDishAiBudgetHigh（sev3）
  - [ ] OneDishAiBudgetCritical（sev1）
  - [ ] OneDish429Surge（sev2）

---

## 2. 变更与配置清单

- recording rules 版本/提交：
- alert rules 版本/提交：
- alertmanager 配置版本/提交：
- 关键参数：
  - `onedish_ai_daily_budget_usd = `
  - 429 阈值 = 

---

## 3. 执行步骤记录

### 3.1 触发阶段

- 触发时间（UTC）：
- 触发命令/操作：
```bash
# 示例
bash scripts/test/alert-budget-drill.sh
```
- 触发表达式：
- 观察到的数据变化：

### 3.2 告警送达阶段

- 首次进入 pending 时间：
- 首次 firing 时间：
- 通知渠道送达时间：
- 命中 receiver：
- 告警标签（service/env/severity）校验：通过 / 不通过

### 3.3 恢复阶段

- 恢复动作：
- firing 结束时间：
- resolved 通知时间：
- send_resolved 校验：通过 / 不通过

---

## 4. 结果汇总

- 本次联调结果：通过 / 部分通过 / 失败
- MTTA：
- MTTR：
- 是否满足上线门禁：是 / 否

---

## 5. 证据列表

- Prometheus 查询截图：
- Alertmanager 路由截图：
- 通知渠道截图（firing + resolved）：
- 日志/命令输出附件：

---

## 6. 问题与改进项

1. 
2. 
3. 

---

## 7. 结论与下一步

- 本次结论：
- 下一步负责人：
- 截止时间：
