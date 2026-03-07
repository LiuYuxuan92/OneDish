import { Router } from 'express';
import { aiController } from '../controllers/ai-config.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 所有路由需要认证
router.use(authenticate);

// 获取用户所有 AI 配置
router.get('/', aiController.getConfigs);

// 创建 AI 配置
router.post('/', aiController.createConfig);

// 更新 AI 配置
router.put('/:id', aiController.updateConfig);

// 删除 AI 配置
router.delete('/:id', aiController.deleteConfig);

// 测试 AI 配置
router.post('/:id/test', aiController.testConfig);

export default router;
