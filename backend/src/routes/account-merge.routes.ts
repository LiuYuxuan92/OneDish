import { Router } from 'express';
import { AccountMergeController } from '../controllers/account-merge.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const accountMergeController = new AccountMergeController();

// 获取合并预览
router.get('/merge-preview', authenticate, accountMergeController.getMergePreview);

// 发起合并
router.post('/merge', authenticate, accountMergeController.startMerge);

// 查询合并任务列表
router.get('/merge-jobs', authenticate, accountMergeController.listMergeJobs);

// 查询单个合并任务
router.get('/merge-jobs/:jobId', authenticate, accountMergeController.getMergeJob);

// 重试失败的任务
router.post('/merge-jobs/:jobId/retry', authenticate, accountMergeController.retryMergeJob);

export default router;
