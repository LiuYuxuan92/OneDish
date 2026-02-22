# OneDish Staging 回滚演练报告（2026-02-22）

## 演练目标
验证 OneDish 在 staging 流程下是否具备“可回退”能力：
1. 记录当前 git 分支与提交
2. 执行数据库迁移（`backend migrate`）
3. 执行 smoke（`bash scripts/test/smoke.sh`）
4. 执行最近一批 migration 回滚（`migrate:rollback`）
5. 回滚后再次执行 smoke
6. 恢复环境到可继续开发状态（重新 migrate + smoke）

---

## 环境与基线
- 仓库路径：`/root/.openclaw/workspace/OneDish`
- 后端路径：`/root/.openclaw/workspace/OneDish/backend`
- 时间（UTC）：2026-02-22

### Git 基线记录
**命令：**
```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git log -1 --oneline
```

**结果：成功**
- 分支：`clean/refactor-shopping-v2`
- 提交：`71dfcf35c6c5b07b69399c048a0402c6f9ff0a9b`
- 最近提交：`71dfcf3 docs(reporting): add refactor specs, PRD bundle and metrics export script`

---

## 演练步骤与结果

### Step 1) 执行迁移（backend migrate）
**命令：**
```bash
cd backend
npm run migrate
```

**输出摘要：**
- `Using environment: development`
- `Batch 2 run: 1 migrations`

**结果：成功**

---

### Step 2) 迁移后执行 smoke
**命令：**
```bash
cd /root/.openclaw/workspace/OneDish
bash scripts/test/smoke.sh
```

**输出摘要：**
- 服务可达性（backend/frontend）：PASS
- API：`auth/guest` / `recipes/daily` / `recipes/:id` / `meal-plans/weekly` / `shopping-lists` 全部 PASS
- 总计：`7/7` 通过

**结果：成功（7/7）**

---

### Step 3) 执行回滚（最近一批 migration）
**命令：**
```bash
cd backend
start_ts=$(date +%s)
npx knex migrate:rollback
end_ts=$(date +%s)
echo $((end_ts-start_ts))
```

**输出摘要：**
- `Using environment: development`
- `Batch 2 rolled back: 1 migrations`
- 回滚耗时：`1 秒`

**结果：成功**

---

### Step 4) 回滚后再次执行 smoke
**命令：**
```bash
cd /root/.openclaw/workspace/OneDish
bash scripts/test/smoke.sh
```

**输出摘要：**
- 与回滚前一致，全部通过
- 总计：`7/7` 通过

**结果：成功（7/7）**

> 备注：本次演练未出现“schema 回退导致部分用例失败”的情况。

---

### Step 5) 恢复环境到可继续开发状态
按要求将环境恢复到最新 schema：

**命令：**
```bash
cd backend
npm run migrate

cd /root/.openclaw/workspace/OneDish
bash scripts/test/smoke.sh
```

**输出摘要：**
- migrate：`Batch 2 run: 1 migrations`
- smoke：`7/7` 全部通过

**结果：成功（环境已恢复）**

---

## 迁移状态核对（恢复后）
**命令：**
```bash
cd backend
npx knex migrate:currentVersion
npx knex migrate:list
```

**结果：成功**
- Current Version：`20260222060001`
- Completed Migrations：14
- Pending Migrations：0

---

## 发现的问题与风险
1. **脚本命名与任务描述存在语义差异**
   - 任务描述写法为 `backend migrate`，实际可执行命令为 `cd backend && npm run migrate`。
   - 风险：在 CI/手工操作时可能因命令理解不一致导致误操作。

2. **smoke 测试依赖服务已启动**
   - `scripts/test/smoke.sh` 默认检查 `localhost:3000` 与 `localhost:8081`。
   - 风险：若执行前未启动 backend/frontend，会出现“环境问题型失败”，掩盖真实回滚问题。

3. **回滚验证当前仅覆盖 API smoke 粒度**
   - 本次回滚后 7/7 通过，说明核心路径可用。
   - 风险：对数据一致性、历史数据兼容、复杂写操作的覆盖仍不足。

---

## 回滚耗时
- 最近一批 migration 回滚耗时：**1 秒**（数据库本地开发环境）

---

## 结论：是否达到“可回退”目标
**结论：达到。**
- 迁移可执行
- 最近一批迁移可成功回滚
- 回滚后 smoke 全量通过（7/7）
- 恢复到最新迁移后 smoke 仍全通过，环境可继续开发

---

## 后续修复与改进建议
1. 在根目录增加统一脚本别名（如 `npm run backend:migrate` / `backend:rollback`），减少命令歧义。
2. 为 smoke 增加“前置依赖检查提示”或一键启动模式（可选），降低环境噪音失败率。
3. 补充 rollback drill 的扩展验证：
   - 写入后回滚的数据可读性/可恢复性检查
   - 关键业务表 schema diff 自动比对
   - CI 定期执行“迁移→回滚→迁移”闭环演练
4. 在演练报告模板中固定记录：回滚 batch 编号、影响 migration 文件、耗时与失败用例清单。
