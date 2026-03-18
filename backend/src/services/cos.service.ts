import COS from 'cos-nodejs-sdk-v5';
import path from 'path';
import crypto from 'crypto';
import { createError } from '../middleware/errorHandler';

const ALLOWED_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

interface UploadBufferOptions {
  userId: string;
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}

interface UploadBufferResult {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

interface CosObjectLocation {
  key: string;
  url: string;
}

export class CosService {
  private client?: COS;

  private getConfig() {
    const secretId = process.env.COS_SECRET_ID;
    const secretKey = process.env.COS_SECRET_KEY;
    const bucket = process.env.COS_BUCKET;
    const region = process.env.COS_REGION;
    const publicBaseUrl = process.env.COS_PUBLIC_BASE_URL;

    if (!secretId || !secretKey || !bucket || !region || !publicBaseUrl) {
      throw createError('COS 配置缺失', 500);
    }

    return {
      secretId,
      secretKey,
      bucket,
      region,
      publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
    };
  }

  private getClient() {
    if (!this.client) {
      const { secretId, secretKey } = this.getConfig();
      this.client = new COS({
        SecretId: secretId,
        SecretKey: secretKey,
      });
    }

    return this.client;
  }

  private sanitizeUserId(userId: string) {
    return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private resolveExtension(mimeType: string, originalName?: string) {
    const allowedExt = ALLOWED_MIME_TO_EXTENSION[mimeType];
    if (!allowedExt) {
      throw createError('不支持的图片类型', 415);
    }

    const originalExt = originalName ? path.extname(originalName).toLowerCase() : '';
    return originalExt && originalExt === allowedExt ? originalExt : allowedExt;
  }

  private generateObjectKey(userId: string, mimeType: string, originalName?: string) {
    const extension = this.resolveExtension(mimeType, originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `uploads/images/${this.sanitizeUserId(userId)}/${timestamp}-${random}${extension}`;
  }

  private isManagedCosUrl(value?: string | null) {
    return Boolean(this.resolveKeyFromUrl(value));
  }

  private resolveKeyFromUrl(value?: string | null) {
    if (!value) return null;

    const { publicBaseUrl } = this.getConfig();
    const raw = String(value).trim();
    if (!raw) return null;

    try {
      const targetUrl = new URL(raw);
      const baseUrl = new URL(publicBaseUrl);
      if (targetUrl.host !== baseUrl.host) {
        return null;
      }
      return targetUrl.pathname.replace(/^\/+/, '') || null;
    } catch {
      const normalizedBase = publicBaseUrl.replace(/\/+$/, '');
      if (raw.startsWith(normalizedBase + '/')) {
        return raw.slice((normalizedBase + '/').length);
      }
      if (raw.startsWith('/')) {
        return raw.replace(/^\/+/, '');
      }
      return raw;
    }
  }

  private normalizeStoredUrl(value?: string | null) {
    const key = this.resolveKeyFromUrl(value);
    if (!key) {
      return value || null;
    }

    const { publicBaseUrl } = this.getConfig();
    return `${publicBaseUrl}/${key}`;
  }

  getSignedObjectUrl(key: string, expires = SIGNED_URL_EXPIRES_SECONDS) {
    const config = this.getConfig();
    const client = this.getClient();
    const result = client.getObjectUrl({
      Bucket: config.bucket,
      Region: config.region,
      Key: key,
      Sign: true,
      Expires: expires,
      Protocol: 'https:',
    }) as any;

    if (typeof result === 'string') {
      return result;
    }

    return result?.Url || `${config.publicBaseUrl}/${key}`;
  }

  resolveStoredUrl(value?: string | null, expires = SIGNED_URL_EXPIRES_SECONDS) {
    const key = this.resolveKeyFromUrl(value);
    if (!key) {
      return value || null;
    }

    return this.getSignedObjectUrl(key, expires);
  }

  toStoredUrl(value?: string | null) {
    return this.normalizeStoredUrl(value);
  }

  getManagedObjectKey(value?: string | null) {
    return this.resolveKeyFromUrl(value);
  }

  async uploadBuffer(options: UploadBufferOptions): Promise<UploadBufferResult> {
    const config = this.getConfig();
    const client = this.getClient();
    const key = this.generateObjectKey(options.userId, options.mimeType, options.originalName);

    await client.putObject({
      Bucket: config.bucket,
      Region: config.region,
      Key: key,
      Body: options.buffer,
      ContentType: options.mimeType,
      ContentLength: options.buffer.length,
    });

    const storedUrl = `${config.publicBaseUrl}/${key}`;

    return {
      key,
      url: storedUrl,
      mimeType: options.mimeType,
      size: options.buffer.length,
    };
  }
}

export const cosService = new CosService();
