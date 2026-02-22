# UGC V1 测试报告（2026-02-22）

## 执行结果总览
- backend build：✅ 通过（`npm run build`）
- frontend type-check：✅ 通过（`npm run type-check`）
- smoke：✅ 通过（7/7）
- UGC 专项：✅ 6 条通过

## UGC 专项明细
1. 创建草稿：`POST /user-recipes` -> `status=draft` ✅
2. 更新草稿：`PUT /user-recipes/:id`，名称更新成功 ✅
3. 提交审核：`POST /user-recipes/:id/submit` -> `status=pending` ✅
4. 审核发布：`POST /user-recipes/:id/review` -> `status=published` ✅
5. 发布列表：`GET /user-recipes/published` 能检索到已发布记录 ✅
6. 收藏切换：`POST /user-recipes/:id/favorite` true/false 可切换 ✅

## 关键输出
- CASE1 status=draft
- CASE2 name=UGC测试菜谱-更新
- CASE3 status=pending
- CASE4 status=published
- CASE5 inPublished=true
- CASE6 favOn=true favOff=false

## 结论
UGC V1 最小闭环已可用：创建-编辑-提审-发布-广场浏览-收藏。可进入下一阶段（审核后台、内容质量规则、宝宝安全校验）。
