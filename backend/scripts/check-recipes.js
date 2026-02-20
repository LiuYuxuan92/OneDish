const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite3',
  },
  useNullAsDefault: true,
});

async function checkRecipes() {
  try {
    // 检查总记录数
    const totalCount = await knex('recipes').count('* as count').first();
    console.log('Total recipes:', totalCount.count);

    // 检查is_active状态分布
    const activeStatus = await knex('recipes')
      .select('is_active')
      .count('* as count')
      .groupBy('is_active');
    console.log('Active status distribution:', activeStatus);

    // 获取前3条记录的样本
    const sampleRecipes = await knex('recipes')
      .select('id', 'name', 'is_active', 'prep_time')
      .limit(3);
    console.log('Sample recipes:', JSON.stringify(sampleRecipes, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await knex.destroy();
  }
}

checkRecipes();
