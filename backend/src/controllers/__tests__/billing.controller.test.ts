import { BillingController } from '../billing.controller';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('BillingController', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  const createResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('grants dev product in non-production', async () => {
    process.env.NODE_ENV = 'test';
    const service = {
      devGrantProduct: jest.fn().mockResolvedValue({ summary: { quota_summary: [] } }),
    } as any;
    const controller = new BillingController(service);
    const req: any = { user: { user_id: 'user-1' }, body: { product_code: 'growth_monthly_1990' } };
    const res = createResponse();

    await controller.devGrantProduct(req, res as any);

    expect(service.devGrantProduct).toHaveBeenCalledWith('user-1', 'growth_monthly_1990');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200, message: '开发测试权益发放成功' }));
  });

  it('blocks dev grant in production', async () => {
    process.env.NODE_ENV = 'production';
    const service = {
      devGrantProduct: jest.fn(),
    } as any;
    const controller = new BillingController(service);
    const req: any = { user: { user_id: 'user-1' }, body: { product_code: 'growth_monthly_1990' } };
    const res = createResponse();

    await controller.devGrantProduct(req, res as any);

    expect(service.devGrantProduct).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('resets quotas in non-production', async () => {
    process.env.NODE_ENV = 'test';
    const service = {
      devResetQuotaUsage: jest.fn().mockResolvedValue({ quota_summary: [] }),
    } as any;
    const controller = new BillingController(service);
    const req: any = { user: { user_id: 'user-1' }, body: { feature_codes: ['smart_recommendation'] } };
    const res = createResponse();

    await controller.devResetQuotas(req, res as any);

    expect(service.devResetQuotaUsage).toHaveBeenCalledWith('user-1', ['smart_recommendation']);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 200, message: '开发测试额度已重置' }));
  });
});
