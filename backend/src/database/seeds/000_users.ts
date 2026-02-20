import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 清空现有数据
  await knex('users').del();

  // 插入demo用户
  const users = [
    {
      id: 'demo_user_001',
      username: 'demo',
      email: 'demo@jianjiachu.com',
      password_hash: '$2a$10$demo', // 简化的密码哈希，仅用于开发
      phone: '13800138000',
      avatar_url: null,
      family_size: 2,
      baby_age: 18,
      preferences: JSON.stringify({
        max_prep_time: 30,
        favorite_categories: ['肉类', '家常'],
        exclude_ingredients: [],
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  await knex('users').insert(users);
  console.log('Demo user created: demo_user_001');
}
