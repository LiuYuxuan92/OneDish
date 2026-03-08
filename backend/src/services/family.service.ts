import { db } from '../config/database';

export type FamilyAccessContext = {
  family_id: string;
  owner_id: string;
  role: 'owner' | 'member';
  name: string;
  invite_code: string;
  members: Array<{ user_id: string; display_name?: string; avatar_url?: string | null; role: 'owner' | 'member' }>;
};

export class FamilyService {
  private genInviteCode(prefix = 'FM'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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
    const [updated] = await db('families')
      .where('id', familyId)
      .update({ invite_code: inviteCode, updated_at: new Date().toISOString() })
      .returning('*');
    return updated;
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
