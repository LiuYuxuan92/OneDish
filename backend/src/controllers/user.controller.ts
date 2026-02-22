import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // 获取用户信息
  getUserInfo = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const user = await this.userService.findById(userId);

      if (!user) {
        return res.status(404).json({
          code: 404,
          message: '用户不存在',
          data: null,
        });
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
          family_size: user.family_size,
          baby_age: user.baby_age,
          preferences: user.preferences,
          role: user.role || 'user',
        },
      });
    } catch (error) {
      logger.error('Failed to get user info', { error });
      res.status(500).json({
        code: 500,
        message: '获取用户信息失败',
        data: null,
      });
    }
  };

  // 更新用户信息
  updateUserInfo = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { family_size, baby_age, avatar_url } = req.body;

      const user = await this.userService.updateUserInfo(userId, {
        family_size,
        baby_age,
        avatar_url,
      });

      res.json({
        code: 200,
        message: '更新成功',
        data: user,
      });
    } catch (error) {
      logger.error('Failed to update user info', { error });
      res.status(500).json({
        code: 500,
        message: '更新用户信息失败',
        data: null,
      });
    }
  };

  // 更新用户偏好
  updatePreferences = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const preferences = req.body;

      const user = await this.userService.updatePreferences(userId, preferences);

      res.json({
        code: 200,
        message: '更新成功',
        data: { preferences: user.preferences },
      });
    } catch (error) {
      logger.error('Failed to update preferences', { error });
      res.status(500).json({
        code: 500,
        message: '更新偏好失败',
        data: null,
      });
    }
  };
}
