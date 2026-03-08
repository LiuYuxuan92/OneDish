import { db } from '../config/database';
import { familyService } from './family.service';
import { MealPlanService } from './mealPlan.service';
import { ShoppingListService } from './shoppingList.service';

describe('family collaboration minimal flow', () => {
  const runId = `fam${Date.now()}`;
  const ownerId = `owner-${runId}`;
  const memberId = `member-${runId}`;
  const recipeId = `recipe-${runId}`;
  let familyId = '';
  let mealPlanId = '';
  let shoppingListId = '';

  beforeAll(async () => {
    await db.migrate.latest();

    await db('users').insert([
      { id: ownerId, username: `owner_${runId}`, password_hash: 'x' },
      { id: memberId, username: `member_${runId}`, password_hash: 'x' },
    ]);

    await db('recipes').insert({
      id: recipeId,
      name: `家庭测试菜谱${runId}`,
      type: 'dinner',
      difficulty: '简单',
      adult_version: JSON.stringify({ ingredients: [], steps: [] }),
      baby_version: JSON.stringify({ ingredients: [], steps: [] }),
      prep_time: 20,
      servings: '2人份',
      is_active: true,
    });
  });

  afterAll(async () => {
    await db('meal_plans').whereIn('user_id', [ownerId, memberId]).del();
    await db('shopping_lists').whereIn('user_id', [ownerId, memberId]).del();
    await db('family_members').whereIn('user_id', [ownerId, memberId]).del();
    await db('families').where('owner_id', ownerId).del();
    await db('recipes').where('id', recipeId).del();
    await db('users').whereIn('id', [ownerId, memberId]).del();
    await db.destroy();
  });

  it('owner can create family and member can join to share meal plan + shopping list', async () => {
    const family = await familyService.createFamily(ownerId, '测试家庭');
    familyId = String(family?.family_id);
    expect(family?.role).toBe('owner');
    expect(family?.invite_code).toBeTruthy();

    const mealPlanService = new MealPlanService();
    const createdPlan = await mealPlanService.setMealPlan({
      user_id: ownerId,
      plan_date: '2026-03-10',
      meal_type: 'dinner',
      recipe_id: recipeId,
      servings: 2,
    });
    mealPlanId = createdPlan.id;
    expect(createdPlan.family_id).toBe(familyId);

    await db('shopping_lists').insert({
      id: `list-${runId}`,
      user_id: ownerId,
      family_id: familyId,
      list_date: '2026-03-10',
      items: JSON.stringify({ produce: [] }),
      total_estimated_cost: 0,
      is_completed: false,
    });
    shoppingListId = `list-${runId}`;

    const joined = await familyService.joinFamily(String(family?.invite_code), memberId);
    expect(joined?.role).toBe('member');
    expect(joined?.family_id).toBe(familyId);

    const memberWeekly = await mealPlanService.getWeeklyPlan(memberId, '2026-03-10', '2026-03-10');
    expect(memberWeekly.plans['2026-03-10']?.dinner?.id).toBe(recipeId);

    const shoppingListService = new ShoppingListService();
    const memberList = await shoppingListService.getShoppingListById(shoppingListId, memberId);
    expect(memberList.id).toBe(shoppingListId);
    expect(memberList.share?.role).toBe('member');
    expect(memberList.share?.family_id).toBe(familyId);
  });
});
