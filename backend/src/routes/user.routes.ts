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

// 当前用户偏好
router.get('/me/preferences', userController.getPreferences);
router.put('/me/preferences', userController.updatePreferences);
router.put('/me/profile-tags', userController.updateProfileTags);

export default router;
