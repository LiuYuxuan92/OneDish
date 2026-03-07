import crypto from 'crypto';
import { logger } from '../utils/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * 获取加密密钥
 * 使用 PBKDF2 从环境变量密钥派生
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.AI_CONFIG_ENCRYPTION_KEY;
  
  if (!envKey) {
    logger.warn('AI_CONFIG_ENCRYPTION_KEY not set, using default dev key (DO NOT USE IN PRODUCTION)');
    // 开发环境使用默认密钥，生产必须配置
    return crypto.scryptSync('onedish-dev-encryption-key-default', 'salt', KEY_LENGTH);
  }
  
  if (envKey.length < 32) {
    throw new Error('AI_CONFIG_ENCRYPTION_KEY must be at least 32 characters');
  }
  
  return crypto.scryptSync(envKey, 'ai-config-salt', KEY_LENGTH);
}

/**
 * 加密文本 (AES-256-GCM)
 * 返回格式: base64(iv + authTag + encryptedData)
 */
export function encrypt(plainText: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // 组合: iv + authTag + encryptedData
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64'),
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    logger.error('Encryption failed', { error });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 解密文本 (AES-256-GCM)
 * 输入格式: base64(iv + authTag + encryptedData)
 */
export function decrypt(cipherText: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(cipherText, 'base64');
    
    // 分离: iv, authTag, encryptedData
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', { error });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 生成 API Key 预览 (用于显示)
 * 例如: sk-abc...xyz
 */
export function getKeyPreview(encryptedKey: string): string {
  try {
    const decrypted = decrypt(encryptedKey);
    if (decrypted.length <= 8) {
      return decrypted.substring(0, 4) + '...';
    }
    return decrypted.substring(0, 6) + '...' + decrypted.substring(decrypted.length - 4);
  } catch {
    return '***';
  }
}

/**
 * 在日志中脱敏 API Key
 */
export function sanitizeKeyForLog(key: string): string {
  if (key.length <= 8) {
    return '***';
  }
  return key.substring(0, 6) + '***' + key.substring(key.length - 4);
}
