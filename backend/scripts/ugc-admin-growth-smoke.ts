import { db, closeConnection } from '../src/config/database';
import { UserRecipeService } from '../src/services/userRecipe.service';
import { ShoppingListService } from '../src/services/shoppingList.service';
import { UserService } from '../src/services/user.service';
import { RecipeService } from '../src/services/recipe.service';

async function ensureUser(id: string, role: 'admin' | 'user') {
  const existing = await db('users').where({ id }).first();
  if (existing) return;
  await db('users').insert({
    id,
    username: id,
    email: `${id}@test.local`,
    password_hash: 'hash',
    role,
    preferences: JSON.stringify({}),
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
}

async function run() {
  const svc = new UserRecipeService();
  const shopping = new ShoppingListService();
  const userSvc = new UserService();
  const recipeSvc = new RecipeService();

  await ensureUser('admin-smoke', 'admin');
  await ensureUser('user-smoke', 'user');

  const draft = await svc.createDraft('user-smoke', {
    name: `SMOKE-${Date.now()}`,
    source: 'ugc',
    type: 'dinner',
    tags: ['清淡'],
    baby_age_range: '10-12个月',
    adult_version: { ingredients: [{ name: '土豆' }, { name: '鸡蛋' }], steps: [] },
    baby_version: { ingredients: [{ name: '土豆' }, { name: '鸡蛋' }], steps: [] },
    step_branches: [{ note: '先出宝宝份' }],
  });
  const submitted = await svc.submitForReview('user-smoke', draft.id);
  const l1 = await svc.listForAdmin('pending', 1, 10);
  const b1 = await svc.batchReview([submitted.id], 'published', 'ok');

  await svc.recordQualityEvent({ recipeId: submitted.id, eventType: 'report', actorUserId: 'admin-smoke' });
  await svc.recordQualityEvent({ recipeId: submitted.id, eventType: 'adoption', eventValue: 1, actorUserId: 'admin-smoke' });
  await svc.recordQualityEvent({ recipeId: submitted.id, eventType: 'adoption', eventValue: 0, actorUserId: 'admin-smoke' });
  await svc.recomputeQualityScores([submitted.id]);
  const latest = await db('user_recipes').where({ id: submitted.id }).first();

  const [list] = await db('shopping_lists').insert({
    user_id: 'user-smoke',
    list_date: new Date().toISOString().slice(0, 10),
    items: JSON.stringify({ other: [{ name: '土豆', checked: false, ingredient_id: '土豆' }] }),
    total_estimated_cost: 0,
  }).returning('*');
  const updatedList = await shopping.updateListItem({
    list_id: list.id,
    user_id: 'user-smoke',
    area: 'other',
    ingredient_id: '土豆',
    assignee: '爸爸',
    status: 'doing',
  });

  const profile = await userSvc.updateProfileTags('user-smoke', { flavors: ['清淡'], meal_slots: ['dinner'], baby_stage: '10-12个月' });
  const rec = await recipeSvc.getDailyRecommendation({ user_id: 'user-smoke', max_time: 60 });

  const checks = [
    ['TC01 submit->pending', submitted.status === 'pending'],
    ['TC02 admin list pending', (l1.items || []).some((x: any) => x.id === submitted.id)],
    ['TC03 batch publish', b1.affected === 1],
    ['TC04 report_count回流', Number(latest.report_count) >= 1],
    ['TC05 adoption_rate回流', Number(latest.adoption_rate) === 0.5],
    ['TC06 shopping assignee', updatedList.items.other[0].assignee === '爸爸'],
    ['TC07 shopping status', updatedList.items.other[0].status === 'doing'],
    ['TC08 profile_tags写入', Array.isArray((profile as any).preferences?.profile_tags?.flavors)],
    ['TC09 recommendation可读取', !!rec?.date],
  ];

  checks.forEach(([name, ok]) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`));
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await closeConnection();
});
