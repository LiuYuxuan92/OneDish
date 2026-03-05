import { db } from '../../../config/database';

export class ShoppingListShareService {
  /**
   * 生成邀请码
   */
  private genInviteCode(prefix = 'SL'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  /**
   * 获取可访问的清单（自有或已加入的共享清单）
   */
  async getAccessibleListOrThrow(listId: string, userId: string) {
    const ownList = await db('shopping_lists')
      .where('id', listId)
      .where('user_id', userId)
      .first();

    if (ownList) {
      return ownList;
    }

    const joined = await db('shopping_list_shares as s')
      .join('shopping_list_share_members as m', 's.id', 'm.share_id')
      .join('shopping_lists as l', 's.list_id', 'l.id')
      .where('s.list_id', listId)
      .where('m.user_id', userId)
      .select('l.*')
      .first();

    if (joined) {
      return joined;
    }

    const sharedList = await db('shopping_list_shares').where('list_id', listId).first();
    if (sharedList) {
      throw new Error('你已无权访问该共享清单，可能已被移除');
    }

    throw new Error('购物清单不存在');
  }

  /**
   * 获取分享上下文信息
   */
  async getShareContextByListId(listId: string, userId: string) {
    const share = await db('shopping_list_shares').where('list_id', listId).first();
    if (!share) return null;

    const isOwner = share.owner_id === userId;
    const member = isOwner
      ? null
      : await db('shopping_list_share_members').where('share_id', share.id).where('user_id', userId).first();

    if (!isOwner && !member) return null;

    const members = isOwner
      ? await db('shopping_list_share_members').where('share_id', share.id).select('user_id')
      : [];

    const memberProfiles = await this.resolveUserProfiles(members.map((m: any) => m.user_id));

    return {
      share_id: share.id,
      role: isOwner ? 'owner' : 'member',
      owner_id: share.owner_id,
      invite_code: share.invite_code,
      share_link: share.share_link,
      members: memberProfiles,
    };
  }

  /**
   * 解析用户 profiles
   */
  private async resolveUserProfiles(userIds: string[]) {
    if (!userIds.length) return [];

    const users = await db('users').whereIn('id', userIds).select('id', 'username', 'avatar_url');
    const profileMap = new Map(users.map((u: any) => [u.id, u]));

    return userIds.map((userId) => {
      const profile = profileMap.get(userId);
      const displayName = profile?.username || userId;
      return {
        user_id: userId,
        display_name: displayName,
        avatar_url: profile?.avatar_url || null,
      };
    });
  }

  /**
   * 检查用户是否有写权限
   */
  async canWriteList(listId: string, userId: string) {
    const own = await db('shopping_lists').where('id', listId).where('user_id', userId).first();
    if (own) return true;

    const member = await db('shopping_list_shares as s')
      .join('shopping_list_share_members as m', 's.id', 'm.share_id')
      .where('s.list_id', listId)
      .where('m.user_id', userId)
      .first();

    return Boolean(member);
  }

  /**
   * 创建分享链接
   */
  async createShareLink(listId: string, ownerId: string) {
    const list = await db('shopping_lists').where('id', listId).where('user_id', ownerId).first();
    if (!list) {
      throw new Error('仅清单拥有者可发起共享');
    }

    const existed = await db('shopping_list_shares').where('list_id', listId).where('owner_id', ownerId).first();
    if (existed) {
      return existed;
    }

    const inviteCode = this.genInviteCode('SL');
    const shareLink = `onedish://shopping-list/share/${inviteCode}`;
    const [share] = await db('shopping_list_shares')
      .insert({
        list_id: listId,
        owner_id: ownerId,
        invite_code: inviteCode,
        share_link: shareLink,
      })
      .returning('*');

    return share;
  }

  /**
   * 重新生成分享邀请码
   */
  async regenerateShareInvite(listId: string, ownerId: string) {
    const share = await db('shopping_list_shares').where('list_id', listId).where('owner_id', ownerId).first();
    if (!share) throw new Error('仅 owner 可操作邀请码');

    const oldInviteCode = share.invite_code;
    const inviteCode = this.genInviteCode('SL');
    const shareLink = `onedish://shopping-list/share/${inviteCode}`;

    const revokedAt = new Date();
    const ttlDays = Math.max(1, Number(process.env.SHARE_INVITE_REVOCATION_TTL_DAYS || 30));
    const expiresAt = new Date(revokedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    await db('share_invite_revocations').insert({
      share_type: 'shopping_list',
      share_id: share.id,
      invite_code: oldInviteCode,
      revoked_by: ownerId,
      revoked_at: revokedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

    const [updated] = await db('shopping_list_shares')
      .where('id', share.id)
      .update({ invite_code: inviteCode, share_link: shareLink })
      .returning('*');

    return { ...updated, old_invite_code: oldInviteCode };
  }

  /**
   * 移除分享成员
   */
  async removeShareMember(listId: string, ownerId: string, targetMemberId: string) {
    const share = await db('shopping_list_shares').where('list_id', listId).where('owner_id', ownerId).first();
    if (!share) throw new Error('仅 owner 可移除成员');

    const removed = await db('shopping_list_share_members')
      .where('share_id', share.id)
      .where('user_id', targetMemberId)
      .del();

    if (!removed) throw new Error('成员不存在或已移除');
    return { share_id: share.id, removed_member_id: targetMemberId };
  }

  /**
   * 通过邀请码加入共享清单
   */
  async joinByInviteCode(inviteCode: string, userId: string) {
    const share = await db('shopping_list_shares').where('invite_code', inviteCode).first();
    if (!share) {
      const revoked = await db('share_invite_revocations').where('invite_code', inviteCode).where('share_type', 'shopping_list').first();
      if (revoked) throw new Error('邀请码已失效，请向 owner 获取最新邀请码');
      throw new Error('邀请码无效');
    }
    if (share.owner_id === userId) {
      return { share_id: share.id, list_id: share.list_id, role: 'owner' };
    }

    await db('shopping_list_share_members')
      .insert({ share_id: share.id, user_id: userId })
      .onConflict(['share_id', 'user_id'])
      .ignore();

    return { share_id: share.id, list_id: share.list_id, role: 'member' };
  }
}
