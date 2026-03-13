import { Request, Response } from 'express';
import { billingService, BillingFeatureCode, BillingProductCode, BillingService } from '../services/billing.service';
import { logger } from '../utils/logger';
import { ClientPlatform, getFeatureMatrix } from '../config/feature-matrix';

function parsePlatform(value: unknown): ClientPlatform | undefined {
  return value === 'miniprogram' || value === 'app' || value === 'web'
    ? value
    : undefined;
}

function ensureDevMode(res: Response) {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ code: 403, message: '生产环境禁止使用开发测试接口', data: null });
    return false;
  }
  return true;
}

function parseFeatureCodes(input: unknown): BillingFeatureCode[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const allowed = new Set<BillingFeatureCode>(['ai_baby_recipe', 'weekly_plan_from_prompt', 'smart_recommendation']);
  const featureCodes = input.filter((item): item is BillingFeatureCode => allowed.has(item as BillingFeatureCode));
  return featureCodes.length ? featureCodes : undefined;
}

export class BillingController {
  constructor(private readonly service: BillingService = billingService) {}

  getFeatureMatrix = async (req: Request, res: Response) => {
    const platform = parsePlatform(req.query.platform);
    res.json({
      code: 200,
      message: 'success',
      data: getFeatureMatrix(platform),
    });
  };

  getProducts = async (_req: Request, res: Response) => {
    res.json({
      code: 200,
      message: 'success',
      data: this.service.getProductCatalog(),
    });
  };

  getMySummary = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const platform = parsePlatform(req.query.platform);
      const summary = await this.service.getUserBillingSummary(userId, platform);
      res.json({ code: 200, message: 'success', data: summary });
    } catch (error) {
      logger.error('Failed to get billing summary', { error });
      res.status(500).json({ code: 500, message: '获取会员与额度信息失败', data: null });
    }
  };

  createOrder = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { product_code } = req.body || {};
      if (!product_code) {
        return res.status(400).json({ code: 400, message: 'product_code 不能为空', data: null });
      }

      const order = await this.service.createOrder(userId, product_code as BillingProductCode);
      res.json({ code: 200, message: '订单创建成功', data: order });
    } catch (error: any) {
      logger.error('Failed to create billing order', { error });
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({ code: 404, message: '商品不存在', data: null });
      }
      res.status(500).json({ code: 500, message: '创建订单失败', data: null });
    }
  };

  devConfirmPaid = async (req: Request, res: Response) => {
    try {
      if (!ensureDevMode(res)) return;

      const userId = (req as any).user.user_id;
      const { orderId } = req.params;
      const order = await this.service.markOrderPaid(orderId, userId);

      res.json({ code: 200, message: '开发确认支付成功', data: order });
    } catch (error: any) {
      logger.error('Failed to confirm billing order as paid', { error });
      if (error.message === 'ORDER_NOT_FOUND') {
        return res.status(404).json({ code: 404, message: '订单不存在', data: null });
      }
      if (error.message === 'ORDER_FORBIDDEN') {
        return res.status(403).json({ code: 403, message: '无权操作该订单', data: null });
      }
      res.status(500).json({ code: 500, message: '确认支付失败', data: null });
    }
  };

  devGrantProduct = async (req: Request, res: Response) => {
    try {
      if (!ensureDevMode(res)) return;

      const userId = (req as any).user.user_id;
      const { product_code } = req.body || {};
      if (!product_code) {
        return res.status(400).json({ code: 400, message: 'product_code 不能为空', data: null });
      }

      const result = await this.service.devGrantProduct(userId, product_code as BillingProductCode);
      return res.json({ code: 200, message: '开发测试权益发放成功', data: result });
    } catch (error: any) {
      logger.error('Failed to grant dev billing product', { error });
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return res.status(404).json({ code: 404, message: '商品不存在', data: null });
      }
      return res.status(500).json({ code: 500, message: '开发测试权益发放失败', data: null });
    }
  };

  devResetQuotas = async (req: Request, res: Response) => {
    try {
      if (!ensureDevMode(res)) return;

      const userId = (req as any).user.user_id;
      const featureCodes = parseFeatureCodes(req.body?.feature_codes);
      const summary = await this.service.devResetQuotaUsage(userId, featureCodes);
      return res.json({ code: 200, message: '开发测试额度已重置', data: summary });
    } catch (error) {
      logger.error('Failed to reset dev billing quotas', { error });
      return res.status(500).json({ code: 500, message: '开发测试额度重置失败', data: null });
    }
  };

  devClearBenefits = async (req: Request, res: Response) => {
    try {
      if (!ensureDevMode(res)) return;

      const userId = (req as any).user.user_id;
      const summary = await this.service.devClearBenefits(userId);
      return res.json({ code: 200, message: '开发测试权益已清空', data: summary });
    } catch (error) {
      logger.error('Failed to clear dev billing benefits', { error });
      return res.status(500).json({ code: 500, message: '开发测试权益清空失败', data: null });
    }
  };
}

export const billingController = new BillingController();
