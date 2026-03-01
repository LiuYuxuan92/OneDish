import { Router } from 'express';
import { MealPlanController } from '../controllers/mealPlan.controller';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();
const mealPlanController = new MealPlanController();

// 获取一周计划 - 支持匿名访问
router.get('/weekly', optionalAuth, mealPlanController.getWeeklyPlan);

// 其他需要认证的路由
router.use(authenticate);

// 创建共享周计划链接
router.post('/share', mealPlanController.createWeeklyShare);

// 通过邀请码加入共享周计划
router.post('/share/join', mealPlanController.joinWeeklyShare);

// 读取共享周计划
router.get('/share/:shareId/weekly', mealPlanController.getSharedWeeklyPlan);

// 共享周计划成员标记完成
router.post('/share/:shareId/:planId/complete', mealPlanController.markSharedMealComplete);

// owner 失效并重置邀请码
router.post('/share/:shareId/regenerate', mealPlanController.regenerateWeeklyShareInvite);

// owner 移除成员
router.delete('/share/:shareId/members/:memberId', mealPlanController.removeWeeklyShareMember);

// 设置/更新餐食计划
router.post('/', mealPlanController.setMealPlan);

// 删除餐食计划
router.delete('/:planId', mealPlanController.deleteMealPlan);

// 标记餐食已完成
router.post('/:planId/complete', mealPlanController.markMealComplete);

// 生成一周智能计划
router.post('/generate', mealPlanController.generateWeeklyPlan);

// 三餐智能推荐 V1（A/B 方案）
router.post('/recommendations', mealPlanController.getSmartRecommendations);

// 推荐反馈闭环 V1
router.post('/recommendations/feedback', mealPlanController.submitRecommendationFeedback);
router.get('/recommendations/feedback/stats', mealPlanController.getRecommendationFeedbackStats);
router.post('/recommendations/recompute', mealPlanController.recomputeRecommendationLearning);

export default router;
