import { Request, Response } from 'express';
import { AccountMergeService, MergeJob, MergePreviewResult } from '../services/account-merge.service';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

export class AccountMergeController {
  private accountMergeService: AccountMergeService;
  private authService: AuthService;

  constructor() {
    this.accountMergeService = new AccountMergeService();
    this.authService = new AuthService();
  }

  /**
   * 获取当前 guest 的待合并数据预览
   * GET /api/v1/account/merge-preview
   */
  getMergePreview = async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user?.user_id;
      if (!currentUserId) {
        return res.status(401).json({ code: 401, message: '未登录', data: null });
      }

      const currentUser = await this.authService.findById(currentUserId);
      if (!currentUser || !this.accountMergeService.isGuestUser(currentUser)) {
        return res.status(400).json({ code: 400, message: '当前账号不是游客账号', data: null });
      }

      const preview = await this.accountMergeService.getMergePreview(currentUserId);

      res.json({
        code: 200,
        message: 'success',
        data: preview,
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : '获取合并预览失败';
      logger.error('Failed to get merge preview', { error });

      if (message === 'MERGE_SOURCE_NOT_GUEST') {
        return res.status(400).json({ code: 400, message: '当前账号不是游客账号', data: null });
      }

      res.status(500).json({ code: 500, message, data: null });
    }
  };

  /**
   * 发起合并（创建并执行合并任务）
   * POST /api/v1/account/merge
   */
  startMerge = async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user?.user_id;
      if (!currentUserId) {
        return res.status(401).json({ code: 401, message: '未登录', data: null });
      }

      const { target_user_id, conflict_policy } = req.body;

      if (!target_user_id) {
        return res.status(400).json({ code: 400, message: '目标用户ID不能为空', data: null });
      }

      const currentUser = await this.authService.findById(currentUserId);
      if (!currentUser || !this.accountMergeService.isGuestUser(currentUser)) {
        return res.status(400).json({ code: 400, message: '当前账号不是游客账号', data: null });
      }

      const targetUser = await this.authService.findById(target_user_id);
      if (!targetUser) {
        return res.status(404).json({ code: 404, message: '目标用户不存在', data: null });
      }

      if (this.accountMergeService.isGuestUser(targetUser)) {
        return res.status(400).json({ code: 400, message: '目标账号不能是游客账号', data: null });
      }

      const job = await this.accountMergeService.startMerge(currentUserId, target_user_id, conflict_policy);

      const estimatedDuration = job.status === 'succeeded' ? 5 : 0;

      res.json({
        code: 200,
        message: job.status === 'succeeded' ? '合并任务已完成' : '合并任务已创建',
        data: {
          job_id: job.id,
          status: job.status,
          estimated_duration_seconds: estimatedDuration,
          result: job.result_summary,
        },
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : '发起合并失败';
      logger.error('Failed to start merge', { error });

      if (message === 'MERGE_USER_REQUIRED') {
        return res.status(400).json({ code: 400, message: '用户ID不能为空', data: null });
      }
      if (message === 'MERGE_TARGET_SAME_AS_GUEST') {
        return res.status(400).json({ code: 400, message: '目标账号与游客账号相同', data: null });
      }
      if (message === 'MERGE_SOURCE_NOT_GUEST') {
        return res.status(400).json({ code: 400, message: '当前账号不是游客账号', data: null });
      }
      if (message === 'MERGE_TARGET_IS_GUEST') {
        return res.status(400).json({ code: 400, message: '目标账号不能是游客账号', data: null });
      }
      if (message === 'MERGE_USER_NOT_FOUND') {
        return res.status(404).json({ code: 404, message: '用户不存在', data: null });
      }

      res.status(500).json({ code: 500, message, data: null });
    }
  };

  /**
   * 查询合并任务状态
   * GET /api/v1/account/merge-jobs/:jobId
   */
  getMergeJob = async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user?.user_id;
      if (!currentUserId) {
        return res.status(401).json({ code: 401, message: '未登录', data: null });
      }

      const { jobId } = req.params;
      if (!jobId) {
        return res.status(400).json({ code: 400, message: '任务ID不能为空', data: null });
      }

      const job = await this.accountMergeService.getMergeJob(jobId);
      if (!job) {
        return res.status(404).json({ code: 404, message: '合并任务不存在', data: null });
      }

      // 权限检查：只有任务创建者或目标用户可以查看
      if (job.source_guest_id !== currentUserId && job.target_user_id !== currentUserId) {
        return res.status(403).json({ code: 403, message: '无权限查看此任务', data: null });
      }

      res.json({
        code: 200,
        message: 'success',
        data: {
          job_id: job.id,
          status: job.status,
          source_guest_id: job.source_guest_id,
          target_user_id: job.target_user_id,
          started_at: job.started_at,
          finished_at: job.finished_at,
          error_code: job.error_code,
          error_message: job.error_message,
          result: job.result_summary,
          created_at: job.created_at,
        },
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : '查询合并任务失败';
      logger.error('Failed to get merge job', { error });
      res.status(500).json({ code: 500, message, data: null });
    }
  };

  /**
   * 获取当前用户的合并任务列表
   * GET /api/v1/account/merge-jobs
   */
  listMergeJobs = async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user?.user_id;
      if (!currentUserId) {
        return res.status(401).json({ code: 401, message: '未登录', data: null });
      }

      const jobs = await this.accountMergeService.getMergeJobsByUser(currentUserId);

      res.json({
        code: 200,
        message: 'success',
        data: {
          items: jobs.map(job => ({
            job_id: job.id,
            status: job.status,
            source_guest_id: job.source_guest_id,
            target_user_id: job.target_user_id,
            started_at: job.started_at,
            finished_at: job.finished_at,
            created_at: job.created_at,
          })),
        },
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : '查询合并任务列表失败';
      logger.error('Failed to list merge jobs', { error });
      res.status(500).json({ code: 500, message, data: null });
    }
  };

  /**
   * 重试失败的任务
   * POST /api/v1/account/merge-jobs/:jobId/retry
   */
  retryMergeJob = async (req: Request, res: Response) => {
    try {
      const currentUserId = (req as any).user?.user_id;
      if (!currentUserId) {
        return res.status(401).json({ code: 401, message: '未登录', data: null });
      }

      const { jobId } = req.params;
      if (!jobId) {
        return res.status(400).json({ code: 400, message: '任务ID不能为空', data: null });
      }

      const job = await this.accountMergeService.getMergeJob(jobId);
      if (!job) {
        return res.status(404).json({ code: 404, message: '合并任务不存在', data: null });
      }

      // 权限检查
      if (job.source_guest_id !== currentUserId && job.target_user_id !== currentUserId) {
        return res.status(403).json({ code: 403, message: '无权限操作此任务', data: null });
      }

      const retryJob = await this.accountMergeService.retryMergeJob(jobId);

      res.json({
        code: 200,
        message: retryJob.status === 'succeeded' ? '重试成功' : '重试任务已创建',
        data: {
          job_id: retryJob.id,
          status: retryJob.status,
          result: retryJob.result_summary,
        },
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : '重试合并任务失败';
      logger.error('Failed to retry merge job', { error });

      if (message === 'MERGE_JOB_NOT_FOUND') {
        return res.status(404).json({ code: 404, message: '合并任务不存在', data: null });
      }
      if (message === 'MERGE_JOB_CANNOT_RETRY') {
        return res.status(400).json({ code: 400, message: '当前状态不允许重试', data: null });
      }

      res.status(500).json({ code: 500, message, data: null });
    }
  };
}
