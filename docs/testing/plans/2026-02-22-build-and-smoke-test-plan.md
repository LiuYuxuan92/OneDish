# Test Plan - Build & Smoke（2026-02-22）

## 1. 基本信息
- 主题：后端编译修复后的构建与核心链路冒烟测试
- 日期：2026-02-22
- 执行人：OpenClaw Assistant
- 关联范围：OneDish backend / frontend（当前工作区未提交改动）

## 2. 测试目标
1. 验证 backend 编译通过
2. 验证 frontend type-check 通过
3. 验证核心用户链路可用（登录/首页/菜谱详情/周计划/购物清单）

## 3. 环境与前置条件
- OS: Linux
- Backend: Node + TS
- Frontend: React Native + Expo Web
- 前置命令：
  - `cd backend && npm run build`
  - `cd frontend && npm run type-check`

## 4. 测试范围
### 包含
- 编译检查
- 类型检查
- 核心页面基础可达与关键操作

### 不包含
- 压测
- 安全渗透
- 真机多端兼容性

## 5. 用例清单

| 用例ID | 用例名称 | 步骤 | 预期结果 |
|---|---|---|---|
| TC-BUILD-001 | Backend Build | 执行 backend build | 无 TS 报错，命令成功退出 |
| TC-TYPE-001 | Frontend Type Check | 执行 frontend type-check | 无 TS 报错，命令成功退出 |
| TC-SMOKE-001 | 登录/游客进入 | 启动前后端并访问首页 | 成功进入主流程 |
| TC-SMOKE-002 | 首页推荐 | 进入首页查看今日推荐 | 卡片正常显示，无致命错误 |
| TC-SMOKE-003 | 菜谱详情 | 打开菜谱详情与宝宝版 | 数据正常展示，可切换 |
| TC-SMOKE-004 | 周计划 | 进入周计划页面 | 列表/交互可用，无崩溃 |
| TC-SMOKE-005 | 购物清单 | 增删改查任一条目 | 操作成功并正确刷新 |

## 6. 准入条件
- 当前分支可启动 backend / frontend
- 本地依赖安装完成

## 7. 通过标准
- TC-BUILD-001、TC-TYPE-001 必须通过
- 5 条 smoke 用例至少 4 条通过，且无 P0/P1 阻断缺陷

## 8. 风险与回滚
- 风险：快速止血改动可能隐藏类型债
- 回滚：保留改动清单，按文件回滚并逐项复测
