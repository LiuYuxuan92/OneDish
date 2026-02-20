import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// 加载环境变量 - 必须在其他import之前
dotenv.config({ path: __dirname + '/../.env' });

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// 路由导入
import authRoutes from './routes/auth.routes';
import recipeRoutes from './routes/recipe.routes';
import favoriteRoutes from './routes/favorite.routes';
import mealPlanRoutes from './routes/mealPlan.routes';
import shoppingListRoutes from './routes/shoppingList.routes';
import userRoutes from './routes/user.routes';
import ingredientRoutes from './routes/ingredient.routes';
import systemRoutes from './routes/system.routes';
import pairingRoutes from './routes/pairing.routes';
import ingredientInventoryRoutes from './routes/ingredientInventory.routes';
import searchRoutes from './routes/search.routes';
import userRecipeRoutes from './routes/userRecipe.routes';
import { RecipeTransformService } from './services/recipe-transform.service';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 限流
app.use(rateLimiter);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/recipes', recipeRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/meal-plans', mealPlanRoutes);
app.use('/api/v1/shopping-lists', shoppingListRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/ingredients', ingredientRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/pairing', pairingRoutes);
app.use('/api/v1/ingredient-inventory', ingredientInventoryRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/user-recipes', userRecipeRoutes);

// 404 处理
app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // 定时清理过期转换缓存（每24小时）
  setInterval(() => {
    RecipeTransformService.cleanExpiredCache();
  }, 24 * 60 * 60 * 1000);
});

export default app;
