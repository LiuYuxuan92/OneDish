# UGC V1 测试计划（2026-02-22）

## 测试范围
- 创建草稿
- 编辑草稿
- 提交审核
- 审核发布/驳回（模拟）
- 发布广场列表浏览
- 发布内容收藏/取消收藏

## 测试环境
- backend: Node + Knex + SQLite
- frontend: React Native Web

## 用例设计（专项 >=5）
1. 新建投稿：输入 adult_version + baby_version，保存为 draft。
2. 编辑草稿：更新食材后重新保存，状态保持 draft。
3. 提交审核：draft 提交后状态变为 pending。
4. 审核流转：pending 经 review 进入 published/rejected。
5. 广场浏览：published 能在 `/user-recipes/published` 列表返回。
6. 收藏功能：已发布投稿支持收藏/取消收藏切换。
7. 详情权限：未登录仅可访问 published 详情，草稿详情需本人。

## 通过标准
- backend build 通过
- frontend type-check 通过
- smoke 脚本通过
- 上述 UGC 用例通过率 100%
