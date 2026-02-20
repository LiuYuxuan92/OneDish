const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './dev.sqlite3',
  },
  useNullAsDefault: true,
});

async function testSearch() {
  try {
    // 测试搜索功能
    console.log('=== 测试搜索功能 ===');

    // 1. 直接 LIKE 查询
    const likeResults = await knex('recipes')
      .where('name', 'like', '%红烧%')
      .select('id', 'name')
      .limit(5);
    console.log('LIKE查询结果:', likeResults);

    // 2. 获取前5条记录
    const allRecipes = await knex('recipes')
      .select('id', 'name', 'is_active')
      .limit(5);
    console.log('\n所有菜谱(前5):', allRecipes);

    // 3. 检查搜索API实际执行的查询
    console.log('\n=== 检查搜索API逻辑 ===');
    const searchPattern = '%红烧%';
    const results = await knex('recipes')
      .where('is_active', 1)
      .andWhere(function() {
        this.where('name', 'like', searchPattern);
      })
      .select('id', 'name');
    console.log('搜索"红烧"结果数量:', results.length);
    console.log('搜索"红烧"结果:', results);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await knex.destroy();
  }
}

testSearch();
