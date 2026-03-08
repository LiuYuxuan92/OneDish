import { Request, Response } from 'express';
import { familyService } from '../services/family.service';
import { logger } from '../utils/logger';

export class FamilyController {
  getMyFamily = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const result = await familyService.getFamilyContextByUserId(userId);
      res.json({ code: 200, message: 'success', data: result });
    } catch (error) {
      logger.error('Failed to get my family', { error });
      res.status(500).json({ code: 500, message: '获取家庭信息失败', data: null });
    }
  };

  createFamily = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { name } = req.body || {};
      const result = await familyService.createFamily(userId, name);
      res.json({ code: 200, message: '创建家庭成功', data: result });
    } catch (error) {
      logger.error('Failed to create family', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '创建家庭失败', data: null });
    }
  };

  joinFamily = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { invite_code } = req.body || {};
      const result = await familyService.joinFamily(String(invite_code || '').trim(), userId);
      res.json({ code: 200, message: '加入家庭成功', data: result });
    } catch (error) {
      logger.error('Failed to join family', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '加入家庭失败', data: null });
    }
  };

  regenerateInvite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { familyId } = req.params;
      const result = await familyService.regenerateInviteCode(userId, familyId);
      res.json({ code: 200, message: '邀请码已更新', data: result });
    } catch (error) {
      logger.error('Failed to regenerate family invite', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '更新邀请码失败', data: null });
    }
  };

  removeMember = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { familyId, memberId } = req.params;
      const result = await familyService.removeMember(userId, familyId, memberId);
      res.json({ code: 200, message: '成员已移除', data: result });
    } catch (error) {
      logger.error('Failed to remove family member', { error });
      res.status(500).json({ code: 500, message: (error as Error).message || '移除成员失败', data: null });
    }
  };
}
