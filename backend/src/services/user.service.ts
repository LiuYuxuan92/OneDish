import { db } from '../config/database';

export class UserService {
  // 根据ID查找用户
  async findById(userId: string) {
    const user = await db('users').where('id', userId).first();
    if (!user) return user;
    if (typeof user.preferences === 'string') {
      try { user.preferences = JSON.parse(user.preferences); } catch { user.preferences = {}; }
    }
    return user;
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
    const current = await this.findById(userId);
    const merged = { ...(current?.preferences || {}), ...(preferences || {}) };

    const [user] = await db('users')
      .where('id', userId)
      .update({
        preferences: JSON.stringify(merged),
        updated_at: new Date(),
      })
      .returning('*');

    if (user && typeof user.preferences === 'string') {
      try { user.preferences = JSON.parse(user.preferences); } catch {}
    }
    return user;
  }

  async updateProfileTags(userId: string, tags: {
    flavors?: string[];
    meal_slots?: string[];
    baby_stage?: string;
  }) {
    const current = await this.findById(userId);
    const merged = {
      ...(current?.preferences || {}),
      profile_tags: {
        flavors: Array.isArray(tags?.flavors) ? tags.flavors : [],
        meal_slots: Array.isArray(tags?.meal_slots) ? tags.meal_slots : [],
        baby_stage: tags?.baby_stage || null,
      },
    };

    const [user] = await db('users')
      .where('id', userId)
      .update({
        preferences: JSON.stringify(merged),
        updated_at: new Date(),
      })
      .returning(['id', 'preferences']);

    if (user && typeof user.preferences === 'string') {
      try { user.preferences = JSON.parse(user.preferences); } catch {}
    }

    return user;
  }
}
