import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// 所有路由需要认证
router.use(authenticate);

// 获取用户信息
router.get('/me', userController.getUserInfo);

// 更新用户信息
router.put('/me', userController.updateUserInfo);

// 更新用户偏好
router.put('/me/preferences', userController.updatePreferences);

export default router;
