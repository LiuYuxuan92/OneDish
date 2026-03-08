import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// 用户注册
router.post('/register', authController.register);
router.post('/upgrade-guest/register', authenticate, authController.upgradeGuestRegister);

// 用户登录
router.post('/login', authController.login);
router.post('/upgrade-guest/login', authenticate, authController.upgradeGuestLogin);

// 游客登录（用于Web开发测试）
router.post('/guest', authController.guestLogin);
router.post('/upgrade-guest/wechat', authenticate, authController.upgradeGuestWechat);

// 刷新Token
router.post('/refresh', authController.refreshToken);

// 退出登录（需要认证）
router.post('/logout', authenticate, authController.logout);

export default router;
