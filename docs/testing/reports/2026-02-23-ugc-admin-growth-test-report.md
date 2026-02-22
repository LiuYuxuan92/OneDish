# 2026-02-23 测试报告（UGC 审核台 + 质量回流 + 增长基础）

## 执行摘要
- backend build：通过（`npm run build`）
- frontend type-check：通过（`npm run type-check`）
- smoke：通过（`npx tsx scripts/ugc-quality-smoke.ts` + `npx tsx scripts/ugc-admin-growth-smoke.ts`）
- 专项：9 条，全部通过

## 专项结果
1. submit->pending：PASS
2. admin list pending：PASS
3. batch publish：PASS
4. report_count 回流：PASS
5. adoption_rate 回流：PASS
6. shopping assignee：PASS
7. shopping status：PASS
8. profile_tags 写入：PASS
9. recommendation 可读取画像：PASS

## 结论
本次最小版范围内功能可用：UGC 审核台、质量分真实回流、家庭协作字段、用户画像标签写入与推荐读取均已打通。