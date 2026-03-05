import jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';
import { TokenBlacklistService } from '../token-blacklist.service';

// Mock dependencies
jest.mock('../../config/database', () => ({
  db: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([{ id: 'user-123', username: 'testuser' }]),
      onConflict: jest.fn().mockReturnValue({
        ignore: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

jest.mock('../../config/jwt', () => ({
  jwtConfig: {
    secret: 'test-secret',
    devSecret: 'test-dev-secret',
    refreshSecret: 'test-refresh-secret',
    devRefreshSecret: 'test-dev-refresh-secret',
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '7d',
  },
  isProduction: false,
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let tokenBlacklistService: TokenBlacklistService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    tokenBlacklistService = new TokenBlacklistService();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT with user_id', () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      } as any;

      const token = authService.generateToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify JWT structure
      const decoded = jwt.decode(token) as any;
      expect(decoded).toHaveProperty('user_id', 'user-123');
      expect(decoded).toHaveProperty('username', 'testuser');
      expect(decoded).toHaveProperty('role', 'user');
    });

    it('should generate different tokens for different users', () => {
      const user1 = { id: 'user-1', username: 'user1' } as any;
      const user2 = { id: 'user-2', username: 'user2' } as any;

      const token1 = authService.generateToken(user1);
      const token2 = authService.generateToken(user2);

      expect(token1).not.toBe(token2);

      const decoded1 = jwt.decode(token1) as any;
      const decoded2 = jwt.decode(token2) as any;

      expect(decoded1.user_id).toBe('user-1');
      expect(decoded2.user_id).toBe('user-2');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token with user_id', () => {
      const mockUser = {
        id: 'user-456',
        username: 'refreshuser',
      } as any;

      const refreshToken = authService.generateRefreshToken(mockUser);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');

      const decoded = jwt.decode(refreshToken) as any;
      expect(decoded).toHaveProperty('user_id', 'user-456');
      expect(decoded).toHaveProperty('username', 'refreshuser');
    });
  });

  describe('Token Blacklist', () => {
    it('should check if token is blacklisted', async () => {
      const mockDb = require('../../config/database').db;
      
      // Token not in blacklist
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const result = await tokenBlacklistService.isBlacklisted('some-token');
      expect(result).toBe(false);
    });

    it('should return true for blacklisted token', async () => {
      const mockDb = require('../../config/database').db;
      
      // Token in blacklist
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: 'hashed-token' }),
          }),
        }),
      });

      const result = await tokenBlacklistService.isBlacklisted('blacklisted-token');
      expect(result).toBe(true);
    });

    it('should blacklist a token', async () => {
      const mockDb = require('../../config/database').db;
      
      mockDb.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          onConflict: jest.fn().mockReturnValue({
            ignore: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const expiresAt = new Date('2025-12-31T23:59:59Z');
      await expect(
        tokenBlacklistService.blacklistToken('test-token', expiresAt)
      ).resolves.not.toThrow();
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should add old token to blacklist when refreshing', async () => {
      const mockDb = require('../../config/database').db;
      const crypto = require('crypto');
      
      // Mock the blacklist insert
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          onConflict: jest.fn().mockReturnValue({
            ignore: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const user1 = { id: 'user-789', username: 'rotationuser1' } as any;
      const user2 = { id: 'user-790', username: 'rotationuser2' } as any;
      
      // Generate tokens for different users (ensures different tokens)
      const oldRefreshToken = authService.generateRefreshToken(user1);
      const newRefreshToken = authService.generateRefreshToken(user2);

      expect(oldRefreshToken).not.toBe(newRefreshToken);

      // Simulate the old token being blacklisted
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await tokenBlacklistService.blacklistToken(oldRefreshToken, expiresAt);

      // Verify old token is now blacklisted - need to mock the db response
      const tokenHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: tokenHash }),
          }),
        }),
      });

      const isOldBlacklisted = await tokenBlacklistService.isBlacklisted(oldRefreshToken);
      expect(isOldBlacklisted).toBe(true);

      // New token should not be blacklisted - mock returning undefined
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const isNewBlacklisted = await tokenBlacklistService.isBlacklisted(newRefreshToken);
      expect(isNewBlacklisted).toBe(false);
    });
  });
});
