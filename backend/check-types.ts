import { db } from './src/config/database';

async function checkTypes() {
  const recipes = await db('recipes').select('name', 'type', 'is_active');
  console.log('菜谱类型列表:');
  console.table(recipes);
  await db.destroy();
}

checkTypes().catch(console.error);
