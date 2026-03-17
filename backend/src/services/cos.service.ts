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

    return {
      key,
      url: `${config.publicBaseUrl}/${key}`,
      mimeType: options.mimeType,
      size: options.buffer.length,
    };
  }
}

export const cosService = new CosService();
