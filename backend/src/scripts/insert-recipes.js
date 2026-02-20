const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../dev.sqlite3');
const db = new sqlite3.Database(dbPath);

const recipes = [
  {
    id: 'recipe_006',
    name: '番茄牛腩 / 牛肉蔬菜泥',
    name_en: 'Braised Beef Brisket / Beef Veggie Puree',
    type: 'dinner',
    category: JSON.stringify(['肉类', '牛肉', '一菜两吃']),
    prep_time: 20,
    cook_time: 90,
    total_time: 110,
    difficulty: '中等',
    servings: '3人份',
    main_ingredients: JSON.stringify([
      { name: '牛腩', amount_adult: '500g', amount_baby: '30g' },
      { name: '番茄', amount_adult: '3个', amount_baby: '1/4个' },
    ]),
    adult_version: JSON.stringify({
      name: '番茄牛腩',
      ingredients: [{ name: '牛腩', amount: '500g' }],
      seasonings: [{ name: '生抽', amount: '2勺' }],
      steps: [{ step: 1, action: '焯水', time: 10 }],
    }),
    baby_version: JSON.stringify({
      name: '牛肉蔬菜泥',
      age_range: '10-18个月',
      ingredients: [{ name: '牛肉', amount: '30g' }],
      steps: [{ step: 1, action: '打泥', time: 2 }],
      nutrition_tips: '牛肉补铁',
    }),
    sync_cooking: JSON.stringify({ can_cook_together: true, time_saving: '共用炖煮' }),
    cooking_tips: JSON.stringify(['选肥瘦相间']),
    tags: JSON.stringify(['牛肉', '番茄']),
    is_active: 1,
  },
  {
    id: 'recipe_007',
    name: '白灼虾 / 虾泥粥',
    name_en: 'Boiled Shrimp / Shrimp Congee',
    type: 'lunch',
    category: JSON.stringify(['海鲜', '虾', '一菜两吃']),
    prep_time: 10,
    cook_time: 15,
    total_time: 25,
    difficulty: '简单',
    servings: '2人份',
    main_ingredients: JSON.stringify([
      { name: '鲜虾', amount_adult: '400g', amount_baby: '3只' },
    ]),
    adult_version: JSON.stringify({ name: '白灼虾', ingredients: [], steps: [] }),
    baby_version: JSON.stringify({ name: '虾泥粥', age_range: '10-18个月', ingredients: [], steps: [], allergy_alert: '虾易过敏' }),
    sync_cooking: JSON.stringify({ can_cook_together: true }),
    tags: JSON.stringify(['虾']),
    is_active: 1,
  },
];

console.log('开始插入数据...');

// 先清空
db.run('DELETE FROM recipes WHERE id LIKE "recipe_0%"', (err) => {
  if (err) {
    console.error('清空失败:', err);
    return;
  }
  console.log('已清空旧数据');

  const stmt = db.prepare(`
    INSERT INTO recipes (id, name, name_en, type, category, prep_time, cook_time, total_time, difficulty, servings, 
      main_ingredients, adult_version, baby_version, sync_cooking, cooking_tips, tags, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  recipes.forEach((recipe) => {
    stmt.run(
      recipe.id,
      recipe.name,
      recipe.name_en,
      recipe.type,
      recipe.category,
      recipe.prep_time,
      recipe.cook_time,
      recipe.total_time,
      recipe.difficulty,
      recipe.servings,
      recipe.main_ingredients,
      recipe.adult_version,
      recipe.baby_version,
      recipe.sync_cooking,
      recipe.cooking_tips,
      recipe.tags,
      recipe.is_active,
      (err) => {
        if (err) console.error('插入失败:', recipe.id, err);
        else console.log('✅ 插入成功:', recipe.id);
      }
    );
  });

  stmt.finalize();
  console.log('插入完成');
  db.close();
});
