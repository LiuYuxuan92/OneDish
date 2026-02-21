# 内容深度扩展设计文档（方向 A）

> 日期: 2026-02-21
> 方向: 内容深度 — 宝宝成长食谱体系 + 菜谱数量扩充
> 状态: 待实施
> 核心思想: 不脱离"一菜两吃"，以宝宝月龄成长为主线，构建从 6 个月到 3 岁的完整辅食内容体系

---

## 一、背景与问题

当前菜谱库约 80 道，存在以下不足：

| 问题 | 说明 |
|------|------|
| 菜谱数量少 | 用户很快"刷完"，缺乏持续使用动力 |
| 辅食覆盖不均 | 各月龄段菜谱数量参差，部分阶段几乎空白 |
| 缺少阶段引导 | 用户不知道宝宝这个月能吃什么、不能吃什么 |
| 菜谱结构字段缺失 | 无月龄标注、营养标签、场景标签，无法精准推荐 |

---

## 二、宝宝成长食谱体系

### 阶段划分

以月龄为一级分类，共 6 个阶段：

| 阶段 | 月龄 | 名称 | 目标菜谱数 |
|------|------|------|-----------|
| 第一阶段 | 6-8月 | 辅食初期 | 25道 |
| 第二阶段 | 8-10月 | 辅食早期 | 30道 |
| 第三阶段 | 10-12月 | 辅食中期 | 35道 |
| 第四阶段 | 12-18月 | 辅食后期 | 40道 |
| 第五阶段 | 18-24月 | 幼儿早期 | 35道 |
| 第六阶段 | 24-36月 | 幼儿期 | 35道 |
| 大人版（配套） | — | — | 100道 |
| **合计** | | | **~300道** |

### 阶段指南内容

每个阶段提供一张指南卡，包含：

```
✅ 可以吃：[食材列表]
❌ 不能吃：[禁忌食材]
📐 质地要求：[描述]
🍽️ 喂养频次：[描述]
💊 重点营养：[营养素列表]
💡 喂养贴士：[2-3条实用建议]
```

示例（8-10月）：
```
✅ 可以吃：蛋黄、鱼泥、豆腐、稠粥、软烂蔬菜
❌ 不能吃：蜂蜜、整颗坚果、蛋白（慎用）
📐 质地：细腻糊状，可有极小颗粒（约1-2mm）
🍽️ 频次：每天2次辅食 + 母乳/配方奶为主
💊 重点营养：铁、锌、维生素A
💡 贴士：引入新食材每次只加一种，观察3天无过敏再加下一种
```

---

## 三、菜谱数据扩充方案

### 数据来源策略（三轨并行）

**轨道 1：AI 批量生成（主力）**
- 利用现有 MiniMax AI 接口
- 按固定 JSON 模板批量生成：大人版 + 宝宝版 + 同步烹饪时间线
- 生成后写入 seed 文件，人工校验关键字段

**轨道 2：现有菜谱字段补全**
- 对已有 80 道菜谱补全新增字段
- 包括：`stage`、`key_nutrients`、`scene_tags`、`first_intro`、`texture_level`

**轨道 3：场景食谱专项**
- 🤒 生病场景（发烧/腹泻/便秘/感冒）各 5 道
- 🎉 节日场景（春节/中秋/宝宝生日）各 3-5 道
- ⚡ 快手场景（≤10分钟搞定）10 道

---

## 四、数据模型变更

### recipes 表新增字段

```sql
ALTER TABLE recipes ADD COLUMN stage VARCHAR DEFAULT 'adult';
-- 取值: '6-8m' | '8-10m' | '10-12m' | '12-18m' | '18-24m' | '24-36m' | 'adult'

ALTER TABLE recipes ADD COLUMN first_intro BOOLEAN DEFAULT false;
-- 是否适合宝宝首次引入尝试

ALTER TABLE recipes ADD COLUMN key_nutrients JSON DEFAULT '[]';
-- 例: ["铁", "锌", "维生素A"]

ALTER TABLE recipes ADD COLUMN scene_tags JSON DEFAULT '[]';
-- 例: ["日常", "生病", "快手", "节日"]

ALTER TABLE recipes ADD COLUMN texture_level VARCHAR DEFAULT NULL;
-- 取值: 'puree'(泥) | 'mash'(糊) | 'minced'(碎) | 'chunks'(块) | null(大人菜)
```

### 新增表：baby_stages

```sql
CREATE TABLE baby_stages (
  stage        VARCHAR PRIMARY KEY,  -- '6-8m' | '8-10m' | ...
  name         VARCHAR NOT NULL,     -- '辅食初期'
  age_range    VARCHAR NOT NULL,     -- '6-8个月'
  can_eat      JSON    NOT NULL,     -- ["南瓜", "胡萝卜", ...]
  cannot_eat   JSON    NOT NULL,     -- ["蜂蜜", "整颗坚果", ...]
  texture_desc VARCHAR NOT NULL,     -- '完全泥状，无颗粒'
  meal_frequency VARCHAR NOT NULL,   -- '每天1-2次辅食'
  key_nutrients JSON   NOT NULL,     -- ["铁", "锌"]
  guide_tips   JSON    NOT NULL,     -- ["贴士1", "贴士2"]
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 五、前端界面变化

### 新增页面

**1. BabyStageScreen（阶段导航页）**

入口：首页卡片 / 菜谱 Tab 顶部

```
选择宝宝月龄阶段
─────────────────
🟢 6-8月   辅食初期   25道    ← 已过（绿色）
🟢 8-10月  辅食早期   30道    ← 已过
👉 10-12月 辅食中期   35道    ← 当前（高亮橙色）
   12-18月 辅食后期   40道
   18-24月 幼儿早期   35道
   24-36月 幼儿期     35道
```

**2. StageDetailScreen（阶段详情页）**

- 顶部：阶段指南卡（折叠/展开）
- 中部：该阶段食谱列表
  - 筛选：按营养素 / 场景标签 / 首次引入
- 食谱卡片显示：月龄标签 + 营养标签 + 场景标签

### 修改页面

**RecipeListScreen（菜谱列表页）**
- 新增"辅食体系"入口 Tab 或顶部 Banner
- 食谱卡片新增标签展示：`👶 10-12月` `🥩 富含铁` `⚡ 快手`
- 新增"首次引入"筛选选项

**HomeScreen（首页）**
- 新增"今日辅食建议"卡片（根据用户 Profile 的宝宝月龄）：
```
今日辅食建议（宝宝 10个月）
推荐：胡萝卜肉末粥 · 补铁 · 15分钟
[查看食谱]  [加入今日计划]
```

---

## 六、新增文件清单

### 后端
- `backend/src/database/migrations/YYYYMMDD_add_recipe_stage_fields.ts` — recipes 表新增字段
- `backend/src/database/migrations/YYYYMMDD_create_baby_stages.ts` — 新建 baby_stages 表
- `backend/src/database/seeds/baby_stages.ts` — 6个阶段的种子数据
- `backend/src/database/seeds/recipes_extended.ts` — 新增 220 道菜谱（AI 生成 + 人工校验）
- `backend/src/services/baby-stage.service.ts` — 阶段数据查询服务
- `backend/src/controllers/baby-stage.controller.ts`
- `backend/src/routes/baby-stage.routes.ts` — `GET /baby-stages`、`GET /baby-stages/:stage`

### 前端
- `frontend/src/screens/recipe/BabyStageScreen.tsx` — 阶段导航页
- `frontend/src/screens/recipe/StageDetailScreen.tsx` — 阶段详情页（含指南卡 + 食谱列表）
- `frontend/src/components/recipe/StageGuideCard.tsx` — 阶段指南卡组件
- `frontend/src/api/babyStages.ts` — API 封装
- `frontend/src/hooks/useBabyStages.ts` — React Query hook

### 修改文件
- `frontend/src/types/index.ts` — 新增 BabyStage、StageGuide 类型；RecipeStackParamList 添加新路由
- `frontend/src/navigation/RecipeNavigator.tsx` — 注册新页面
- `frontend/src/screens/recipe/RecipeListScreen.tsx` — 添加辅食入口 + 新筛选项
- `frontend/src/screens/home/HomeScreen.tsx` — 添加今日辅食建议卡片
- `frontend/src/components/recipe/RecipeCard.tsx` — 显示月龄/营养/场景标签

---

## 七、实施分阶段

```
Phase A-1（后端基础，约 3 天）
├── 数据库迁移：recipes 新增字段 + baby_stages 表
├── baby_stages 种子数据（6个阶段完整指南）
├── BabyStageService + 路由
└── 现有 80 道菜谱补全新字段

Phase A-2（菜谱数据扩充，约 3-5 天）
├── AI 批量生成脚本（按阶段分批生成）
├── 生成 220 道新菜谱（含大人版 + 宝宝版 + 时间线）
└── 场景食谱专项（生病/节日/快手各补充）

Phase A-3（前端界面，约 3-4 天）
├── BabyStageScreen + StageDetailScreen
├── StageGuideCard 组件
├── RecipeListScreen 新增筛选
├── HomeScreen 今日辅食建议
└── RecipeCard 标签展示
```

---

## 八、不做的事

| 诱惑 | 为什么不做 |
|------|-----------|
| 宝宝饮食日记（详细记录每餐） | 属于方向 C（用户粘性），留到后面 |
| 营养摄入计算器 | 需要精确营养数据库，成本高，优先内容广度 |
| 视频教程 | 内容成本极高，文字+图片足够 |
| 用户上传自定义菜谱 | 属于方向 D（社交），留到后面 |
