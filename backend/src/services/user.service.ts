import { db } from '../config/database';

export class UserService {
  // 根据ID查找用户
  async findById(userId: string) {
    return db('users').where('id', userId).first();
  }

  // 更新用户信息
  async updateUserInfo(userId: string, data: {
    family_size?: number;
    baby_age?: number;
    avatar_url?: string;
  }) {
    const [user] = await db('users')
      .where('id', userId)
      .update({
        ...data,
        updated_at: new Date(),
      })
      .returning(['id', 'username', 'email', 'phone', 'avatar_url', 'family_size', 'baby_age', 'preferences']);

    return user;
  }

  // 更新用户偏好
  async updatePreferences(userId: string, preferences: any) {
    const [user] = await db('users')
      .where('id', userId)
      .update({
        preferences: db.raw('preferences || ?', [JSON.stringify(preferences)]),
        updated_at: new Date(),
      })
      .returning('*');

    return user;
  }
}
