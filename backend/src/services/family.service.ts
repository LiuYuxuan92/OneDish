import { db } from '../config/database';

export type FamilyAccessContext = {
  family_id: string;
  owner_id: string;
  role: 'owner' | 'member';
  name: string;
  invite_code: string;
  members: Array<{ user_id: string; display_name?: string; avatar_url?: string | null; role: 'owner' | 'member' }>;
};

export type Permission =
  | 'family:manage'        // 管理家庭设置
  | 'family:invite'        // 邀请成员
  | 'family:remove_member' // 移除成员
  | 'meal_plan:read'       // 查看餐食计划
  | 'meal_plan:write'      // 编辑餐食计划
  | 'shopping_list:read'   // 查看购物清单
  | 'shopping_list:write'  // 编辑购物清单
  | 'feeding:read'         // 查看喂养反馈
  | 'feeding:write';       // 填写喂养反馈

// 邀请码有效期：7天
const INVITE_CODE_EXPIRE_DAYS = 7;

export class FamilyService {
  private genInviteCode(prefix = 'FM'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  /**
   * 检查用户是否有指定权限
   * @param userId 用户ID
   * @param familyId 家庭ID
   * @param permission 权限类型
   * @param resourceFamilyId 可选，资源所在的家庭ID（用于资源级别校验）
   */
  async checkFamilyPermission(
    userId: string,
    familyId: string,
    permission: Permission,
    resourceFamilyId?: string | null
  ): Promise<boolean> {
    const membership = await this.getFamilyByUserId(userId);
    
    // 用户不在该家庭
    if (!membership || membership.family.id !== familyId) {
      return false;
    }

    const { role } = membership;

    // 家庭管理权限（仅 owner）
    if (permission === 'family:manage' || permission === 'family:invite' || permission === 'family:remove_member') {
      return role === 'owner';
    }

    // 资源相关权限，需要校验 resourceFamilyId 是否匹配
    if (resourceFamilyId !== undefined) {
      // 如果资源不属于该家庭，用户需要是资源创建者（个人 scope）
      if (resourceFamilyId !== familyId) {
        // 对于个人资源，只有创建者可以访问
        return false;
      }
    }

    // meal_plan / shopping_list / feeding 读写权限：owner 和 member 都有
    const resourcePerms = [
      'meal_plan:read', 'meal_plan:write',
      'shopping_list:read', 'shopping_list:write',
      'feeding:read', 'feeding:write'
    ];
    
    return resourcePerms.includes(permission);
  }

  /**
   * 获取用户可访问的资源（个人 + 家庭）
   * 用于 meal_plans / shopping_lists 查询
   */
  async getAccessibleResourceQuery(userId: string, resourceType: 'meal_plans' | 'shopping_lists') {
    const family = await this.getFamilyByUserId(userId);
    const ownerId = family?.family?.owner_id || userId;

    if (!family) {
      // 无家庭：仅返回个人资源（user_id = ownerId 且 family_id = null）
      return { userId: ownerId, familyId: null, isFamilyMode: false };
    }

    // 有家庭：返回个人 + 家庭资源
    return { userId: ownerId, familyId: family.family.id, isFamilyMode: true };
  }

  async getFamilyByUserId(userId: string) {
    const owned = await db('families').where('owner_id', userId).first();
    if (owned) return { family: owned, role: 'owner' as const };

    const joined = await db('family_members as fm')
      .join('families as f', 'fm.family_id', 'f.id')
      .where('fm.user_id', userId)
      .select('f.*', 'fm.role as member_role')
      .first();

    if (!joined) return null;
    return { family: joined, role: (joined.member_role || 'member') as 'owner' | 'member' };
  }

  async getFamilyContextByUserId(userId: string): Promise<FamilyAccessContext | null> {
    const resolved = await this.getFamilyByUserId(userId);
    if (!resolved) return null;

    const familyId = resolved.family.id;
    const members = await db('family_members').where('family_id', familyId).select('user_id', 'role');
    const profiles = await this.resolveUserProfiles(members.map((member: any) => member.user_id));
    const profileMap = new Map(profiles.map((item) => [item.user_id, item]));

    return {
      family_id: familyId,
      owner_id: resolved.family.owner_id,
      role: resolved.role,
      name: resolved.family.name,
      invite_code: resolved.family.invite_code,
      members: members.map((member: any) => ({
        user_id: member.user_id,
        role: (member.role || 'member') as 'owner' | 'member',
        display_name: profileMap.get(member.user_id)?.display_name,
        avatar_url: profileMap.get(member.user_id)?.avatar_url || null,
      })),
    };
  }

  async createFamily(ownerId: string, name?: string) {
    const existing = await db('families').where('owner_id', ownerId).first();
    if (existing) {
      return this.getFamilyContextByUserId(ownerId);
    }

    const inviteCode = this.genInviteCode('FM');
    const [family] = await db('families')
      .insert({
        owner_id: ownerId,
        name: name?.trim() || '我的家庭',
        invite_code: inviteCode,
      })
      .returning('*');

    await db('family_members')
      .insert({
        family_id: family.id,
        user_id: ownerId,
        role: 'owner',
      })
      .onConflict(['user_id'])
      .ignore();

    return this.getFamilyContextByUserId(ownerId);
  }

  async joinFamily(inviteCode: string, userId: string) {
    const family = await db('families').where('invite_code', inviteCode).first();
    if (!family) throw new Error('家庭邀请码无效');

    // 校验邀请码是否过期
    if (family.invite_code_expire_at) {
      const expireAt = new Date(family.invite_code_expire_at);
      if (expireAt < new Date()) {
        throw new Error('邀请码已过期，请联系家人重新发送');
      }
    }

    const existingMembership = await this.getFamilyByUserId(userId);
    if (existingMembership) {
      if (existingMembership.family.id === family.id) {
        return this.getFamilyContextByUserId(userId);
      }
      throw new Error('你已加入其他家庭，当前版本暂不支持同时加入多个家庭');
    }

    await db('family_members')
      .insert({
        family_id: family.id,
        user_id: userId,
        role: 'member',
      })
      .onConflict(['user_id'])
      .ignore();

    await this.attachOwnedResourcesToFamily(userId, family.id);

    return this.getFamilyContextByUserId(userId);
  }

  async ensureOwner(userId: string, familyId: string) {
    const family = await db('families').where('id', familyId).first();
    if (!family) throw new Error('家庭不存在');
    if (family.owner_id !== userId) throw new Error('仅家庭 owner 可操作');
    return family;
  }

  async regenerateInviteCode(userId: string, familyId: string) {
    await this.ensureOwner(userId, familyId);
    const inviteCode = this.genInviteCode('FM');
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + INVITE_CODE_EXPIRE_DAYS);

    const [updated] = await db('families')
      .where('id', familyId)
      .update({ 
        invite_code: inviteCode, 
        invite_code_expire_at: expireAt.toISOString(),
        updated_at: new Date().toISOString() 
      })
      .returning('*');
    return {
      invite_code: updated.invite_code,
      expire_at: updated.invite_code_expire_at,
    };
  }

  async removeMember(ownerId: string, familyId: string, memberId: string) {
    const family = await this.ensureOwner(ownerId, familyId);
    if (family.owner_id === memberId) throw new Error('不能移除家庭 owner');

    const removed = await db('family_members').where('family_id', familyId).where('user_id', memberId).del();
    if (!removed) throw new Error('成员不存在或已移除');

    await db('meal_plans').where('family_id', familyId).where('user_id', memberId).update({ family_id: null });
    await db('shopping_lists').where('family_id', familyId).where('user_id', memberId).update({ family_id: null });

    return { family_id: familyId, removed_member_id: memberId };
  }

  async getOwnerIdForUser(userId: string) {
    const family = await this.getFamilyByUserId(userId);
    return family?.family?.owner_id || userId;
  }

  async getFamilyIdForUser(userId: string) {
    const family = await this.getFamilyByUserId(userId);
    return family?.family?.id || null;
  }

  async attachOwnedResourcesToFamily(userId: string, familyId: string) {
    await db('meal_plans').where('user_id', userId).update({ family_id: familyId });
    await db('shopping_lists').where('user_id', userId).update({ family_id: familyId });
  }

  private async resolveUserProfiles(userIds: string[]) {
    if (!userIds.length) return [];
    const users = await db('users').whereIn('id', userIds).select('id', 'username', 'avatar_url');
    const profileMap = new Map(users.map((u: any) => [u.id, u]));

    return userIds.map((userId) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        display_name: profile?.username || userId,
        avatar_url: profile?.avatar_url || null,
      };
    });
  }
}

export const familyService = new FamilyService();
