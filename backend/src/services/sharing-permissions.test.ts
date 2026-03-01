import { db } from '../config/database';
import { ShoppingListService } from './shoppingList.service';

describe('sharing permission regression (shopping list)', () => {
  const service = new ShoppingListService();
  const runId = `t${Date.now()}`;

  const ownerId = `owner-${runId}`;
  const memberId = `member-${runId}`;
  const outsiderId = `outsider-${runId}`;
  const removedMemberId = `removed-${runId}`;
  const listId = `list-${runId}`;

  beforeAll(async () => {
    await db.migrate.latest();

    await db('users').insert([
      { id: ownerId, username: `owner_${runId}`, password_hash: 'x' },
      { id: memberId, username: `member_${runId}`, password_hash: 'x', avatar_url: 'https://img/member.png' },
      { id: outsiderId, username: `outsider_${runId}`, password_hash: 'x' },
      { id: removedMemberId, username: `removed_${runId}`, password_hash: 'x' },
    ]);

    await db('shopping_lists').insert({
      id: listId,
      user_id: ownerId,
      list_date: '2026-03-01',
      items: JSON.stringify({ produce: [] }),
      total_estimated_cost: 0,
      is_completed: false,
    });
  });

  afterAll(async () => {
    await db('shopping_list_share_members').whereIn('user_id', [ownerId, memberId, outsiderId, removedMemberId]).del();
    await db('shopping_list_shares').where('list_id', listId).del();
    await db('shopping_lists').where('id', listId).del();
    await db('share_invite_revocations').whereIn('revoked_by', [ownerId]).del();
    await db('users').whereIn('id', [ownerId, memberId, outsiderId, removedMemberId]).del();
    await db.destroy();
  });

  it('owner can access and operate share management', async () => {
    const share = await service.createShareLink(listId, ownerId);

    const ownerView = await service.getShoppingListById(listId, ownerId);
    expect(ownerView.share?.role).toBe('owner');

    const joinAsOwner = await service.joinByInviteCode(share.invite_code, ownerId);
    expect(joinAsOwner.role).toBe('owner');

    const regenerated = await service.regenerateShareInvite(listId, ownerId);
    expect(regenerated.invite_code).toBeTruthy();
    expect(regenerated.old_invite_code).toBeTruthy();
  });

  it('member can access but cannot regenerate invite', async () => {
    const currentShare = await db('shopping_list_shares').where('list_id', listId).first();
    await service.joinByInviteCode(currentShare.invite_code, memberId);

    const memberView = await service.getShoppingListById(listId, memberId);
    expect(memberView.share?.role).toBe('member');

    await expect(service.regenerateShareInvite(listId, memberId)).rejects.toThrow('仅 owner 可操作邀请码');
  });

  it('removed member is denied access', async () => {
    const currentShare = await db('shopping_list_shares').where('list_id', listId).first();
    await service.joinByInviteCode(currentShare.invite_code, removedMemberId);

    const ownerView = await service.getShoppingListById(listId, ownerId);
    expect(ownerView.share?.members?.some((m: any) => m.user_id === removedMemberId)).toBe(true);

    await service.removeShareMember(listId, ownerId, removedMemberId);
    await expect(service.getShoppingListById(listId, removedMemberId)).rejects.toThrow('你已无权访问该共享清单，可能已被移除');
  });

  it('revoked invite code cannot be used to join', async () => {
    const before = await db('shopping_list_shares').where('list_id', listId).first();
    const oldInviteCode = before.invite_code;

    await service.regenerateShareInvite(listId, ownerId);

    await expect(service.joinByInviteCode(oldInviteCode, outsiderId)).rejects.toThrow('邀请码已失效，请向 owner 获取最新邀请码');
  });
});
