# 内容深度扩展实施计划（方向 A）

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建宝宝成长食谱体系（6阶段指南 + baby_stages 表）并将菜谱数据从 80 道扩充到 150+ 道，同时在前端新增辅食体系入口页面。

**Architecture:** 后端三步走：数据库迁移 → 种子数据 → API 服务。前端三步走：类型定义 → 新页面 → 现有页面增强。菜谱扩充通过写 seed 脚本批量插入，不依赖外部 AI 接口（保证可离线运行）。

**Tech Stack:** Node.js + Knex.js + SQLite（后端）、React Native + React Query（前端）、TypeScript（全栈）

---

## Phase A-1：后端基础

### Task 1: 数据库迁移 — recipes 表新增字段

**Files:**
- Create: `backend/src/database/migrations/20260221000001_add_stage_fields_to_recipes.ts`

**Step 1: 创建迁移文件**

```typescript
// backend/src/database/migrations/20260221000001_add_stage_fields_to_recipes.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('recipes', (table) => {
    table.string('stage', 20).defaultTo('adult').index();
    // '6-8m' | '8-10m' | '10-12m' | '12-18m' | '18-24m' | '24-36m' | 'adult'
    table.boolean('first_intro').defaultTo(false);
    table.json('key_nutrients').defaultTo('[]');
    // 例: ["铁", "锌", "维生素A"]
    table.json('scene_tags').defaultTo('[]');
    // 例: ["日常", "生病", "快手", "节日"]
    table.string('texture_level', 20).nullable();
    // 'puree'(泥) | 'mash'(糊) | 'minced'(碎) | 'chunks'(块) | null(大人菜)
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('recipes', (table) => {
    table.dropColumn('stage');
    table.dropColumn('first_intro');
    table.dropColumn('key_nutrients');
    table.dropColumn('scene_tags');
    table.dropColumn('texture_level');
  });
}
```

**Step 2: 运行迁移**

先检查 knexfile.ts 配置：`cat backend/knexfile.ts`

创建临时迁移脚本（同之前的方式）：
```typescript
// backend/migrate-new.ts
import knex from 'knex';
import config from './knexfile';
const db = knex((config as any).development);
db.migrate.latest().then(() => {
  console.log('Migration done');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
```

```bash
cd backend && npx tsx migrate-new.ts && rm migrate-new.ts
```

预期输出：`Migration done`

**Step 3: 验证**

```bash
cd backend && node -e "const Database = require('better-sqlite3'); const db = new Database('dev.sqlite3'); console.log(db.pragma('table_info(recipes)').map(c => c.name).join(', '))"
```

预期：输出中包含 `stage, first_intro, key_nutrients, scene_tags, texture_level`

**Step 4: Commit**

```bash
git add backend/src/database/migrations/20260221000001_add_stage_fields_to_recipes.ts
git commit -m "feat: add stage/nutrition/scene fields to recipes table"
```

---

### Task 2: 数据库迁移 — 新建 baby_stages 表

**Files:**
- Create: `backend/src/database/migrations/20260221000002_create_baby_stages_table.ts`

**Step 1: 创建迁移文件**

```typescript
// backend/src/database/migrations/20260221000002_create_baby_stages_table.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('baby_stages', (table) => {
    table.string('stage', 20).primary();
    // '6-8m' | '8-10m' | '10-12m' | '12-18m' | '18-24m' | '24-36m'
    table.string('name', 50).notNullable();       // '辅食初期'
    table.string('age_range', 30).notNullable();  // '6-8个月'
    table.integer('age_min').notNullable();        // 6
    table.integer('age_max').notNullable();        // 8
    table.json('can_eat').notNullable();           // ["南瓜", "胡萝卜", ...]
    table.json('cannot_eat').notNullable();        // ["蜂蜜", "整颗坚果", ...]
    table.string('texture_desc', 100).notNullable();
    table.string('meal_frequency', 100).notNullable();
    table.json('key_nutrients').notNullable();
    table.json('guide_tips').notNullable();        // ["贴士1", "贴士2"]
    table.datetime('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('baby_stages');
}
```

**Step 2: 运行迁移**

```bash
cd backend && npx tsx migrate-new.ts && rm migrate-new.ts
```

（同 Task 1 的临时脚本方式）

**Step 3: Commit**

```bash
git add backend/src/database/migrations/20260221000002_create_baby_stages_table.ts
git commit -m "feat: create baby_stages table"
```

---

### Task 3: 种子数据 — baby_stages 六个阶段完整指南

**Files:**
- Create: `backend/src/database/seeds/007_baby_stages.ts`

**Step 1: 创建种子文件**

```typescript
// backend/src/database/seeds/007_baby_stages.ts
import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('baby_stages').del();

  await knex('baby_stages').insert([
    {
      stage: '6-8m',
      name: '辅食初期',
      age_range: '6-8个月',
      age_min: 6,
      age_max: 8,
      can_eat: JSON.stringify(['大米粥/米粉', '南瓜泥', '胡萝卜泥', '红薯泥', '土豆泥', '苹果泥', '香蕉泥', '梨泥', '西葫芦泥', '菠菜泥']),
      cannot_eat: JSON.stringify(['蜂蜜', '整颗坚果', '牛奶（饮用）', '蛋白', '海鲜', '添加盐/糖/调料', '硬质食物']),
      texture_desc: '完全泥状，光滑无颗粒，从稀到稠循序渐进',
      meal_frequency: '每天1-2次辅食，母乳/配方奶为主（每日500-700ml）',
      key_nutrients: JSON.stringify(['铁', '锌', '维生素A', '维生素C']),
      guide_tips: JSON.stringify([
        '每次只引入一种新食材，观察3-5天无过敏再尝试下一种',
        '从1-2勺开始，逐步增加到2-3勺',
        '辅食时间选在宝宝不太饿也不太饱时（喂奶后1小时左右）',
        '首选强化铁米粉，这是6月龄最重要的营养补充',
      ]),
    },
    {
      stage: '8-10m',
      name: '辅食早期',
      age_range: '8-10个月',
      age_min: 8,
      age_max: 10,
      can_eat: JSON.stringify(['蛋黄', '鱼泥（去刺）', '豆腐', '稠粥/软面条', '肉泥（猪/鸡/牛）', '各类蔬菜泥', '多种水果泥', '豆类（煮烂压碎）']),
      cannot_eat: JSON.stringify(['蜂蜜', '整颗坚果', '牛奶（饮用）', '蛋白（慎用）', '海鲜（慎用）', '盐/糖/调料', '辛辣食物']),
      texture_desc: '细腻糊状，可有极小颗粒（约1-2mm），练习咀嚼意识',
      meal_frequency: '每天2次辅食，母乳/配方奶为主（每日500ml左右）',
      key_nutrients: JSON.stringify(['铁', '锌', '蛋白质', '维生素A', 'DHA']),
      guide_tips: JSON.stringify([
        '引入蛋黄：从1/4个开始，观察无过敏再逐步增加到整个蛋黄',
        '引入肉类：以瘦肉泥为主，优先猪肝（补铁）每周1-2次',
        '可以开始尝试手指食物（软烂的食物块，让宝宝自己抓）',
        '用餐时让宝宝坐在餐椅，培养良好用餐习惯',
      ]),
    },
    {
      stage: '10-12m',
      name: '辅食中期',
      age_range: '10-12个月',
      age_min: 10,
      age_max: 12,
      can_eat: JSON.stringify(['全蛋（蛋黄+蛋白）', '各类鱼虾（慎重引入）', '豆腐', '软饭/面条', '各类肉类', '各类蔬菜（细碎）', '各类水果', '少量奶酪']),
      cannot_eat: JSON.stringify(['蜂蜜', '整颗坚果', '牛奶（大量饮用）', '腌制食品', '高盐高糖食品', '油炸食品']),
      texture_desc: '细碎状，约3-5mm小粒，手指食物可增多，练习咀嚼',
      meal_frequency: '每天2-3次辅食，母乳/配方奶（每日400-500ml）',
      key_nutrients: JSON.stringify(['铁', '钙', '锌', '蛋白质', '维生素D']),
      guide_tips: JSON.stringify([
        '10月后可以尝试引入蛋白，从少量开始观察',
        '开始引入家庭软食，让宝宝参与家庭用餐',
        '鼓励自主进食，接受宝宝弄脏的过程',
        '食物多样化，每周尽量覆盖谷薯、蔬菜、水果、肉蛋、豆类',
      ]),
    },
    {
      stage: '12-18m',
      name: '辅食后期',
      age_range: '12-18个月',
      age_min: 12,
      age_max: 18,
      can_eat: JSON.stringify(['所有家常食材（合理烹饪）', '全蛋', '各类鱼虾', '牛奶/酸奶', '坚果酱（非整颗）', '豆制品', '各类蔬菜水果']),
      cannot_eat: JSON.stringify(['整颗坚果/葡萄/樱桃（噎呛风险）', '高盐高糖食品', '腌制/熏制食品', '含咖啡因饮料', '蜂蜜（仍建议避免）']),
      texture_desc: '接近成人软食，约1cm小块，培养独立咀嚼能力',
      meal_frequency: '每天3次正餐+1-2次加餐，母乳/配方奶可继续（每日300-400ml）',
      key_nutrients: JSON.stringify(['钙', '铁', '锌', '维生素D', 'Omega-3']),
      guide_tips: JSON.stringify([
        '12月后可引入少量酱油等调料，但整体保持清淡',
        '牛奶可作为主要饮品引入（每日300-500ml）',
        '鼓励和家人同桌吃饭，模仿大人用餐',
        '食物的多样性比数量更重要，每天尽量12种以上食材',
      ]),
    },
    {
      stage: '18-24m',
      name: '幼儿早期',
      age_range: '18-24个月',
      age_min: 18,
      age_max: 24,
      can_eat: JSON.stringify(['几乎所有家常食材', '各类坚果（磨碎或酱）', '各类海鲜', '发酵食品（少量）', '豆制品']),
      cannot_eat: JSON.stringify(['整颗小粒坚果/葡萄（仍有噎呛风险）', '过度加工食品', '含糖饮料', '油炸食品（少量）']),
      texture_desc: '接近成人正常食物，培养独立使用餐具',
      meal_frequency: '每天3次正餐+2次加餐，奶类300-400ml/天',
      key_nutrients: JSON.stringify(['钙', '铁', '锌', '维生素A', '维生素C', '膳食纤维']),
      guide_tips: JSON.stringify([
        '让宝宝参与简单的备餐过程（洗菜、撕菜叶），增加对食物的兴趣',
        '不强迫进食，尊重宝宝的饥饱信号',
        '加餐选择水果、奶制品、坚果酱，避免高糖零食',
        '开始培养用勺子独立进食，可以接受宝宝洒落食物',
      ]),
    },
    {
      stage: '24-36m',
      name: '幼儿期',
      age_range: '24-36个月',
      age_min: 24,
      age_max: 36,
      can_eat: JSON.stringify(['所有家常食材', '各类坚果（磨碎）', '各类食物', '发酵食品']),
      cannot_eat: JSON.stringify(['整颗小粒坚果（仍建议避免）', '含糖饮料/碳酸饮料', '过度腌制/熏制食品', '过多油炸食品']),
      texture_desc: '完全接近成人食物，可以吃小粒水果但仍需注意形状',
      meal_frequency: '每天3次正餐+1-2次加餐，奶类300-400ml/天',
      key_nutrients: JSON.stringify(['钙', '铁', '锌', '维生素D', '膳食纤维', '蛋白质']),
      guide_tips: JSON.stringify([
        '2岁后可以开始吃和大人完全相同的食物，只需控制盐糖用量',
        '培养自主进食，用餐时间固定，避免边吃边玩',
        '鼓励尝试各种颜色的蔬菜，用游戏方式引导不挑食',
        '每天保证至少30分钟户外活动，配合均衡饮食促进生长',
      ]),
    },
  ]);
}
```

**Step 2: 运行种子**

```bash
cd backend && node -e "
const knex = require('knex');
const config = require('./knexfile');
const db = knex(config.development);
require('./src/database/seeds/007_baby_stages').seed(db)
  .then(() => { console.log('Seed done'); db.destroy(); })
  .catch(e => { console.error(e); db.destroy(); });
"
```

如果上面命令因 TS 不能直接 require，改用 tsx：

```bash
cd backend && npx tsx -e "
import knex from 'knex';
import config from './knexfile';
import { seed } from './src/database/seeds/007_baby_stages';
const db = knex((config as any).development);
seed(db).then(() => { console.log('done'); db.destroy(); });
"
```

预期输出：`done`

**Step 3: 验证**

```bash
cd backend && npx tsx -e "
import knex from 'knex';
import config from './knexfile';
const db = knex((config as any).development);
db('baby_stages').select('stage', 'name', 'age_range').then(rows => { console.log(rows); db.destroy(); });
"
```

预期：返回 6 行数据（6-8m 到 24-36m）

**Step 4: Commit**

```bash
git add backend/src/database/seeds/007_baby_stages.ts
git commit -m "feat: add baby_stages seed data for all 6 developmental stages"
```

---

### Task 4: BabyStageService + 路由

**Files:**
- Create: `backend/src/services/baby-stage.service.ts`
- Create: `backend/src/controllers/baby-stage.controller.ts`
- Create: `backend/src/routes/baby-stage.routes.ts`
- Modify: `backend/src/index.ts`

**Step 1: 创建 Service**

```typescript
// backend/src/services/baby-stage.service.ts
import { db } from '../config/database';

export interface BabyStage {
  stage: string;
  name: string;
  age_range: string;
  age_min: number;
  age_max: number;
  can_eat: string[];
  cannot_eat: string[];
  texture_desc: string;
  meal_frequency: string;
  key_nutrients: string[];
  guide_tips: string[];
}

export class BabyStageService {
  private parse(row: any): BabyStage {
    return {
      ...row,
      can_eat: typeof row.can_eat === 'string' ? JSON.parse(row.can_eat) : row.can_eat,
      cannot_eat: typeof row.cannot_eat === 'string' ? JSON.parse(row.cannot_eat) : row.cannot_eat,
      key_nutrients: typeof row.key_nutrients === 'string' ? JSON.parse(row.key_nutrients) : row.key_nutrients,
      guide_tips: typeof row.guide_tips === 'string' ? JSON.parse(row.guide_tips) : row.guide_tips,
    };
  }

  async getAll(): Promise<BabyStage[]> {
    const rows = await db('baby_stages').orderBy('age_min', 'asc');
    return rows.map(r => this.parse(r));
  }

  async getByStage(stage: string): Promise<BabyStage | null> {
    const row = await db('baby_stages').where('stage', stage).first();
    return row ? this.parse(row) : null;
  }

  async getByAge(months: number): Promise<BabyStage | null> {
    const row = await db('baby_stages')
      .where('age_min', '<=', months)
      .where('age_max', '>', months)
      .first();
    return row ? this.parse(row) : null;
  }

  async getRecipesByStage(stage: string, filters: {
    first_intro?: boolean;
    scene_tag?: string;
    nutrient?: string;
    limit?: number;
  } = {}): Promise<any[]> {
    let query = db('recipes')
      .where('stage', stage)
      .where('is_active', true)
      .select('id', 'name', 'prep_time', 'difficulty', 'stage', 'first_intro',
              'key_nutrients', 'scene_tags', 'texture_level', 'image_url', 'type');

    if (filters.first_intro) {
      query = query.where('first_intro', true);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const rows = await query;

    // 内存过滤 scene_tag / nutrient（SQLite JSON 查询不方便）
    return rows
      .map(r => ({
        ...r,
        key_nutrients: typeof r.key_nutrients === 'string' ? JSON.parse(r.key_nutrients) : r.key_nutrients || [],
        scene_tags: typeof r.scene_tags === 'string' ? JSON.parse(r.scene_tags) : r.scene_tags || [],
        image_url: typeof r.image_url === 'string' ? JSON.parse(r.image_url) : r.image_url || [],
      }))
      .filter(r => {
        if (filters.scene_tag && !r.scene_tags.includes(filters.scene_tag)) return false;
        if (filters.nutrient && !r.key_nutrients.includes(filters.nutrient)) return false;
        return true;
      });
  }
}
```

**Step 2: 创建 Controller**

```typescript
// backend/src/controllers/baby-stage.controller.ts
import { Request, Response } from 'express';
import { BabyStageService } from '../services/baby-stage.service';

const service = new BabyStageService();

export class BabyStageController {
  // GET /baby-stages
  getAll = async (_req: Request, res: Response) => {
    const stages = await service.getAll();
    res.json({ code: 200, message: 'success', data: stages });
  };

  // GET /baby-stages/:stage  (e.g. /baby-stages/6-8m)
  getByStage = async (req: Request, res: Response) => {
    const stage = await service.getByStage(req.params.stage);
    if (!stage) return res.status(404).json({ code: 404, message: '阶段不存在', data: null });
    res.json({ code: 200, message: 'success', data: stage });
  };

  // GET /baby-stages/by-age/:months  (e.g. /baby-stages/by-age/10)
  getByAge = async (req: Request, res: Response) => {
    const months = parseInt(req.params.months);
    if (isNaN(months)) return res.status(400).json({ code: 400, message: '月龄格式错误', data: null });
    const stage = await service.getByAge(months);
    res.json({ code: 200, message: 'success', data: stage });
  };

  // GET /baby-stages/:stage/recipes?first_intro=true&scene_tag=快手&nutrient=铁
  getRecipes = async (req: Request, res: Response) => {
    const recipes = await service.getRecipesByStage(req.params.stage, {
      first_intro: req.query.first_intro === 'true',
      scene_tag: req.query.scene_tag as string,
      nutrient: req.query.nutrient as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json({ code: 200, message: 'success', data: recipes });
  };
}
```

**Step 3: 创建 Routes**

```typescript
// backend/src/routes/baby-stage.routes.ts
import { Router } from 'express';
import { BabyStageController } from '../controllers/baby-stage.controller';

const router = Router();
const controller = new BabyStageController();

router.get('/', controller.getAll);
router.get('/by-age/:months', controller.getByAge);
router.get('/:stage', controller.getByStage);
router.get('/:stage/recipes', controller.getRecipes);

export default router;
```

**Step 4: 注册到 index.ts**

在 `backend/src/index.ts` 中添加（在最后一个 `app.use` 之前）：

```typescript
import babyStageRoutes from './routes/baby-stage.routes';
// ...
app.use('/api/v1/baby-stages', babyStageRoutes);
```

**Step 5: 验证 API**

重启后端后测试：

```bash
curl http://localhost:3000/api/v1/baby-stages | head -200
curl http://localhost:3000/api/v1/baby-stages/8-10m
curl http://localhost:3000/api/v1/baby-stages/by-age/10
```

预期：返回正确的 JSON 数据

**Step 6: Commit**

```bash
git add backend/src/services/baby-stage.service.ts \
        backend/src/controllers/baby-stage.controller.ts \
        backend/src/routes/baby-stage.routes.ts \
        backend/src/index.ts
git commit -m "feat: add BabyStageService + API routes (GET /baby-stages)"
```

---

### Task 5: 菜谱种子数据扩充（辅食 + 场景食谱）

**Files:**
- Create: `backend/src/database/seeds/008_baby_recipes.ts`

**Step 1: 创建辅食菜谱种子文件**

这是数据文件，包含各阶段代表性辅食各 5-8 道，覆盖 6 个阶段 + 场景食谱。每道菜需包含完整的 `adult_version`、`baby_version` 字段（一菜两吃），以及新增的 `stage`、`key_nutrients`、`scene_tags`、`texture_level`、`first_intro` 字段。

注意：创建此文件时，直接编写数据，不调用外部 API。参考已有 seed 文件的格式（`backend/src/database/seeds/002_recipes.ts`）。

每道辅食需同时提供：
- 大人版（type: 'baby_friendly_adult'，stage: 'adult'）
- 宝宝版菜谱（type: 'baby'，stage: '6-8m' 等）

目标：新增 60-80 道菜谱，覆盖所有 6 个阶段各 8-10 道。

读取 `backend/src/database/seeds/002_recipes.ts` 了解数据格式后再开始写。

**Step 2: 运行种子**

```bash
cd backend && npx tsx -e "
import knex from 'knex';
import config from './knexfile';
import { seed } from './src/database/seeds/008_baby_recipes';
const db = knex((config as any).development);
seed(db).then(() => { console.log('done'); db.destroy(); });
"
```

**Step 3: 验证**

```bash
cd backend && npx tsx -e "
import knex from 'knex';
import config from './knexfile';
const db = knex((config as any).development);
db('recipes').count('* as total').first()
  .then(r => { console.log('Total recipes:', r?.total); db.destroy(); });
"
```

预期：total > 140

**Step 4: Commit**

```bash
git add backend/src/database/seeds/008_baby_recipes.ts
git commit -m "feat: add 60+ baby/toddler recipes across all developmental stages"
```

---

## Phase A-2：前端类型 + API + Hook

### Task 6: 前端类型定义 + API 封装

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/babyStages.ts`
- Modify: `frontend/src/navigation/RecipeNavigator.tsx` (添加新路由)

**Step 1: 在 types/index.ts 中添加新类型**

在文件末尾添加：

```typescript
// ============================================
// 宝宝阶段类型
// ============================================

export type BabyStageKey = '6-8m' | '8-10m' | '10-12m' | '12-18m' | '18-24m' | '24-36m';

export interface BabyStageGuide {
  stage: BabyStageKey;
  name: string;
  age_range: string;
  age_min: number;
  age_max: number;
  can_eat: string[];
  cannot_eat: string[];
  texture_desc: string;
  meal_frequency: string;
  key_nutrients: string[];
  guide_tips: string[];
}

// RecipeSummary 已有，需扩展以支持新字段（可选字段）
// 在现有 RecipeSummary 接口中添加：
// stage?: string;
// first_intro?: boolean;
// key_nutrients?: string[];
// scene_tags?: string[];
// texture_level?: string;
```

同时在 `RecipeStackParamList` 中添加两个新路由：

```typescript
BabyStages: undefined;
StageDetail: { stage: BabyStageKey; stageName: string };
```

**Step 2: 创建 API 封装**

```typescript
// frontend/src/api/babyStages.ts
import { apiClient } from './client';
import { BabyStageGuide, RecipeSummary } from '../types';

export const babyStagesApi = {
  getAll: () =>
    apiClient.get<BabyStageGuide[]>('/baby-stages'),

  getByStage: (stage: string) =>
    apiClient.get<BabyStageGuide>(`/baby-stages/${stage}`),

  getByAge: (months: number) =>
    apiClient.get<BabyStageGuide | null>(`/baby-stages/by-age/${months}`),

  getRecipesByStage: (stage: string, params?: {
    first_intro?: boolean;
    scene_tag?: string;
    nutrient?: string;
  }) =>
    apiClient.get<RecipeSummary[]>(`/baby-stages/${stage}/recipes`, { params }),
};
```

**Step 3: 在 RecipeNavigator.tsx 中注册新路由**

读取文件，在现有 Stack.Screen 列表末尾添加：

```typescript
import { BabyStageScreen } from '../screens/recipe/BabyStageScreen';
import { StageDetailScreen } from '../screens/recipe/StageDetailScreen';

// 在 Stack.Navigator 内添加：
<Stack.Screen
  name="BabyStages"
  component={BabyStageScreen}
  options={{ title: '辅食体系' }}
/>
<Stack.Screen
  name="StageDetail"
  component={StageDetailScreen}
  options={({ route }) => ({ title: route.params.stageName })}
/>
```

**Step 4: Commit**

```bash
git add frontend/src/types/index.ts \
        frontend/src/api/babyStages.ts \
        frontend/src/navigation/RecipeNavigator.tsx
git commit -m "feat: add BabyStage types, API client, and route registration"
```

---

### Task 7: useBabyStages Hook

**Files:**
- Create: `frontend/src/hooks/useBabyStages.ts`

**Step 1: 创建 Hook**

```typescript
// frontend/src/hooks/useBabyStages.ts
import { useQuery } from '@tanstack/react-query';
import { babyStagesApi } from '../api/babyStages';

export function useAllBabyStages() {
  return useQuery({
    queryKey: ['babyStages'],
    queryFn: async () => {
      const res = await babyStagesApi.getAll();
      return res.data.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24小时
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7天
  });
}

export function useBabyStageByAge(months: number | undefined) {
  return useQuery({
    queryKey: ['babyStage', 'by-age', months],
    queryFn: async () => {
      if (!months) return null;
      const res = await babyStagesApi.getByAge(months);
      return res.data.data;
    },
    enabled: !!months,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useStageRecipes(stage: string, filters?: {
  first_intro?: boolean;
  scene_tag?: string;
  nutrient?: string;
}) {
  return useQuery({
    queryKey: ['stageRecipes', stage, filters],
    queryFn: async () => {
      const res = await babyStagesApi.getRecipesByStage(stage, filters);
      return res.data.data;
    },
    enabled: !!stage,
    staleTime: 60 * 60 * 1000, // 1小时
  });
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useBabyStages.ts
git commit -m "feat: add useBabyStages React Query hooks"
```

---

## Phase A-3：前端页面

### Task 8: StageGuideCard 组件

**Files:**
- Create: `frontend/src/components/recipe/StageGuideCard.tsx`

**Step 1: 创建组件**

折叠/展开式阶段指南卡片：

```typescript
// frontend/src/components/recipe/StageGuideCard.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BabyStageGuide } from '../../types';

interface Props {
  stage: BabyStageGuide;
  defaultExpanded?: boolean;
}

export function StageGuideCard({ stage, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(e => !e)}>
        <View style={styles.headerLeft}>
          <Text style={styles.stageName}>{stage.name}</Text>
          <Text style={styles.ageRange}>{stage.age_range}</Text>
        </View>
        <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <Row icon="✅" label="可以吃" items={stage.can_eat} color="#4CAF50" />
          <Row icon="❌" label="不能吃" items={stage.cannot_eat} color="#F44336" />
          <InfoRow icon="📐" label="质地要求" text={stage.texture_desc} />
          <InfoRow icon="🍽️" label="喂养频次" text={stage.meal_frequency} />
          <Row icon="💊" label="重点营养" items={stage.key_nutrients} color="#FF9800" />
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 喂养贴士</Text>
            {stage.guide_tips.map((tip, i) => (
              <Text key={i} style={styles.tip}>• {tip}</Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Row({ icon, label, items, color }: { icon: string; label: string; items: string[]; color: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        <Text style={styles.rowItems}>{items.join('、')}</Text>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowItems}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF', borderRadius: 14, marginHorizontal: 16, marginBottom: 12,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#FFF8E1',
  },
  headerLeft: { flex: 1 },
  stageName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  ageRange: { fontSize: 13, color: '#888', marginTop: 2 },
  toggle: { fontSize: 14, color: '#888' },
  body: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  rowIcon: { fontSize: 16, marginTop: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 2 },
  rowItems: { fontSize: 13, color: '#555', lineHeight: 20 },
  tipsSection: { backgroundColor: '#F8F9FA', borderRadius: 8, padding: 12 },
  tipsTitle: { fontSize: 13, fontWeight: '600', color: '#FF9800', marginBottom: 8 },
  tip: { fontSize: 13, color: '#555', lineHeight: 22 },
});
```

**Step 2: Commit**

```bash
git add frontend/src/components/recipe/StageGuideCard.tsx
git commit -m "feat: add StageGuideCard component with collapsible guide content"
```

---

### Task 9: BabyStageScreen（阶段导航页）

**Files:**
- Create: `frontend/src/screens/recipe/BabyStageScreen.tsx`

**Step 1: 创建页面**

```typescript
// frontend/src/screens/recipe/BabyStageScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipeStackParamList, BabyStageGuide, BabyStageKey } from '../../types';
import { useAllBabyStages } from '../../hooks/useBabyStages';
import { useUsers } from '../../hooks/useUsers'; // 获取用户宝宝月龄

type Props = NativeStackScreenProps<RecipeStackParamList, 'BabyStages'>;

const STAGE_COLORS: Record<string, string> = {
  '6-8m':   '#4CAF50',
  '8-10m':  '#4CAF50',
  '10-12m': '#FF7043',
  '12-18m': '#FF9800',
  '18-24m': '#9C27B0',
  '24-36m': '#2196F3',
};

export function BabyStageScreen({ navigation }: Props) {
  const { data: stages, isLoading } = useAllBabyStages();
  const { data: userData } = useUsers();
  const babyAgeMonths = userData?.baby_age_months;

  const getCurrentStage = (months: number | undefined): string | null => {
    if (!months || !stages) return null;
    const s = stages.find(s => months >= s.age_min && months < s.age_max);
    return s?.stage ?? null;
  };

  const currentStage = getCurrentStage(babyAgeMonths);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#FF7043" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>选择宝宝月龄阶段</Text>
        {babyAgeMonths && (
          <Text style={styles.subtitle}>
            当前宝宝 {babyAgeMonths} 个月 · 已为你高亮当前阶段
          </Text>
        )}

        {(stages ?? []).map((stage) => {
          const isCurrent = stage.stage === currentStage;
          const isPast = babyAgeMonths ? stage.age_max <= babyAgeMonths : false;
          const color = STAGE_COLORS[stage.stage] ?? '#888';

          return (
            <TouchableOpacity
              key={stage.stage}
              style={[styles.stageCard, isCurrent && styles.stageCardCurrent]}
              onPress={() => navigation.navigate('StageDetail', {
                stage: stage.stage as BabyStageKey,
                stageName: stage.name,
              })}
            >
              <View style={[styles.indicator, { backgroundColor: color }]}>
                <Text style={styles.indicatorText}>
                  {isPast ? '✓' : isCurrent ? '👉' : '·'}
                </Text>
              </View>
              <View style={styles.stageInfo}>
                <Text style={[styles.stageName, isCurrent && styles.stageNameCurrent]}>
                  {stage.name}
                </Text>
                <Text style={styles.ageRange}>{stage.age_range}</Text>
              </View>
              <View style={styles.stageRight}>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>当前阶段</Text>
                  </View>
                )}
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  stageCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  stageCardCurrent: {
    borderWidth: 2, borderColor: '#FF7043', elevation: 3,
  },
  indicator: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  indicatorText: { fontSize: 16 },
  stageInfo: { flex: 1 },
  stageName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  stageNameCurrent: { color: '#FF7043' },
  ageRange: { fontSize: 13, color: '#888', marginTop: 2 },
  stageRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currentBadge: {
    backgroundColor: '#FFF3F0', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  currentBadgeText: { fontSize: 11, color: '#FF7043', fontWeight: '600' },
  arrow: { fontSize: 20, color: '#CCC' },
});
```

**Step 2: Commit**

```bash
git add frontend/src/screens/recipe/BabyStageScreen.tsx
git commit -m "feat: add BabyStageScreen with current stage highlighting"
```

---

### Task 10: StageDetailScreen（阶段详情页）

**Files:**
- Create: `frontend/src/screens/recipe/StageDetailScreen.tsx`

**Step 1: 创建页面**

包含阶段指南卡（折叠）+ 食谱列表 + 筛选器（首次引入/场景标签/营养素）：

```typescript
// frontend/src/screens/recipe/StageDetailScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RecipeStackParamList } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { babyStagesApi } from '../../api/babyStages';
import { useStageRecipes } from '../../hooks/useBabyStages';
import { StageGuideCard } from '../../components/recipe/StageGuideCard';
import { RecipeCard } from '../../components/recipe/RecipeCard';

type Props = NativeStackScreenProps<RecipeStackParamList, 'StageDetail'>;

const SCENE_FILTERS = [
  { id: '', label: '全部' },
  { id: 'first_intro', label: '首次引入' },
  { id: '快手', label: '⚡ 快手' },
  { id: '生病', label: '🤒 生病' },
  { id: '日常', label: '🌿 日常' },
];

export function StageDetailScreen({ route, navigation }: Props) {
  const { stage } = route.params;
  const [activeFilter, setActiveFilter] = useState('');

  const { data: stageData, isLoading: stageLoading } = useQuery({
    queryKey: ['babyStage', stage],
    queryFn: async () => {
      const res = await babyStagesApi.getByStage(stage);
      return res.data.data;
    },
  });

  const filters = activeFilter === 'first_intro'
    ? { first_intro: true }
    : activeFilter
    ? { scene_tag: activeFilter }
    : {};

  const { data: recipes, isLoading: recipesLoading } = useStageRecipes(stage, filters);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 阶段指南卡 */}
        {stageLoading ? (
          <ActivityIndicator style={{ margin: 20 }} color="#FF7043" />
        ) : stageData ? (
          <StageGuideCard stage={stageData} defaultExpanded={true} />
        ) : null}

        {/* 筛选器 */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {SCENE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 食谱列表 */}
        <View style={styles.recipesSection}>
          <Text style={styles.recipesTitle}>
            {recipes?.length ?? 0} 道食谱
          </Text>
          {recipesLoading ? (
            <ActivityIndicator color="#FF7043" style={{ margin: 20 }} />
          ) : recipes?.length === 0 ? (
            <Text style={styles.emptyText}>该筛选条件下暂无食谱</Text>
          ) : (
            recipes?.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD',
  },
  filterChipActive: { backgroundColor: '#FF7043', borderColor: '#FF7043' },
  filterText: { fontSize: 13, color: '#555' },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  recipesSection: { paddingHorizontal: 16, paddingBottom: 24 },
  recipesTitle: { fontSize: 14, color: '#888', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
```

**Step 2: Commit**

```bash
git add frontend/src/screens/recipe/StageDetailScreen.tsx
git commit -m "feat: add StageDetailScreen with guide card, filters, and recipe list"
```

---

### Task 11: 首页添加"今日辅食建议"卡片

**Files:**
- Modify: `frontend/src/screens/home/HomeScreen.tsx`

**Step 1: 读取 HomeScreen.tsx 完整内容后，添加辅食建议卡片**

在今日推荐区域之后，添加"今日辅食建议"卡片。需要：
1. 导入 `useBabyStageByAge` hook
2. 导入 `useUsers` 获取宝宝月龄
3. 在首页渲染辅食卡片（仅当有宝宝月龄时显示）

卡片样式：
```typescript
// 今日辅食建议卡片
{babyAgeMonths && stageData && (
  <View style={styles.babySection}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>🍼 今日辅食建议</Text>
      <TouchableOpacity onPress={() => navigation.navigate('BabyStages')}>
        <Text style={styles.seeAll}>辅食体系 ›</Text>
      </TouchableOpacity>
    </View>
    <TouchableOpacity
      style={styles.babyCard}
      onPress={() => navigation.navigate('StageDetail', {
        stage: stageData.stage,
        stageName: stageData.name,
      })}
    >
      <Text style={styles.babyCardStage}>{stageData.name} · {stageData.age_range}</Text>
      <Text style={styles.babyCardNutrients}>
        重点营养：{stageData.key_nutrients.slice(0, 3).join(' · ')}
      </Text>
      <Text style={styles.babyCardHint}>点击查看适合的食谱 ›</Text>
    </TouchableOpacity>
  </View>
)}
```

注意：HomeScreen 导航类型是 `HomeStackParamList`，需要确认 `BabyStages` 和 `StageDetail` 路由是否也在 `HomeStackParamList` 中（如果没有，只导航到 RecipeTab 的 BabyStages 入口即可，或在 HomeStackParamList 中也添加这两个路由）。

**Step 2: Commit**

```bash
git add frontend/src/screens/home/HomeScreen.tsx
git commit -m "feat: add daily baby food suggestion card on HomeScreen"
```

---

### Task 12: RecipeListScreen 添加辅食体系入口

**Files:**
- Modify: `frontend/src/screens/recipe/RecipeListScreen.tsx`

**Step 1: 在菜谱列表页顶部添加"辅食体系"Banner**

读取文件，在搜索栏下方、分类筛选 Tab 上方，添加一个横幅卡片：

```typescript
{/* 辅食体系入口 Banner */}
<TouchableOpacity
  style={styles.babyBanner}
  onPress={() => navigation.navigate('BabyStages')}
>
  <Text style={styles.babyBannerText}>🍼 辅食体系</Text>
  <Text style={styles.babyBannerSub}>按月龄浏览，找到最适合的食谱</Text>
  <Text style={styles.babyBannerArrow}>›</Text>
</TouchableOpacity>
```

样式：
```typescript
babyBanner: {
  flexDirection: 'row', alignItems: 'center',
  backgroundColor: '#FFF8E1', borderRadius: 12,
  marginHorizontal: 16, marginBottom: 12, padding: 14,
  borderLeftWidth: 4, borderLeftColor: '#FF7043',
},
babyBannerText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
babyBannerSub: { fontSize: 12, color: '#888' },
babyBannerArrow: { fontSize: 20, color: '#CCC', marginLeft: 8 },
```

**Step 2: Commit**

```bash
git add frontend/src/screens/recipe/RecipeListScreen.tsx
git commit -m "feat: add baby stage entry banner to RecipeListScreen"
```

---

### Task 13: 更新设计文档状态 + 最终 Push

**Step 1: 更新设计文档**

修改 `docs/plans/2026-02-21-content-depth-design.md`，将状态从"待实施"改为"已实施"，并在每个 Phase 下标注完成情况。

**Step 2: 更新开发进度文档**

在 `docs/05-开发进度.md` 顶部（2026-02-21 区域）添加本次实现记录。

**Step 3: 最终 Commit 并 Push**

```bash
git add docs/
git commit -m "docs: update content depth implementation status to completed"
git push origin master
```

---

## 验证检查清单

完成所有 Task 后验证：

```
后端：
□ GET /api/v1/baby-stages → 返回 6 个阶段
□ GET /api/v1/baby-stages/8-10m → 返回正确阶段数据
□ GET /api/v1/baby-stages/by-age/10 → 返回 10-12m 阶段
□ GET /api/v1/baby-stages/8-10m/recipes → 返回该阶段食谱
□ recipes 表有 stage/key_nutrients 等新字段
□ 总菜谱数 > 140 道

前端：
□ 首页显示"今日辅食建议"卡片（需要有宝宝月龄的账号）
□ 菜谱列表页有"辅食体系"入口 Banner
□ 点击进入 BabyStageScreen，显示 6 个阶段
□ 当前阶段高亮显示
□ 进入 StageDetailScreen，顶部显示指南卡
□ 指南卡可折叠/展开
□ 食谱列表按筛选条件正确过滤
□ 点击食谱可进入详情页
```
