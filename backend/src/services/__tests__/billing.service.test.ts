jest.mock('../../config/database', () => ({
  db: jest.fn(),
  generateUUID: jest.fn(() => 'generated-uuid-1234567890abcdef'),
}));

describe('BillingService', () => {
  let BillingService: typeof import('../billing.service').BillingService;
  let service: import('../billing.service').BillingService;
  let mockDb: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    mockDb = require('../../config/database').db;
    ({ BillingService } = require('../billing.service'));
    service = new BillingService();
    jest.clearAllMocks();
  });

  it('returns product catalog with yuan price', () => {
    const products = service.getProductCatalog();
    expect(products.some((item) => item.code === 'growth_monthly_1990')).toBe(true);
    expect(products.find((item) => item.code === 'growth_monthly_1990')?.price_yuan).toBe(19.9);
  });

  it('createOrder inserts pending order for selected product', async () => {
    const insertMock = jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([
        {
          id: 'order-1',
          user_id: 'u1',
          product_code: 'growth_monthly_1990',
          provider: 'wechat_pay',
          amount_fen: 1990,
          currency: 'CNY',
          status: 'pending',
          out_trade_no: 'OD123',
          metadata: '{"product_name":"成长卡月卡"}',
        },
      ]),
    });

    mockDb.mockReturnValue({ insert: insertMock });

    const result = await service.createOrder('u1', 'growth_monthly_1990');

    expect(insertMock).toHaveBeenCalled();
    expect(result.status).toBe('pending');
    expect(result.amount_yuan).toBe(19.9);
    expect((result.metadata as any).product_name).toBe('成长卡月卡');
  });

  it('getFeatureQuotaStatus aggregates active quota accounts', async () => {
    jest.spyOn(service as any, 'expireStaleRecords').mockResolvedValue(undefined);

    const orderByMock = jest.fn().mockResolvedValue([
      {
        id: 'qa1',
        user_id: 'u1',
        feature_code: 'ai_baby_recipe',
        reset_mode: 'period',
        total_quota: 20,
        used_quota: 3,
        status: 'active',
        metadata: '{"display_name":"宝宝版 AI 改写"}',
      },
    ]);
    const whereMock = jest.fn().mockReturnValue({ orderBy: orderByMock });

    mockDb.mockImplementation((table: string) => {
      if (table === 'ai_quota_accounts') {
        return { where: whereMock };
      }
      return { where: jest.fn() };
    });

    const result = await service.getFeatureQuotaStatus('u1', 'ai_baby_recipe');
    expect(result.available).toBe(true);
    expect(result.remaining_quota).toBe(17);
  });
});
