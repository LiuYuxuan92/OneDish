jest.mock('../../config/database', () => ({
  db: jest.fn(),
}));

describe('UserService preferences', () => {
  let UserService: typeof import('../user.service').UserService;
  let service: import('../user.service').UserService;
  let mockDb: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    mockDb = require('../../config/database').db;
    ({ UserService } = require('../user.service'));
    service = new UserService();
    jest.clearAllMocks();
  });

  it('getPreferences should parse JSON string preferences from db', async () => {
    mockDb.mockReturnValue({
      where: jest.fn().mockReturnValue({
        first: jest.fn().mockResolvedValue({
          id: 'u1',
          preferences: '{"difficulty_preference":"easy","cooking_time_limit":20}',
        }),
      }),
    });

    await expect(service.getPreferences('u1')).resolves.toEqual({
      difficulty_preference: 'easy',
      cooking_time_limit: 20,
    });
  });

  it('updatePreferences should merge current preferences and normalize returned value', async () => {
    const whereMock = jest
      .fn()
      .mockReturnValueOnce({
        first: jest.fn().mockResolvedValue({
          id: 'u1',
          preferences: '{"difficulty_preference":"easy","default_baby_age":12}',
        }),
      })
      .mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'u1',
              preferences: '{"difficulty_preference":"easy","default_baby_age":18,"exclude_ingredients":"香菜"}',
            },
          ]),
        }),
      });

    mockDb.mockReturnValue({ where: whereMock });

    const result = await service.updatePreferences('u1', {
      default_baby_age: 18,
      exclude_ingredients: '香菜',
    });

    expect(result?.preferences).toEqual({
      difficulty_preference: 'easy',
      default_baby_age: 18,
      exclude_ingredients: '香菜',
    });
  });
});
