# 购物清单 V2 重构方案（已立项）

日期：2026-02-22
负责人：OpenClaw Assistant
状态：待实施（已获同意）

## 1. 目标

将购物清单分区从“超市区/蔬果区/调料区/其他”重构为稳定分类体系，解决语义混乱和历史字段漂移问题；同时保证历史数据可读、前后端平滑升级。

## 2. 新分类模型（V2）

统一分类键：
- `produce` 生鲜蔬果
- `protein` 肉蛋水产豆制品
- `staple` 主食干货
- `seasoning` 调味酱料
- `snack_dairy` 零食乳品
- `household` 日用清洁
- `other` 其他

建议 item 字段：
- `name`, `quantity`, `unit`, `checked`
- `category`（上述枚举）
- `source`（meal_plan/manual）
- `priority`（normal/urgent，可选）

## 3. 兼容与迁移策略

### 3.1 旧 -> 新映射
- `蔬果区` -> `produce`
- `调料区` -> `seasoning`
- `其他` -> `other`
- `超市区` -> 基于名称规则二次分类（命中失败归 `other`）

### 3.2 发布方式
- 后端双读：优先 `items_v2`，无则回退旧 `items` 并在线转换
- 写入统一走 V2
- 前端兼容旧返回并优先渲染 V2
- 灰度稳定后再考虑下线旧结构

## 4. 实施任务

1) 后端：新增 `items_v2`/`schema_version` 迁移
2) 后端：购物清单服务统一读写与归一化
3) 前端：API 层标准化映射 + 渲染分类中文名
4) 测试：build/type-check/smoke + 购物清单专项回归
5) 文档：更新测试报告与开发指南

## 5. 验收标准

- 历史数据不丢失
- 购物清单接口稳定返回 V2 分类
- 前端分组渲染正常，勾选/增删改查可用
- backend build、frontend type-check、smoke 脚本通过

## 6. 风险与回滚

风险：历史“超市区”自动分类误判。
缓解：未命中项统一进入 `other` 并保留原信息。
回滚：保留旧字段读取逻辑，必要时切回旧渲染。
