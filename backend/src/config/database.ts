import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';

const isDevelopment = process.env.NODE_ENV !== 'production';

const config: Knex.Config = isDevelopment
  ? // SQLite for development
    {
      client: 'sqlite3',
      connection: {
        filename: './dev.sqlite3',
      },
      migrations: {
        directory: './src/database/migrations',
        tableName: 'knex_migrations',
      },
      seeds: {
        directory: './src/database/seeds',
      },
      useNullAsDefault: true,
    }
  : // PostgreSQL for production
    {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'jianjiachu',
      },
      pool: {
        min: 2,
        max: 10,
      },
      migrations: {
        directory: './src/database/migrations',
        tableName: 'knex_migrations',
      },
      seeds: {
        directory: './src/database/seeds',
      },
    };

export const db = knex(config);

// 测试数据库连接
export async function testConnection() {
  try {
    await db.raw('SELECT 1');
    logger.info(`Database connection established (${isDevelopment ? 'SQLite' : 'PostgreSQL'})`);
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
}

// 优雅关闭
export async function closeConnection() {
  await db.destroy();
  logger.info('Database connection closed');
}

// UUID 生成函数 (SQLite兼容)
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
