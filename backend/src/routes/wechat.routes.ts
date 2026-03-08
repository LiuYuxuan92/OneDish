import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// 微信小程序登录
router.post('/wechat', authController.wechatLogin);
router.post('/upgrade-guest/wechat', authController.upgradeGuestWechat);

export default router;
