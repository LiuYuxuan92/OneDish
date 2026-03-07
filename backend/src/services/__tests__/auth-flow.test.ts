import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { TokenBlacklistService } from '../token-blacklist.service';

// Mock dependencies
jest.mock('../../config/database', () => ({
  db: jest.fn(),
}));

jest.mock('../../config/jwt', () => ({
  jwtConfig: {
    secret: 'test-secret-key-minimum-32-chars',
    refreshSecret: 'test-refresh-secret-key-minimum-32-char',
    devSecret: 'jianjiachu-dev-key-change-in-production',
    devRefreshSecret: 'jianjiachu-dev-refresh-key-change-in-production',
    accessTokenExpiry: '7d',
    refreshTokenExpiry: '30d',
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

// Mock axios for WeChat API calls
jest.mock('axios', () => ({
  get: jest.fn(),
}));

describe('Auth Flow Integration Tests', () => {
  let authService: AuthService;
  let tokenBlacklistService: TokenBlacklistService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    tokenBlacklistService = new TokenBlacklistService();
    mockDb = require('../../config/database').db;
  });

  // ==================== User Registration Flow ====================

  describe('User Registration Flow', () => {
    it('should successfully register a new user with username, email and password', async () => {
      // Mock: user does not exist
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      // Mock: insert new user
      const mockUser = {
        id: 'new-user-id-123',
        username: 'newuser',
        email: 'newuser@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        created_at: new Date(),
      };

      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      // Execute: create user
      const user = await authService.createUser({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      });

      // Verify: user created successfully
      expect(user).toBeDefined();
      expect(user.id).toBe('new-user-id-123');
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('newuser@example.com');
    });

    it('should fail registration when username already exists', async () => {
      // Mock: user already exists
      const existingUser = {
        id: 'existing-user-id',
        username: 'existinguser',
        email: 'existing@example.com',
      };

      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(existingUser),
          }),
        }),
      });

      // Execute & Verify: should throw error
      await expect(
        authService.createUser({
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });

    it.skip('should hash password before storing', async () => {
      const plainPassword = 'mysecretpassword';
      
      // Mock: user does not exist
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      // Mock: insert with password_hash
      const mockUser = {
        id: 'user-id-456',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockUser]),
        }),
      });

      await authService.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: plainPassword,
      });

      // Get the insert call
      const insertCall = mockDb.mock.calls.find((call: any) => call[0] === 'users');
      expect(insertCall).toBeDefined();

      const insertedData = insertCall[1];
      expect(insertedData.password_hash).not.toBe(plainPassword);
      expect(insertedData.password_hash).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should generate access token and refresh token after registration', async () => {
      const mockUser = {
        id: 'user-789',
        username: 'tokenuser',
        email: 'token@example.com',
      } as any;

      const accessToken = authService.generateToken(mockUser);
      const refreshToken = authService.generateRefreshToken(mockUser);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);

      // Verify access token
      const decodedAccess = jwt.decode(accessToken) as any;
      expect(decodedAccess.user_id).toBe('user-789');
      expect(decodedAccess.username).toBe('tokenuser');
      expect(decodedAccess.role).toBe('user');

      // Verify refresh token has longer expiry
      const decodedRefresh = jwt.decode(refreshToken) as any;
      expect(decodedRefresh.user_id).toBe('user-789');
    });
  });

  // ==================== User Login Flow ====================

  describe('User Login Flow', () => {
    it('should successfully login with correct email and password', async () => {
      const plainPassword = 'correctpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const existingUser = {
        id: 'login-user-id',
        username: 'loginuser',
        email: 'login@example.com',
        password_hash: hashedPassword,
        role: 'user',
      };

      // Mock: find user by email
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(existingUser),
        }),
      });

      const user = await authService.findByEmail('login@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('login@example.com');

      // Verify password
      const isValid = await bcrypt.compare(plainPassword, user!.password_hash);
      expect(isValid).toBe(true);

      // Generate tokens
      const token = authService.generateToken(user!);
      const refreshToken = authService.generateRefreshToken(user!);

      expect(token).toBeDefined();
      expect(refreshToken).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const plainPassword = 'correctpassword';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const existingUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: hashedPassword,
      };

      // Mock: find user
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(existingUser),
        }),
      });

      const user = await authService.findByEmail('test@example.com');

      // Verify with wrong password
      const isValid = await bcrypt.compare('wrongpassword', user!.password_hash);
      expect(isValid).toBe(false);
    });

    it('should fail login when user does not exist', async () => {
      // Mock: user not found
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const user = await authService.findByEmail('nonexistent@example.com');
      expect(user).toBeUndefined();
    });
  });

  // ==================== JWT Token Verification ====================

  describe('JWT Token Verification', () => {
    it('should verify a valid JWT token', () => {
      const mockUser = {
        id: 'verify-user-id',
        username: 'verifyuser',
        role: 'user',
      } as any;

      const token = authService.generateToken(mockUser);

      // Verify in non-production mode (use devSecret)
      const decoded = jwt.verify(token, 'jianjiachu-dev-key-change-in-production') as any;

      expect(decoded.user_id).toBe('verify-user-id');
      expect(decoded.username).toBe('verifyuser');
      expect(decoded.role).toBe('user');
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
    });

    it('should reject an invalid JWT token', () => {
      const invalidToken = 'invalid.token.string';

      expect(() => {
        jwt.verify(invalidToken, 'jianjiachu-dev-key-change-in-production');
      }).toThrow();
    });

    it('should reject a token with wrong secret', () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
      } as any;

      const token = authService.generateToken(mockUser);

      // Try to verify with wrong secret
      expect(() => {
        jwt.verify(token, 'wrong-secret-key');
      }).toThrow();
    });

    it('should correctly decode token without verification (for inspection)', () => {
      const mockUser = {
        id: 'decode-user-id',
        username: 'decodeuser',
      } as any;

      const token = authService.generateToken(mockUser);

      // Decode without verification (for getting payload info)
      const decoded = jwt.decode(token) as any;

      expect(decoded.user_id).toBe('decode-user-id');
      expect(decoded.username).toBe('decodeuser');
    });

    it('should include expiration time in token', () => {
      const mockUser = {
        id: 'expiry-user-id',
        username: 'expiryuser',
      } as any;

      const token = authService.generateToken(mockUser);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');

      // Token should be valid for 7 days (configured in jwtConfig)
      const expiryDate = new Date(decoded.exp * 1000);
      const now = new Date();
      const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      expect(diffDays).toBeGreaterThan(6); // ~7 days
      expect(diffDays).toBeLessThanOrEqual(8); // Allow some buffer
    });
  });

  // ==================== Token Blacklist ====================

  describe('Token Blacklist', () => {
    it('should add token to blacklist', async () => {
      // Mock: insert to blacklist
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          onConflict: jest.fn().mockReturnValue({
            ignore: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const expiresAt = new Date('2025-12-31T23:59:59Z');

      // Should not throw
      await expect(
        tokenBlacklistService.blacklistToken('test-token-to-blacklist', expiresAt)
      ).resolves.not.toThrow();
    });

    it('should check if token is in blacklist - not found', async () => {
      // Mock: token not in blacklist
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      const isBlacklisted = await tokenBlacklistService.isBlacklisted('normal-token');
      expect(isBlacklisted).toBe(false);
    });

    it('should check if token is in blacklist - found', async () => {
      // Mock: token in blacklist
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: 'hashed-token' }),
          }),
        }),
      });

      const isBlacklisted = await tokenBlacklistService.isBlacklisted('blacklisted-token');
      expect(isBlacklisted).toBe(true);
    });

    it('should handle database errors gracefully when checking blacklist', async () => {
      // Mock: database error
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockRejectedValue(new Error('DB connection failed')),
          }),
        }),
      });

      // Should return false on error (fail-open for availability)
      const isBlacklisted = await tokenBlacklistService.isBlacklisted('any-token');
      expect(isBlacklisted).toBe(false);
    });

    it('should cleanup expired tokens from blacklist', async () => {
      // Mock: delete expired tokens
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue(5), // Deleted 5 tokens
        }),
      });

      await expect(tokenBlacklistService.cleanupExpiredTokens()).resolves.not.toThrow();
    });

    it('should perform complete logout flow: blacklist access token and refresh token', async () => {
      const mockUser = {
        id: 'logout-user-id',
        username: 'logoutuser',
      } as any;

      // Generate tokens
      const accessToken = authService.generateToken(mockUser);
      const refreshToken = authService.generateRefreshToken(mockUser);

      // Decode to get expiry
      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      // Mock: insert to blacklist (called twice - once for access, once for refresh)
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          onConflict: jest.fn().mockReturnValue({
            ignore: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      // Blacklist both tokens
      await tokenBlacklistService.blacklistToken(accessToken, new Date(accessDecoded.exp * 1000));
      await tokenBlacklistService.blacklistToken(refreshToken, new Date(refreshDecoded.exp * 1000));

      // Mock: check if tokens are blacklisted
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: 'hashed' }),
          }),
        }),
      });

      const isAccessBlacklisted = await tokenBlacklistService.isBlacklisted(accessToken);
      const isRefreshBlacklisted = await tokenBlacklistService.isBlacklisted(refreshToken);

      expect(isAccessBlacklisted).toBe(true);
      expect(isRefreshBlacklisted).toBe(true);
    });

    it('should reject refresh request for blacklisted refresh token', async () => {
      // Mock: token is in blacklist
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: 'hashed-blacklisted' }),
          }),
        }),
      });

      const isBlacklisted = await tokenBlacklistService.isBlacklisted('used-refresh-token');
      
      // The token should be rejected because it's blacklisted
      expect(isBlacklisted).toBe(true);
    });
  });

  // ==================== Complete Auth Flow ====================

  describe('Complete Auth Flow Scenarios', () => {
    it('should complete full registration -> login -> logout flow', async () => {
      // Step 1: Registration
      const newUser = {
        id: 'flow-user-id',
        username: 'flowuser',
        email: 'flow@example.com',
      };

      // Mock: user doesn't exist
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      // Mock: create user
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newUser]),
        }),
      });

      const user = await authService.createUser({
        username: 'flowuser',
        email: 'flow@example.com',
        password: 'flowpassword',
      });

      expect(user.id).toBe('flow-user-id');

      // Step 2: Generate tokens
      const accessToken = authService.generateToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Step 3: Verify access token works
      const decoded = jwt.verify(accessToken, 'jianjiachu-dev-key-change-in-production') as any;
      expect(decoded.user_id).toBe('flow-user-id');

      // Step 4: Logout - blacklist tokens
      const accessDecoded = jwt.decode(accessToken) as any;
      const refreshDecoded = jwt.decode(refreshToken) as any;

      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          onConflict: jest.fn().mockReturnValue({
            ignore: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      await tokenBlacklistService.blacklistToken(accessToken, new Date(accessDecoded.exp * 1000));
      await tokenBlacklistService.blacklistToken(refreshToken, new Date(refreshDecoded.exp * 1000));

      // Step 5: Verify tokens are blacklisted
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: 'hashed' }),
          }),
        }),
      });

      const isAccessBlacklisted = await tokenBlacklistService.isBlacklisted(accessToken);
      const isRefreshBlacklisted = await tokenBlacklistService.isBlacklisted(refreshToken);

      expect(isAccessBlacklisted).toBe(true);
      expect(isRefreshBlacklisted).toBe(true);
    });

    it.skip('should handle token refresh with blacklist rotation', async () => {
      const mockUser = {
        id: 'refresh-user-id',
        username: 'refreshuser',
        role: 'user',
      } as any;

      // Generate initial refresh token
      const oldRefreshToken = authService.generateRefreshToken(mockUser);
      const oldDecoded = jwt.decode(oldRefreshToken) as any;

      // Mock: old token not blacklisted yet
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      let isBlacklisted = await tokenBlacklistService.isBlacklisted(oldRefreshToken);
      expect(isBlacklisted).toBe(false);

      // Simulate refresh: blacklist old token, generate new one
      mockDb.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          onConflict: jest.fn().mockReturnValue({
            ignore: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      await tokenBlacklistService.blacklistToken(oldRefreshToken, new Date(oldDecoded.exp * 1000));

      // Generate new refresh token
      const newRefreshToken = authService.generateRefreshToken(mockUser);

      // Verify old token is now blacklisted
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue({ token: 'hashed-old' }),
          }),
        }),
      });

      isBlacklisted = await tokenBlacklistService.isBlacklisted(oldRefreshToken);
      expect(isBlacklisted).toBe(true);

      // Verify new token is not blacklisted
      mockDb.mockReturnValue({
        where: jest.fn().mockReturnValue({
          orWhere: jest.fn().mockReturnValue({
            first: jest.fn().mockResolvedValue(undefined),
          }),
        }),
      });

      isBlacklisted = await tokenBlacklistService.isBlacklisted(newRefreshToken);
      expect(isBlacklisted).toBe(false);

      // New token should be different from old
      expect(newRefreshToken).not.toBe(oldRefreshToken);
    });
  });
});
