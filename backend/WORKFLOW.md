# Backend 提交流程（最小可用标准）

本文档用于统一 backend 提交流程，确保每次提交都能稳定通过基础门禁。

## 1) 开发前

1. 拉取最新代码并切分支：
   - `git checkout main && git pull`
   - `git checkout -b feat/<topic>` 或 `fix/<topic>`
2. 安装依赖：
   - `npm install`
3. 本地先跑一次基线检查：
   - `npm run verify`

## 2) 开发中

- 小步提交，避免一次改动过大。
- 改动 TypeScript 代码时，优先保证：
  - 无明显类型错误
  - lint 不新增 error
- 建议在关键阶段先自检：
  - `npm run lint`
  - `npm run test`

## 3) 提交前（必过门禁）

必须通过以下三项：

1. `npm run lint`
2. `npm run test`
3. `npm run build`

推荐直接执行一键校验：

```bash
npm run verify
```

## 4) 失败处理策略

### lint 失败
- 优先修复语法/规则错误；
- 若为历史遗留或非阻断项，降低为 warning（需在 PR 说明原因）；
- 不允许带着 lint error 提交。

### test 失败
- 先确认是本次改动引入还是环境问题；
- 修复后重跑 `npm run test`；
- 当前无测试文件时允许通过（已启用 `passWithNoTests`），但新增功能应补最小测试。

### build 失败
- 优先修复 TypeScript 编译错误；
- 确认 `dist` 可正常生成；
- 禁止绕过 build 失败直接合并。

## 5) Commit / PR 模板（简洁）

### Commit 建议

```text
<type>: <summary>
```

常用 type：`feat` / `fix` / `refactor` / `chore` / `test` / `docs`

示例：

```text
fix: add stable jest config with passWithNoTests
```

### PR 描述建议

```markdown
## 变更内容
- ...

## 验证结果
- [ ] npm run lint
- [ ] npm run test
- [ ] npm run build

## 风险与回滚
- 风险：...
- 回滚：revert 本 PR
```
